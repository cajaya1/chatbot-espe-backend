from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.categoria import Categoria, ProcesoCategoria
from app.schema.categoria_schema import CategoriaCreate, CategoriaOut, CategoriaUpdate

router = APIRouter(prefix="/api/categorias", tags=["categorias"])


@router.get("", response_model=List[CategoriaOut])
def listar_categorias(db: Session = Depends(get_db)) -> List[Categoria]:
    return (
        db.query(Categoria)
        .order_by(Categoria.orden.asc(), Categoria.nombre.asc())
        .all()
    )


@router.post("", response_model=CategoriaOut, status_code=status.HTTP_201_CREATED)
def crear_categoria(payload: CategoriaCreate, db: Session = Depends(get_db)) -> Categoria:
    nombre = payload.nombre.strip()
    if not nombre:
        raise HTTPException(status_code=400, detail="El nombre de la categoría es obligatorio.")

    if db.query(Categoria).filter(Categoria.nombre == nombre).first():
        raise HTTPException(status_code=409, detail="Ya existe una categoría con ese nombre.")

    max_orden = db.query(func.max(Categoria.orden)).scalar() or 0
    categoria = Categoria(nombre=nombre, orden=max_orden + 1)
    db.add(categoria)
    db.commit()
    db.refresh(categoria)
    return categoria


@router.put("/{categoria_id}", response_model=CategoriaOut)
def actualizar_categoria(
    categoria_id: int,
    payload: CategoriaUpdate,
    db: Session = Depends(get_db),
) -> Categoria:
    categoria = db.query(Categoria).filter(Categoria.id == categoria_id).first()
    if not categoria:
        raise HTTPException(status_code=404, detail="Categoría no encontrada.")

    nombre = payload.nombre.strip()
    if not nombre:
        raise HTTPException(status_code=400, detail="El nombre de la categoría es obligatorio.")

    duplicada = (
        db.query(Categoria)
        .filter(Categoria.nombre == nombre, Categoria.id != categoria_id)
        .first()
    )
    if duplicada:
        raise HTTPException(status_code=409, detail="Ya existe una categoría con ese nombre.")

    categoria.nombre = nombre
    db.commit()
    db.refresh(categoria)
    return categoria


@router.delete("/{categoria_id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_categoria(categoria_id: int, db: Session = Depends(get_db)):
    categoria = db.query(Categoria).filter(Categoria.id == categoria_id).first()
    if not categoria:
        raise HTTPException(status_code=404, detail="Categoría no encontrada.")

    # Desasignar los procesos de esta categoría: quedan sin categoría ("Otros").
    db.query(ProcesoCategoria).filter(ProcesoCategoria.categoria_id == categoria_id).delete()
    db.delete(categoria)
    db.commit()
    return None
