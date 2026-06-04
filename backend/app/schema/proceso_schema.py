from typing import List, Optional

from pydantic import BaseModel


class ProcesoBase(BaseModel):
    titulo: str
    activo: bool = True
    flujo_pasos: List[str]
    contexto_legal: str
    ruta_anexo: Optional[str] = None


class ProcesoCreate(ProcesoBase):
    codigo_proceso: Optional[str] = None


class ProcesoUpdate(ProcesoBase):
    pass


class ProcesoOut(ProcesoBase):
    id: int
    codigo_proceso: str
    version: int
    es_actual: bool

    class Config:
        from_attributes = True
        orm_mode = True
