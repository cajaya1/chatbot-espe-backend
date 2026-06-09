from __future__ import annotations

from datetime import datetime
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
from app.models.calendario_academico import PeriodoAcademico
from app.services.chroma_service import buscar_contexto_calendario, buscar_contexto_proceso

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


def _build_system_prompt(calendario_texto: str = "") -> str:
    fecha_actual = datetime.now().strftime("%d de %B de %Y")
    fecha_iso = datetime.now().strftime("%Y-%m-%d")

    seccion_calendario = ""
    if calendario_texto:
        seccion_calendario = (
            f"\nCALENDARIO ACADÉMICO VIGENTE (periodo actual):\n"
            f"{calendario_texto}\n"
        )

    return (
        f"Eres el Asistente Académico Inteligente oficial de la carrera de Tecnologías de la Información en Línea (ITIV) de la ESPE.\n"
        f"Tu tarea es responder con empatía, claridad y precisión basándote EXCLUSIVAMENTE en el contexto institucional provisto.\n\n"
        f"Hoy es {fecha_actual} (fecha ISO: {fecha_iso}).{seccion_calendario}\n"
        f"INSTRUCCIONES ESTRICTAS DE FORMATO Y ESTILO:\n"
        f"- BAJO NINGUNA CIRCUNSTANCIA utilices emojis en tus respuestas.\n"
        f"- NO utilices sintaxis Markdown como asteriscos (**) para negritas ni hashtags (#). Escribe en texto plano tradicional.\n\n"
        f"INSTRUCCIONES DE OPERACIÓN:\n"
        f"1. EVALUACION TEMPORAL: Si el usuario pregunta por fechas, plazos o si puede realizar un trámite, DEBES comparar la fecha de hoy ({fecha_iso}) con las fechas del calendario académico provisto. Indica en lenguaje natural si el estudiante está a tiempo, cuántos días le quedan, o si el plazo ya venció. Si el plazo venció, explica qué opciones le quedan según el reglamento.\n"
        f"2. CITA DEL REGLAMENTO: Para respaldar cada paso o condición, DEBES citar textualmente el artículo del Reglamento Interno de Régimen Académico y de Estudiantes que aplica. Usa el formato: 'Según el Artículo [número] del Reglamento Interno...' seguido de la cita textual pertinente.\n"
        f"3. BASADO EN EVIDENCIA: Para preguntas sobre trámites, responde usando ÚNICAMENTE la información contenida dentro de las reglas recuperadas y el calendario provisto.\n"
        f"4. CITA JURÍDICA PURA: Está ESTRICTAMENTE PROHIBIDO mencionar nombres de archivos, extensiones '.txt' o etiquetas de formato. Cita ÚNICAMENTE el artículo del reglamento.\n"
        f"5. ANEXOS: Si te preguntan por formatos o anexos, limítate a decir amablemente que el link de descarga se encuentra adjunto al final del mensaje en la sección de fuentes.\n"
        f"6. PRECISIÓN DE PLAZOS: Si un documento menciona 'dentro de los plazos establecidos' pero no especifica los días, indica que debe confirmar el plazo exacto directamente con el Director de Carrera.\n"
        f"7. CERO CONSEJOS EXTERNOS: No recomiendes hablar con otras autoridades para buscar 'soluciones amigables'. Toda derivación o consulta que no esté en el reglamento debe ser dirigida EXCLUSIVAMENTE al Director de Carrera al correo: {DIRECTOR_CORREO}."
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

    # --- INTERCEPTOR DE SALUDOS Y CORTESÍA ---
    pregunta_limpia = re.sub(r'[^\w\s]', '', pregunta.lower()).strip()
    saludos = {"hola", "buenas", "saludos", "buenos dias", "buenas tardes", "buenas noches", "holaa", "hey"}
    despedidas = {"gracias", "muchas gracias", "te agradezco", "ok", "entendido", "vale", "perfecto", "listo"}
    
    if pregunta_limpia in saludos:
        # Consultamos a la BD los procesos reales disponibles
        procesos_bd = db.query(ProcesoAcademico).filter(ProcesoAcademico.es_actual.is_(True)).all()
        lista_procesos = "\n".join([f"- {p.titulo}" for p in procesos_bd])
        
        respuesta_saludo = (
            "Hola, soy tu Asistente Académico Inteligente de la carrera ITIV de la ESPE. "
            "Actualmente puedo ayudarte con información detallada sobre los siguientes procesos:\n\n"
            f"{lista_procesos}\n\n"
            "¿En cuál de ellos necesitas ayuda?"
        )
        
        return ChatResponse(
            respuesta=respuesta_saludo,
            fuentes=[],
            fragmentos_debug=[],
            sugerir_procesos=False # No enviamos sugerencias web para no duplicar el texto
        )
        
    if pregunta_limpia in despedidas:
        return ChatResponse(
            respuesta="De nada. Ha sido un placer ayudarte. Si tienes alguna otra duda con tus trámites, estaré aquí para asistirte.",
            fuentes=[],
            fragmentos_debug=[]
        )

    # --- PASO 1: DETERMINAR EL PROCESO ---
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
    
    if not proceso:
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
        
        if metadatas and distances[0] < 0.75: 
            codigo_descubierto = metadatas[0].get("fuente")
            proceso = (
                db.query(ProcesoAcademico)
                .filter(
                    ProcesoAcademico.codigo_proceso == codigo_descubierto,
                    ProcesoAcademico.es_actual.is_(True),
                )
                .first()
            )

    # --- CONTROL ESTRICTO: PROCESOS DESCONOCIDOS ---
    if not proceso:
        return ChatResponse(
            respuesta=f"No tengo información sobre ese proceso o consulta en mi base de datos, por lo que no puedo ayudarte con ello. Por favor, comunícate directamente con el Director de Carrera al correo: {DIRECTOR_CORREO}",
            fuentes=[], # Sin fuentes ni formatos
            fragmentos_debug=[],
            sugerir_procesos=False
        )

    # --- PASO 2: BUSQUEDA DE CONTEXTO ESPECIFICO ---
    results = buscar_contexto_proceso(pregunta, proceso.codigo_proceso, n_results=3)
    fragmentos, fuentes, mejor_distancia = _extract_results(results)
    resultados_calendario = buscar_contexto_calendario(pregunta, n_results=3)
    fragmentos_calendario = [
        str(fragmento).strip()
        for fragmento in (resultados_calendario.get("documents") or [[]])[0]
        if str(fragmento).strip()
    ]

    # Si se conoce el proceso pero no se encuentra la respuesta específica a la pregunta
    if not fragmentos and not fragmentos_calendario:
        return ChatResponse(
            respuesta=f"Entiendo que preguntas sobre {proceso.titulo}, pero no encuentro ese detalle específico en mis registros normativos. Por favor, comunícate con el Director de Carrera al correo {DIRECTOR_CORREO} para asistirte mejor.",
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

    if fragmentos_calendario:
        contexto_calendario = "\n\n".join([
            f"--- CALENDARIO ACADÉMICO ---\n{frag}\n----------------------------------"
            for frag in fragmentos_calendario
        ])
        contexto_plano = f"{contexto_plano}\n\n{contexto_calendario}" if contexto_plano else contexto_calendario
    
    intro_descubrimiento = f"(El usuario está preguntando sobre el proceso: {proceso.titulo}. Responde asumiendo este contexto)."
    user_content = f"{intro_descubrimiento}\n\nCONTEXTO INSTITUCIONAL:\n{contexto_plano}\n\nPREGUNTA DEL ESTUDIANTE:\n{pregunta}"

    # --- PASO 3.5: OBTENER CALENDARIO ACTIVO ---
    calendario_texto = ""
    periodo_actual = db.query(PeriodoAcademico).filter(PeriodoAcademico.es_actual.is_(True)).first()
    if periodo_actual and periodo_actual.actividades:
        lineas = [f"Periodo: {periodo_actual.nombre}"]
        for act in periodo_actual.actividades:
            lineas.append(f"- {act.actividad}: {act.fecha_texto}")
        calendario_texto = "\n".join(lineas)

    # --- PASO 4: GENERACIÓN CON MISTRAL ---
    try:
        contenido = await anyio.to_thread.run_sync(
            _invocar_llm,
            _build_system_prompt(calendario_texto),
            user_content
        )
    except Exception as exc:
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
            link_anexo = f"[Descargar Formato Oficial (Word)]({ruta_anexo})"
            fuentes_finales.append(link_anexo)

    return ChatResponse(
        respuesta=contenido, 
        fuentes=fuentes_finales, 
        fragmentos_debug=fragmentos,
        codigo_proceso=proceso.codigo_proceso,
        titulo_proceso=proceso.titulo
    )