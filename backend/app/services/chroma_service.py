import os

# Parche estricto para forzar a Hugging Face a trabajar offline y quitar Warnings
os.environ["HF_HUB_DISABLE_SYMLINKS_WARNING"] = "1"
os.environ["TRANSFORMERS_OFFLINE"] = "1"
os.environ["HF_HUB_OFFLINE"] = "1"

import re
import uuid
from pathlib import Path
from typing import List, Optional
from functools import lru_cache

from mistralai.client import Mistral
import chromadb
from chromadb.utils import embedding_functions
from sqlalchemy.orm import Session

from app.models.calendario_academico import PeriodoAcademico

_DB_PATH = Path(__file__).resolve().parents[2] / "institucional_vector_db"
_DB_PATH.mkdir(parents=True, exist_ok=True)
CLIENT = chromadb.PersistentClient(path=str(_DB_PATH))

def _get_collection(name: str = "documentos"):
    try:
        return CLIENT.get_collection(name)
    except Exception:
        return CLIENT.create_collection(name)


def ensure_collection(name: str = "documentos") -> None:
    _get_collection(name)


@lru_cache(maxsize=1)
def _get_embedder():
    """Intenta cargar un modelo semántico y retorna None si no está disponible."""
    try:
        from sentence_transformers import SentenceTransformer

        return SentenceTransformer("all-MiniLM-L6-v2")
    except Exception:
        return None


def _embed_texts(texts: List[str]) -> List[List[float]]:
    """Genera embeddings usando la API oficial de Mistral (Ligero y potente para la nube)."""
    api_key = os.getenv("MISTRAL_API_KEY", "").strip()
    
    if api_key:
        client = Mistral(api_key=api_key)
        # Mistral requiere que los textos no estén vacíos
        textos_seguros = [t if t.strip() else "vacío" for t in texts]
        
        response = client.embeddings.create(
            model="mistral-embed",
            inputs=textos_seguros
        )
        return [obj.embedding for obj in response.data]
    else:
        # Fallback local (Solo se ejecutará en tu PC si quitas la variable de entorno)
        try:
            from sentence_transformers import SentenceTransformer
            model = SentenceTransformer("all-MiniLM-L6-v2")
            return [v.tolist() for v in model.encode(texts)]
        except Exception:
            raise RuntimeError("Falta la API de Mistral o la librería local para generar embeddings.")


def _chunk_text(text: str, max_chars: int = 800) -> List[str]:
    # dividir por párrafos (dos saltos de línea) y luego por longitud
    parts = [p.strip() for p in re.split(r"\n\s*\n", text) if p.strip()]
    chunks: List[str] = []
    for p in parts:
        if len(p) <= max_chars:
            chunks.append(p)
        else:
            # dividir sin cortar palabras
            words = p.split()
            cur = []
            cur_len = 0
            for w in words:
                if cur_len + len(w) + 1 > max_chars and cur:
                    chunks.append(" ".join(cur))
                    cur = [w]
                    cur_len = len(w)
                else:
                    cur.append(w)
                    cur_len += len(w) + 1
            if cur:
                chunks.append(" ".join(cur))
    return chunks


def guardar_texto(texto: str, id_doc: str) -> List[str]:
    if not texto or not texto.strip():
        raise ValueError("Texto vacío")

    collection = _get_collection("documentos")

    chunks = _chunk_text(texto)
    if not chunks:
        raise ValueError("No se generaron fragmentos del texto")

    ids = []
    docs = []
    metadatas = []
    for i, chunk in enumerate(chunks):
        chunk_id = f"{id_doc}-{i}-{uuid.uuid4().hex[:8]}"
        ids.append(chunk_id)
        docs.append(chunk)
        metadatas.append({"id_doc": id_doc, "chunk_index": i})

    embeddings = _embed_texts(docs)
    collection.add(ids=ids, documents=docs, metadatas=metadatas, embeddings=embeddings)

    return ids


