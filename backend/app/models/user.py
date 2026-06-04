from sqlalchemy import Boolean, Column, DateTime, Integer, String
from sqlalchemy.sql import func

from app.core.database import Base


class User(Base):
    __tablename__ = "usuarios"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    full_name = Column("nombre_completo", String(120), nullable=True)
    email = Column(String(120), unique=True, nullable=True)
    role = Column("rol", String(20), nullable=False, default="editor")
    hashed_password = Column("password_hash", String(255), nullable=False)
    last_login = Column("ultimo_login", DateTime(timezone=True))
    is_active = Column("activo", Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
