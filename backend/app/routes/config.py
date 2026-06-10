from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.configuracion import Configuracion

router = APIRouter(prefix="/api/config", tags=["configuracion"])

_DEFAULTS = {
    "correo_soporte": "carrera_itiv@espe.edu.ec",
    "telefono_soporte": "(02) 3989-400",
}


def _get_valor(db: Session, clave: str) -> str:
    row = db.query(Configuracion).filter(Configuracion.clave == clave).first()
    return row.valor if row and row.valor else _DEFAULTS.get(clave, "")


def _set_valor(db: Session, clave: str, valor: str) -> None:
    row = db.query(Configuracion).filter(Configuracion.clave == clave).first()
    if row:
        row.valor = valor
    else:
        db.add(Configuracion(clave=clave, valor=valor))
    db.commit()


# --- Correo de soporte ---

@router.get("/correo_soporte")
def get_correo_soporte(db: Session = Depends(get_db)):
    return {"correo": _get_valor(db, "correo_soporte")}


class CorreoPayload(BaseModel):
    correo: str


@router.put("/correo_soporte")
def set_correo_soporte(payload: CorreoPayload, db: Session = Depends(get_db)):
    correo = payload.correo.strip()
    _set_valor(db, "correo_soporte", correo)
    return {"correo": correo}


# --- Teléfono de soporte ---

@router.get("/telefono_soporte")
def get_telefono_soporte(db: Session = Depends(get_db)):
    return {"telefono": _get_valor(db, "telefono_soporte")}


class TelefonoPayload(BaseModel):
    telefono: str


@router.put("/telefono_soporte")
def set_telefono_soporte(payload: TelefonoPayload, db: Session = Depends(get_db)):
    telefono = payload.telefono.strip()
    _set_valor(db, "telefono_soporte", telefono)
    return {"telefono": telefono}
