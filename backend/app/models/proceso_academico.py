from sqlalchemy import Boolean, Column, DateTime, Integer, String, Text
from sqlalchemy.sql import func
from sqlalchemy.types import JSON

from app.core.database import Base


class ProcesoAcademico(Base):
    __tablename__ = "procesos_academicos"

    id = Column(Integer, primary_key=True, index=True)
    codigo_proceso = Column(String(40), index=True, nullable=False)
    version = Column(Integer, nullable=False, default=1)
    es_actual = Column(Boolean, nullable=False, default=True)
    fecha_creacion = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    titulo = Column(String(200), nullable=False)
    activo = Column(Boolean, nullable=False, default=True)
    flujo_pasos = Column(JSON, nullable=False)
    contexto_legal = Column(Text, nullable=False)
    ruta_anexo = Column(String(500), nullable=True)
