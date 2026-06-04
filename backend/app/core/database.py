import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# 1. Cargar variables de entorno desde el archivo .env
# Se busca en el directorio actual y hacia arriba
load_dotenv()

# 2. Obtener y validar DATABASE_URL
DATABASE_URL = os.getenv("DATABASE_URL", "").strip()

# Mensaje de depuración (puedes eliminarlo después de verificar)
if not DATABASE_URL:
    print(f"DEBUG: Directorio actual: {os.getcwd()}")
    print(f"DEBUG: Archivo .env existe: {os.path.exists('.env')}")
    raise RuntimeError("DATABASE_URL no configurada en las variables de entorno o el archivo .env no se encontró.")

print(f"✅ Conexión a base de datos configurada correctamente.")

engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
