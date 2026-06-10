import os
import pathlib
import re
import uuid

from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.responses import FileResponse

router = APIRouter(prefix="/api/formatos", tags=["formatos"])

_UPLOAD_DIR = pathlib.Path(__file__).parent.parent.parent / "uploads" / "formatos"

_ALLOWED_EXTENSIONS = {".doc", ".docx"}
_MAX_SIZE_MB = 10


def _sanitize(name: str) -> str:
    """Elimina caracteres no seguros manteniendo legibilidad del nombre."""
    name = re.sub(r"[^\w.\-]", "_", name)   # reemplaza espacios y especiales por _
    name = re.sub(r"_+", "_", name)          # colapsa guiones bajos consecutivos
    return name.strip("_")


@router.post("/upload")
async def upload_formato(file: UploadFile = File(...)):
    original = file.filename or "archivo"
    stem, ext = os.path.splitext(original)
    ext = ext.lower()

    if ext not in _ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Solo se aceptan archivos .doc o .docx")

    content = await file.read()
    if len(content) > _MAX_SIZE_MB * 1024 * 1024:
        raise HTTPException(status_code=413, detail=f"El archivo supera el límite de {_MAX_SIZE_MB} MB")

    _UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

    # Nombre legible: nombre-original_xxxxxxxx.docx (prefijo corto para evitar colisiones)
    safe_stem = _sanitize(stem) or "formato"
    short_id = uuid.uuid4().hex[:8]
    safe_name = f"{safe_stem}_{short_id}{ext}"

    dest = _UPLOAD_DIR / safe_name
    with open(dest, "wb") as f:
        f.write(content)

    return {"url": f"/uploads/formatos/{safe_name}", "nombre": original}


@router.get("/download/{filename}")
def download_formato(filename: str):
    """Sirve el archivo con Content-Disposition para forzar descarga con nombre limpio."""
    # Validar que no haya path traversal
    if "/" in filename or "\\" in filename or ".." in filename:
        raise HTTPException(status_code=400, detail="Nombre de archivo no válido")

    path = _UPLOAD_DIR / filename
    if not path.exists() or not path.is_file():
        raise HTTPException(status_code=404, detail="Archivo no encontrado")

    # Quitar el sufijo UUID para presentar el nombre original al usuario
    clean_name = re.sub(r"_[a-f0-9]{8}(\.[^.]+)$", r"\1", filename)

    return FileResponse(
        path=str(path),
        filename=clean_name,
        media_type="application/octet-stream",
    )
