from __future__ import annotations

import os
import re
from typing import List, Tuple

import anyio
import ollama
from mistralai.client import Mistral
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.config import DIRECTOR_CORREO
from app.core.database import get_db
from app.models.proceso_academico import ProcesoAcademico
from app.services.chroma_service import buscar_contexto_proceso

router = APIRouter(tags=["chat"])

# Constantes para la citación formal
_REGLAMENTO_NOMBRE = "Reglamento Interno de Régimen Académico y de Estudiantes de la Universidad de las Fuerzas Armadas"
_REGLAMENTO_URL = "https://usgn.espe.edu.ec/wp-content/uploads/2024/07/OR-2024-059-RRA-CODIFICADO.pdf"


class ChatRequest(BaseModel):
    pregunta: str
    codigo_proceso: str | None = None


class ChatResponse(BaseModel):
    respuesta: str
    fuentes: List[str]
    fragmentos_debug: List[str]
    codigo_proceso: str | None = None
    titulo_proceso: str | None = None
    sugerir_procesos: bool = False


def _construir_fuente_formateada(fragmentos: List[str]) -> str:
    articulos_encontrados = set()
    for frag in fragmentos:
        coincidencias = re.findall(r"Art[íi]culo\s+(\d+)", frag, re.IGNORECASE)
        articulos_encontrados.update(coincidencias)
        
    sufijo_articulos = ""
    if articulos_encontrados:
        arts_ordenados = sorted(list(articulos_encontrados), key=int)
        arts_str = ", ".join(arts_ordenados)
        sufijo_articulos = f" (Art. {arts_str})"
        
    return f"[{_REGLAMENTO_NOMBRE}{sufijo_articulos}]({_REGLAMENTO_URL})"


def _build_system_prompt() -> str:
    return (
        f"Eres el Asistente Académico Inteligente oficial de la carrera de Tecnologías de la Información en Linea (ITIV) de la ESPE.\n"
        f"Tu tarea es responder con empatía, claridad y precisión basándote EXCLUSIVAMENTE en el contexto institucional provisto.\n\n"
        f"INSTRUCCIONES ESTRICTAS:\n"
        f"1. BASADO EN EVIDENCIA: Responde usando ÚNICAMENTE la información contenida dentro de las reglas recuperadas.\n"
        f"2. CITA JURÍDICA PURA: Está ESTRICTAMENTE PROHIBIDO mencionar nombres de archivos, extensiones '.txt' o etiquetas de formato. Si debes citar la fuente, menciona ÚNICAMENTE el artículo (por ejemplo: 'Según el Artículo 195 del Reglamento Interno...').\n"
        f"3. ANEXOS: Si te preguntan por formatos o anexos, limítate a decir amablemente que el link de descarga se encuentra adjunto al final del mensaje en la sección de fuentes.\n"
        f"4. PRECISIÓN DE PLAZOS: Si un documento menciona 'dentro de los plazos establecidos' pero no especifica los días, indica que debe confirmar el plazo exacto directamente con el Director de Carrera.\n"
        f"5. CERO CONSEJOS EXTERNOS: No recomiendes hablar con otras autoridades para buscar 'soluciones amigables'. Toda derivación o consulta que no esté en el reglamento debe ser dirigida EXCLUSIVAMENTE al Director de Carrera al correo: {DIRECTOR_CORREO}."
    )


def _extract_results(results: dict) -> Tuple[List[str], List[str], float]:
    documents = (results.get("documents") or [[]])[0]
    metadatas = (results.get("metadatas") or [[]])[0]
    distances = (results.get("distances") or [[]])[0]

    fragmentos = [str(doc).strip() for doc in documents if str(doc).strip()]

    fuentes: List[str] = []
    for meta in metadatas:
        if isinstance(meta, dict) and meta.get("fuente"):
            fuente = str(meta.get("fuente")).strip()
            if fuente and fuente not in fuentes:
                fuentes.append(fuente)

    try:
        mejor_distancia = float(distances[0]) if distances else 0.0
    except (TypeError, ValueError):
        mejor_distancia = 0.0

    return fragmentos, fuentes, mejor_distancia


def _invocar_llm(system_prompt: str, user_content: str) -> str:
    """
    Patrón Híbrido: Si existe MISTRAL_API_KEY usa la nube, caso contrario usa Ollama local.
    """
    api_key = os.getenv("MISTRAL_API_KEY", "").strip()
    
    if api_key:
        # --- MODO NUBE (PRODUCCIÓN) ---
        print("☁️ Usando Mistral API (Cloud)")
        client = Mistral(api_key=api_key)
        response = client.chat.complete(
            model="mistral-small-latest",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_content}
            ],
            temperature=0.0
        )
        return response.choices[0].message.content.strip()
    else:
        # --- MODO LOCAL (DESARROLLO) ---
        print("💻 Usando Ollama (Local)")
        response = ollama.chat(
            model="mistral",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_content}
            ],
            options={"temperature": 0.0},
        )
        return response.get("message", {}).get("content", "").strip()


