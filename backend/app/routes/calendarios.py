from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.calendario_academico import ActividadCalendario, PeriodoAcademico
from app.schema.calendario_schema import (
    ActividadCalendarioCreate,
    PeriodoAcademicoCreate,
    PeriodoAcademicoOut,
    PeriodoAcademicoUpdate,
)
from app.services.chroma_service import eliminar_contexto_calendario, sincronizar_calendario_chromadb


router = APIRouter(prefix="/api/calendarios", tags=["calendario académico"])


def _crear_actividades(periodo: PeriodoAcademico, actividades: List[ActividadCalendarioCreate]) -> None:
    periodo.actividades = [
        ActividadCalendario(
            actividad=actividad.actividad.strip(),
            fecha_texto=actividad.fecha_texto.strip(),
            fecha_orden=actividad.fecha_orden,
        )
        for actividad in actividades
    ]


@router.get("", response_model=List[PeriodoAcademicoOut])
def listar_periodos(db: Session = Depends(get_db)) -> List[PeriodoAcademico]:
    return (
        db.query(PeriodoAcademico)
        .order_by(PeriodoAcademico.es_actual.desc(), PeriodoAcademico.fecha_fin_periodo.desc())
        .all()
    )


@router.get("/{periodo_id}", response_model=PeriodoAcademicoOut)
def obtener_periodo(periodo_id: str, db: Session = Depends(get_db)) -> PeriodoAcademico:
    periodo = db.query(PeriodoAcademico).filter(PeriodoAcademico.id == periodo_id).first()
    if not periodo:
        raise HTTPException(status_code=404, detail="Periodo académico no encontrado.")
    return periodo


@router.post("", response_model=PeriodoAcademicoOut, status_code=status.HTTP_201_CREATED)
def crear_periodo(payload: PeriodoAcademicoCreate, db: Session = Depends(get_db)) -> PeriodoAcademico:
    periodo = PeriodoAcademico(
        nombre=payload.nombre.strip(),
        fecha_fin_periodo=payload.fecha_fin_periodo,
        es_actual=payload.es_actual,
    )
    _crear_actividades(periodo, payload.actividades)

    db.add(periodo)
    db.flush()

    try:
        sincronizar_calendario_chromadb(periodo.id, db)
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="No se pudo sincronizar el calendario en ChromaDB.",
        )

    db.commit()
    db.refresh(periodo)

    return periodo


@router.put("/{periodo_id}", response_model=PeriodoAcademicoOut)
def actualizar_periodo(
    periodo_id: str,
    payload: PeriodoAcademicoUpdate,
    db: Session = Depends(get_db),
) -> PeriodoAcademico:
    periodo = db.query(PeriodoAcademico).filter(PeriodoAcademico.id == periodo_id).first()
    if not periodo:
        raise HTTPException(status_code=404, detail="Periodo académico no encontrado.")

    periodo.nombre = payload.nombre.strip()
    periodo.fecha_fin_periodo = payload.fecha_fin_periodo
    periodo.es_actual = payload.es_actual

    _crear_actividades(periodo, payload.actividades)

    db.add(periodo)
    db.flush()

    try:
        sincronizar_calendario_chromadb(periodo.id, db)
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="No se pudo actualizar la indexación del calendario en ChromaDB.",
        )

    db.commit()
    db.refresh(periodo)

    return periodo


@router.delete("/{periodo_id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_periodo(periodo_id: str, db: Session = Depends(get_db)):
    periodo = db.query(PeriodoAcademico).filter(PeriodoAcademico.id == periodo_id).first()
    if not periodo:
        raise HTTPException(status_code=404, detail="Periodo académico no encontrado.")

    db.delete(periodo)
    db.commit()

    try:
        eliminar_contexto_calendario(periodo_id)
    except Exception:
        pass

    return None