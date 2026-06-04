from datetime import date
from typing import List

from pydantic import BaseModel, Field


class ActividadCalendarioBase(BaseModel):
    actividad: str
    fecha_texto: str
    fecha_orden: date


class ActividadCalendarioCreate(ActividadCalendarioBase):
    pass


class ActividadCalendarioOut(ActividadCalendarioBase):
    id: str
    periodo_id: str

    class Config:
        from_attributes = True
        orm_mode = True


class PeriodoAcademicoBase(BaseModel):
    nombre: str
    fecha_fin_periodo: date
    es_actual: bool = False


class PeriodoAcademicoCreate(PeriodoAcademicoBase):
    actividades: List[ActividadCalendarioCreate]


class PeriodoAcademicoUpdate(PeriodoAcademicoBase):
    actividades: List[ActividadCalendarioCreate]


class PeriodoAcademicoOut(PeriodoAcademicoBase):
    id: str
    actividades: List[ActividadCalendarioOut] = Field(default_factory=list)

    class Config:
        from_attributes = True
        orm_mode = True