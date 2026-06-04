from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, File, HTTPException, UploadFile
from pydantic import BaseModel

from app.services.chroma_service import buscar_contexto, guardar_texto
from app.services.mistral_service import generar_respuesta
from app.services.pdf_service import leer_pdf

router = APIRouter(prefix="/documents", tags=["documents"])

FILES_DIR = Path(__file__).resolve().parents[2] / "files"
#leer_pdf(FILES_DIR / "ejemplo.pdf") 


class SearchRequest(BaseModel):
    pregunta: str
# En este archivo se definen las rutas relacionadas con documentos:
# - POST /documents/upload: para subir un PDF, extraer su texto, guardarlo en la base vectorial y retornar un resumen.
@router.post("/upload")
async def upload_document(file: UploadFile = File(...)):
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Solo se permiten archivos PDF")

    FILES_DIR.mkdir(parents=True, exist_ok=True)

    file_name = Path(file.filename).name
    file_path = FILES_DIR / file_name

    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Archivo vacío")

    file_path.write_bytes(content)

    try:
        text = leer_pdf(file_path)
    except Exception:
        raise HTTPException(status_code=500, detail="Error al leer PDF")

    doc_id = f"{Path(file_name).stem}-{uuid4().hex[:8]}"

    try:
        chunk_ids = guardar_texto(text, doc_id)
    except Exception:
        raise HTTPException(status_code=500, detail="Error al guardar el contenido en la base vectorial")

    preview = text[:200]

    return {
        "filename": file_name,
        "id_doc": doc_id,
        "chunks_guardados": len(chunk_ids),
        "preview": preview,
    }

# - POST /documents/search: para recibir una pregunta, buscar en la base vectorial y retornar los fragmentos más relevantes.
@router.post("/search")
def search_documents(payload: SearchRequest):
    if not payload.pregunta.strip():
        raise HTTPException(status_code=400, detail="La pregunta no puede estar vacía")

    fragments = buscar_contexto(payload.pregunta)
    respuesta = generar_respuesta(payload.pregunta, fragments)

    return {
        "question": payload.pregunta,
        "answer": respuesta,
        "results": fragments,
    }