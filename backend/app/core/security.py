import os
from datetime import datetime, timedelta
from typing import Any, Dict

from jose import jwt
import bcrypt

# Variables de entorno para JWT
JWT_SECRET = os.getenv("JWT_SECRET", "cambia_este_secreto").strip()
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256").strip()
JWT_EXPIRES_MINUTES = int(os.getenv("JWT_EXPIRES_MINUTES", "480"))

# --- FUNCIONES DE CONTRASEÑAS USANDO BCRYPT NATIVO ---

def hash_password(password: str) -> str:
    """Hashea una contraseña usando bcrypt nativo."""
    pwd_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt()
    hashed_password = bcrypt.hashpw(pwd_bytes, salt)
    return hashed_password.decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifica una contraseña contra su hash."""
    password_byte_enc = plain_password.encode('utf-8')
    hashed_password_byte_enc = hashed_password.encode('utf-8')
    return bcrypt.checkpw(password_byte_enc, hashed_password_byte_enc)

# --- FUNCIONES DE TOKENS JWT ---

def create_access_token(data: Dict[str, Any]) -> str:
    """Crea un token JWT de acceso."""
    to_encode = dict(data)
    expire = datetime.utcnow() + timedelta(minutes=JWT_EXPIRES_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)