def eliminar_contexto_proceso(
    codigo_proceso: str,
    collection_name: str = "procesos_academicos",
) -> None:
    """Elimina todos los fragmentos asociados a un codigo de proceso."""
    if not codigo_proceso or not codigo_proceso.strip():
        return
    collection = _get_collection(collection_name)
    try:
        collection.delete(where={"fuente": codigo_proceso})
    except Exception:
        pass


def eliminar_contexto_calendario(periodo_id: str, collection_name: str = "calendario_academico") -> None:
    if not periodo_id or not str(periodo_id).strip():
        return

    collection = _get_collection(collection_name)
    try:
        collection.delete(where={"periodo_id": str(periodo_id)})
    except Exception:
        pass


def buscar_contexto(pregunta: str, n_results: int = 3) -> List[str]:
    if not pregunta or not pregunta.strip():
        return []

    collection = _get_collection("documentos")
    q_emb = _embed_texts([pregunta])[0]

    res = collection.query(query_embeddings=[q_emb], n_results=n_results, include=["documents", "metadatas"])
    documents = res.get("documents", [[]])[0]

    return documents


def buscar_contexto_proceso(
    pregunta: str,
    codigo_proceso: str,
    n_results: int = 3,
    collection_name: str = "procesos_academicos",
) -> dict:
    """Consulta la colección de procesos con filtro estricto por codigo_proceso."""
    if not pregunta or not pregunta.strip():
        return {}
    if not codigo_proceso or not codigo_proceso.strip():
        return {}

    collection = _get_collection(collection_name)
    q_emb = _embed_texts([pregunta])[0]

    return collection.query(
        query_embeddings=[q_emb],
        n_results=n_results,
        include=["documents", "metadatas", "distances"],
        where={"fuente": codigo_proceso},
    )


def buscar_contexto_calendario(
    pregunta: str,
    n_results: int = 3,
    collection_name: str = "calendario_academico",
) -> dict:
    if not pregunta or not pregunta.strip():
        return {}

    collection = _get_collection(collection_name)
    q_emb = _embed_texts([pregunta])[0]

    return collection.query(
        query_embeddings=[q_emb],
        n_results=n_results,
        include=["documents", "metadatas", "distances"],
    )


def _build_texto_proceso(titulo: str, flujo_pasos: List[str], contexto_legal: str) -> str:
    partes = []
    if titulo:
        partes.append(f"PROCESO INSTITUCIONAL: {titulo}")
    if flujo_pasos:
        pasos_str = "\n".join([p for p in flujo_pasos if str(p).strip()])
        if pasos_str:
            partes.append(f"PASOS OFICIALES DEL TRAMITE:\n{pasos_str}")
    if contexto_legal:
        partes.append(f"REGLAMENTO APLICABLE:\n{contexto_legal}")

    return "\n\n".join(partes).strip()


def upsert_contexto_proceso(
    contexto_legal: str,
    codigo_proceso: str,
    titulo: Optional[str] = None,
    flujo_pasos: Optional[List[str]] = None,
    collection_name: str = "procesos_academicos",
) -> List[str]:
    if not contexto_legal or not contexto_legal.strip():
        raise ValueError("Texto vacío")
    if not codigo_proceso or not codigo_proceso.strip():
        raise ValueError("Código de proceso vacío")

    texto = _build_texto_proceso(titulo or "", flujo_pasos or [], contexto_legal)
    if not texto:
        raise ValueError("Texto vacío")

    collection = _get_collection(collection_name)

    try:
        collection.delete(where={"fuente": codigo_proceso})
    except Exception:
        pass

    chunks = _chunk_text(texto)
    if not chunks:
        raise ValueError("No se generaron fragmentos del texto")

    ids = []
    docs = []
    metadatas = []
    for i, chunk in enumerate(chunks):
        chunk_id = f"{codigo_proceso}-{i}-{uuid.uuid4().hex[:8]}"
        ids.append(chunk_id)
        docs.append(chunk)
        metadatas.append(
            {
                "fuente": codigo_proceso,
                "codigo_proceso": codigo_proceso,
                "titulo": titulo or "",
                "chunk_index": i,
            }
        )

    embeddings = _embed_texts(docs)
    collection.add(ids=ids, documents=docs, metadatas=metadatas, embeddings=embeddings)

    return ids


