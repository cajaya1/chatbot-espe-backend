from sqlalchemy import Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base


class Document(Base):
    __tablename__ = "documentos"

    id = Column(Integer, primary_key=True, index=True)
    title = Column("titulo", String(200), nullable=False)
    file_name = Column("nombre_archivo", String(200), nullable=False)
    description = Column("descripcion", String(500), nullable=True)
    category = Column("categoria", String(120), nullable=True)
    file_path = Column("ruta_fisica", String(500), nullable=False)
    vector_id = Column("id_vectorial", String(120), nullable=True)
    uploaded_at = Column("fecha_subida", DateTime(timezone=True), server_default=func.now(), nullable=False)
    status = Column("estado", String(40), nullable=False, default="activo")
    user_id = Column("usuario_id", Integer, ForeignKey("usuarios.id"), nullable=True)

    user = relationship("User", backref="documents")
