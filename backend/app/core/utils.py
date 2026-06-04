from typing import Optional
from sqlalchemy.orm import Session
import re

from app.models.proceso_academico import ProcesoAcademico


def generate_next_codigo_proceso(db: Session, prefix: str = "PROC-") -> str:
    """Genera el siguiente codigo de proceso con formato PROC-01, PROC-02, ...

    Busca códigos existentes con el prefijo y toma el mayor sufijo numérico, incrementándolo.
    """
    # Obtener todos los códigos que comienzan con el prefijo
    rows = (
        db.query(ProcesoAcademico.codigo_proceso)
        .filter(ProcesoAcademico.codigo_proceso.startswith(prefix))
        .all()
    )

    max_n = 0
    pattern = re.compile(rf"^{re.escape(prefix)}(\d+)$")
    for (code,) in rows:
        if not code:
            continue
        m = pattern.match(code)
        if m:
            try:
                n = int(m.group(1))
                if n > max_n:
                    max_n = n
            except Exception:
                continue

    next_n = max_n + 1
    # Formato con 2 dígitos min (01, 02...). Crece si necesario.
    formatted = f"{prefix}{next_n:02d}"
    return formatted