def sincronizar_proceso_chromadb(codigo_proceso: str, titulo: str, contexto_legal: str, flujo_pasos: list):
    """
    Toma los datos de Postgres, los empaqueta y los vectoriza en ChromaDB.
    """
    collection = _get_collection("procesos_academicos")
    
    pasos_str = "\n".join(flujo_pasos)
    texto_para_ia = (
        f"PROCESO INSTITUCIONAL: {titulo}\n\n"
        f"PASOS OFICIALES DEL TRÁMITE:\n{pasos_str}\n\n"
        f"REGLAMENTO APLICABLE:\n{contexto_legal}"
    )

    # Fragmentación básica por párrafos
    fragmentos = [parrafo.strip() for parrafo in texto_para_ia.split('\n\n') if parrafo.strip()]
    
    documentos = []
    metadatos = []
    ids = []
    
    for i, fragmento in enumerate(fragmentos):
        documentos.append(fragmento)
        metadatos.append({"fuente": codigo_proceso, "titulo": titulo})
        ids.append(f"{codigo_proceso}_chunk_{i}")
        
    # Generamos los embeddings usando la función local (API de Mistral) antes de insertar
    embeddings = _embed_texts(documentos)
        
    try:
        collection.upsert(
            documents=documentos,
            metadatas=metadatos,
            ids=ids,
            embeddings=embeddings
        )
        print(f"Vectorizado en ChromaDB: {codigo_proceso}")
    except Exception as e:
        print(f"Error al vectorizar en ChromaDB el proceso {codigo_proceso}: {e}")


def _build_texto_calendario(periodo: PeriodoAcademico) -> str:
    actividades = list(periodo.actividades or [])
    partes = [f"CALENDARIO ACADÉMICO ACTIVO: {periodo.nombre}"]

    if periodo.fecha_fin_periodo:
        partes.append(f"Fecha de fin del periodo: {periodo.fecha_fin_periodo.isoformat()}")

    if periodo.es_actual:
        partes.append("Estado: periodo vigente")

    for actividad in actividades:
        fecha_orden = actividad.fecha_orden.isoformat() if actividad.fecha_orden else ""
        fecha_texto = actividad.fecha_texto.strip() if actividad.fecha_texto else fecha_orden
        partes.append(f"Actividad: {actividad.actividad.strip()} - Fecha: {fecha_texto}")

    return "\n\n".join([parte for parte in partes if str(parte).strip()])


def sincronizar_calendario_chromadb(periodo_id, db: Session):
    periodo = (
        db.query(PeriodoAcademico)
        .filter(PeriodoAcademico.id == str(periodo_id))
        .first()
    )

    if not periodo:
        raise ValueError("Periodo académico no encontrado.")

    texto_para_ia = _build_texto_calendario(periodo)
    fragmentos = _chunk_text(texto_para_ia)
    if not fragmentos:
        raise ValueError("No se generaron fragmentos del calendario.")

    collection = _get_collection("calendario_academico")

    try:
        collection.delete(where={"periodo_id": str(periodo.id)})
    except Exception:
        pass

    documentos = []
    metadatos = []
    ids = []

    for i, fragmento in enumerate(fragmentos):
        documentos.append(fragmento)
        metadatos.append(
            {
                "fuente": "calendario_academico",
                "periodo_id": str(periodo.id),
                "periodo_nombre": periodo.nombre,
                "es_actual": bool(periodo.es_actual),
                "chunk_index": i,
            }
        )
        ids.append(f"{periodo.id}-cal-{i}-{uuid.uuid4().hex[:8]}")

    embeddings = _embed_texts(documentos)

    collection.upsert(
        documents=documentos,
        metadatas=metadatos,
        ids=ids,
        embeddings=embeddings,
    )

    return ids