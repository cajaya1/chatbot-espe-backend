import uuid

from sqlalchemy import Boolean, Column, Date, ForeignKey, String
from sqlalchemy.orm import relationship

from app.core.database import Base


class PeriodoAcademico(Base):
    __tablename__ = "periodos_academicos"

    id = Column(String(36), primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    nombre = Column(String(200), nullable=False)
    fecha_fin_periodo = Column(Date, nullable=False)
    es_actual = Column(Boolean, nullable=False, default=False)

    actividades = relationship(
        "ActividadCalendario",
        back_populates="periodo",
        cascade="all, delete-orphan",
        passive_deletes=True,
        order_by="ActividadCalendario.fecha_orden.asc()",
    )


class ActividadCalendario(Base):
    __tablename__ = "actividades_calendario"

    id = Column(String(36), primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    periodo_id = Column(
        String(36),
        ForeignKey("periodos_academicos.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    actividad = Column(String(255), nullable=False)
    fecha_texto = Column(String(120), nullable=False)
    fecha_orden = Column(Date, nullable=False)

    periodo = relationship("PeriodoAcademico", back_populates="actividades")