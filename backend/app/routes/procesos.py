import uuid
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.proceso_academico import ProcesoAcademico
from app.schema.proceso_schema import ProcesoCreate, ProcesoOut, ProcesoUpdate
from app.services.chroma_service import upsert_contexto_proceso, eliminar_contexto_proceso
from app.core.utils import generate_next_codigo_proceso

router = APIRouter(prefix="/api/procesos", tags=["procesos"])


@router.get("", response_model=List[ProcesoOut])
def listar_procesos(db: Session = Depends(get_db)) -> List[ProcesoAcademico]:
    return (
        db.query(ProcesoAcademico)
        .filter(ProcesoAcademico.es_actual.is_(True), ProcesoAcademico.activo.is_(True))
        .order_by(ProcesoAcademico.codigo_proceso.asc())
        .all()
    )


@router.get("/{codigo}/historial", response_model=List[ProcesoOut])
def listar_historial(codigo: str, db: Session = Depends(get_db)) -> List[ProcesoAcademico]:
    historial = (
        db.query(ProcesoAcademico)
        .filter(ProcesoAcademico.codigo_proceso == codigo)
        .order_by(ProcesoAcademico.version.desc(), ProcesoAcademico.fecha_creacion.desc())
        .all()
    )
    if not historial:
        raise HTTPException(status_code=404, detail="No se encontraron versiones para este codigo.")

    return historial


@router.post("", response_model=ProcesoOut, status_code=status.HTTP_201_CREATED)
def crear_proceso(payload: ProcesoCreate, db: Session = Depends(get_db)) -> ProcesoAcademico:
    # Siempre generar el codigo de proceso en el servidor para evitar duplicados
    codigo_final = generate_next_codigo_proceso(db)

    existente = (
        db.query(ProcesoAcademico)
        .filter(
            ProcesoAcademico.codigo_proceso == codigo_final,
            ProcesoAcademico.es_actual.is_(True),
        )
        .first()
    )
    if existente:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Ya existe un proceso vigente con ese codigo.",
        )

    proceso = ProcesoAcademico(
        codigo_proceso=codigo_final,
        version=1,
        es_actual=True,
        titulo=payload.titulo,
        activo=payload.activo,
        flujo_pasos=payload.flujo_pasos,
        contexto_legal=payload.contexto_legal,
        ruta_anexo=payload.ruta_anexo,
    )

    db.add(proceso)
    db.commit()
    db.refresh(proceso)

    try:
        upsert_contexto_proceso(
            payload.contexto_legal,
            codigo_final,
            titulo=payload.titulo,
            flujo_pasos=payload.flujo_pasos,
        )
    except Exception:
        db.delete(proceso)
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="No se pudo indexar el contexto en ChromaDB.",
        )

    return proceso


@router.put("/{codigo}", response_model=ProcesoOut)
def actualizar_proceso(
    codigo: str,
    payload: ProcesoUpdate,
    db: Session = Depends(get_db),
) -> ProcesoAcademico:
    actual = (
        db.query(ProcesoAcademico)
        .filter(
            ProcesoAcademico.codigo_proceso == codigo,
            ProcesoAcademico.es_actual.is_(True),
        )
        .first()
    )
    if not actual:
        raise HTTPException(status_code=404, detail="Proceso vigente no encontrado.")

    nueva_version = int(actual.version or 0) + 1
    actual.es_actual = False

    nuevo = ProcesoAcademico(
        codigo_proceso=codigo,
        version=nueva_version,
        es_actual=True,
        titulo=payload.titulo,
        activo=payload.activo,
        flujo_pasos=payload.flujo_pasos,
        contexto_legal=payload.contexto_legal,
        ruta_anexo=payload.ruta_anexo,
    )

    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)

    try:
        upsert_contexto_proceso(
            payload.contexto_legal,
            codigo,
            titulo=payload.titulo,
            flujo_pasos=payload.flujo_pasos,
        )
    except Exception:
        db.delete(nuevo)
        actual.es_actual = True
        db.add(actual)
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="No se pudo sincronizar el contexto en ChromaDB.",
        )

    return nuevo


@router.delete("/{codigo}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_proceso(codigo: str, db: Session = Depends(get_db)):
    # Eliminar todas las versiones de este proceso
    procs = db.query(ProcesoAcademico).filter(ProcesoAcademico.codigo_proceso == codigo).all()
    if not procs:
        raise HTTPException(status_code=404, detail="Proceso no encontrado.")

    for p in procs:
        db.delete(p)

    db.commit()

    # Eliminar de ChromaDB
    try:
        eliminar_contexto_proceso(codigo)
    except Exception:
        # No bloqueamos el borrado si falla el vector store, pero avisamos en logs
        pass

    return None


@router.post("/{codigo}/rollback", response_model=ProcesoOut)
def deshacer_ultima_version(codigo: str, db: Session = Depends(get_db)) -> ProcesoAcademico:
    # 1. Buscar la versión actual
    actual = (
        db.query(ProcesoAcademico)
        .filter(
            ProcesoAcademico.codigo_proceso == codigo,
            ProcesoAcademico.es_actual.is_(True),
        )
        .first()
    )

    if not actual:
        raise HTTPException(status_code=404, detail="No hay una versión vigente para retroceder.")

    if actual.version <= 1:
        raise HTTPException(
            status_code=400,
            detail="No se puede deshacer la versión 1. Use eliminar si desea borrar el proceso completo.",
        )

    # 2. Buscar la versión inmediatamente anterior
    anterior = (
        db.query(ProcesoAcademico)
        .filter(
            ProcesoAcademico.codigo_proceso == codigo,
            ProcesoAcademico.version == actual.version - 1
        )
        .first()
    )

    if not anterior:
        raise HTTPException(status_code=404, detail="No se encontró la versión anterior en el historial.")

    # 3. Eliminar la actual y restaurar la anterior como actual
    try:
        db.delete(actual)
        anterior.es_actual = True
        db.add(anterior)
        db.commit()
        db.refresh(anterior)
        
        # 4. Sincronizar ChromaDB con el contexto legal de la versión restaurada
        upsert_contexto_proceso(
            anterior.contexto_legal,
            codigo,
            titulo=anterior.titulo,
            flujo_pasos=anterior.flujo_pasos,
        )
        
        return anterior
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Error durante el rollback: {str(e)}"
        )
