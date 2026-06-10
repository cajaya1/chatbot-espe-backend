from sqlalchemy import Column, String

from app.core.database import Base


class Configuracion(Base):
    __tablename__ = "configuracion"

    clave = Column(String(100), primary_key=True)
    valor = Column(String(500), nullable=True)
