from sqlalchemy import Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.sql import func

from app.core.database import Base


class Categoria(Base):
    """Categoría de presentación para agrupar procesos en el selector del chat.

    Es puramente de UI: NO interviene en la base vectorial ni en las respuestas
    de Mistral. Solo organiza los procesos en el menú del asistente y en el admin.
    """

    __tablename__ = "categorias"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(120), nullable=False, unique=True)
    orden = Column(Integer, nullable=False, default=0)
    fecha_creacion = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class ProcesoCategoria(Base):
    """Mapeo proceso lógico (codigo_proceso) -> categoría.

    Se asocia por codigo_proceso (no por id de versión) para ser robusto al
    versionado de los procesos. Cada proceso pertenece a una sola categoría.
    """

    __tablename__ = "proceso_categoria"

    codigo_proceso = Column(String(40), primary_key=True, index=True)
    categoria_id = Column(
        Integer,
        ForeignKey("categorias.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