@router.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest, db: Session = Depends(get_db)) -> ChatResponse:
    pregunta = (request.pregunta or "").strip()
    codigo_seleccionado = (request.codigo_proceso or "").strip()
    
    if not pregunta:
        raise HTTPException(status_code=400, detail="La pregunta no puede estar vacía")

    # --- PASO 1: DETERMINAR EL PROCESO (Seleccionado o Descubrimiento) ---
    proceso = None
    if codigo_seleccionado:
        proceso = (
            db.query(ProcesoAcademico)
            .filter(
                ProcesoAcademico.codigo_proceso == codigo_seleccionado,
                ProcesoAcademico.es_actual.is_(True),
            )
            .first()
        )
    
    # Si no hay código o no se encontró el seleccionado, buscamos en TODO el vector store
    if not proceso:
        # Buscamos sin filtro de fuente para descubrir a qué trámite se refiere
        from app.services.chroma_service import _get_collection, _embed_texts
        collection = _get_collection("procesos_academicos")
        q_emb = _embed_texts([pregunta])[0]
        
        discovery_results = collection.query(
            query_embeddings=[q_emb],
            n_results=1,
            include=["metadatas", "distances"]
        )
        
        metadatas = (discovery_results.get("metadatas") or [[]])[0]
        distances = (discovery_results.get("distances") or [[]])[0]
        
        if metadatas and distances[0] < 0.85: # Umbral de confianza
            codigo_descubierto = metadatas[0].get("fuente")
            proceso = (
                db.query(ProcesoAcademico)
                .filter(
                    ProcesoAcademico.codigo_proceso == codigo_descubierto,
                    ProcesoAcademico.es_actual.is_(True),
                )
                .first()
            )

    # Si después de todo no tenemos un proceso claro
    if not proceso:
        return ChatResponse(
            respuesta=f"No estoy seguro de a qué trámite te refieres. ¿Podrías ser más específico o seleccionar uno de la lista? Para consultas directas, comunícate con el Director de Carrera: {DIRECTOR_CORREO}",
            fuentes=[],
            fragmentos_debug=[],
            sugerir_procesos=True
        )

    # --- PASO 2: BUSQUEDA DE CONTEXTO ESPECIFICO ---
    results = buscar_contexto_proceso(pregunta, proceso.codigo_proceso, n_results=3)
    fragmentos, fuentes, mejor_distancia = _extract_results(results)

    if not fragmentos or mejor_distancia > 0.88:
        return ChatResponse(
            respuesta=f"Entiendo que preguntas sobre *{proceso.titulo}*, pero no encuentro ese detalle específico en mis registros. Comunícate con el Director de Carrera al correo {DIRECTOR_CORREO} para asistirte mejor.",
            fuentes=[],
            fragmentos_debug=fragmentos,
            codigo_proceso=proceso.codigo_proceso,
            titulo_proceso=proceso.titulo
        )

    # --- PASO 3: EMPAQUETADO PARA EL LLM ---
    contexto_plano = "\n\n".join([
        f"--- REGLA DE LA UNIVERSIDAD ---\n{frag}\n----------------------------------"
        for frag in fragmentos
    ])
    
    # Si el proceso fue descubierto automáticamente, le damos una pista al LLM para que sea amable
    intro_descubrimiento = f"(El usuario está preguntando sobre el proceso: {proceso.titulo}. Responde asumiendo este contexto)."
    user_content = f"{intro_descubrimiento}\n\nCONTEXTO INSTITUCIONAL:\n{contexto_plano}\n\nPREGUNTA DEL ESTUDIANTE:\n{pregunta}"

    # --- PASO 4: GENERACIÓN CON MISTRAL (HÍBRIDO Y PROTEGIDO) ---
    try:
        contenido = await anyio.to_thread.run_sync(
            _invocar_llm, 
            _build_system_prompt(), 
            user_content
        )
    except Exception as exc:
        print(f"❌ Error crítico en el motor LLM: {exc}")
        raise HTTPException(status_code=503, detail="El servicio no está disponible en este momento.") from exc
    
    # --- PASO 5: CONSTRUCCIÓN DE FUENTES Y ANEXOS ---
    fuentes_finales = []
    fuente_reglamento = _construir_fuente_formateada(fragmentos)
    if fuente_reglamento:
        fuentes_finales.append(fuente_reglamento)

    if proceso.ruta_anexo:
        ruta_anexo = proceso.ruta_anexo.strip()
        if ruta_anexo:
            if not ruta_anexo.startswith("http") and not ruta_anexo.startswith("/"):
                ruta_anexo = f"/{ruta_anexo}"
            link_anexo = f"[📄 Descargar Formato Oficial (Word)]({ruta_anexo})"
            fuentes_finales.append(link_anexo)

    return ChatResponse(
        respuesta=contenido, 
        fuentes=fuentes_finales, 
        fragmentos_debug=fragmentos,
        codigo_proceso=proceso.codigo_proceso,
        titulo_proceso=proceso.titulo
    )