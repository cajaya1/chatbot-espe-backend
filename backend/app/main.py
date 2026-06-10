import sys
try:
    import pysqlite3
    sys.modules['sqlite3'] = sys.modules.pop('pysqlite3')
except ImportError:
    pass

import os
import pathlib
from contextlib import asynccontextmanager
from dotenv import load_dotenv
import asyncio
# Cargar variables de entorno antes de importar otros módulos de la app
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.database import Base, SessionLocal, engine
from app.core.seed import seed_procesos, seed_users, seed_calendario
from app.models import user as user_model  # noqa: F401
from app.models import document as document_model  # noqa: F401
from app.models import proceso_academico as proceso_academico_model  # noqa: F401
from app.models import calendario_academico as calendario_academico_model  # noqa: F401
from app.models import configuracion as configuracion_model  # noqa: F401
from app.routes.documents import router as documents_router
from app.routes.chat import router as chat_router
from app.routes.auth import router as auth_router
from app.routes.users import router as users_router
from app.routes.procesos import router as procesos_router
from app.routes.calendarios import router as calendarios_router
from app.routes.telegram import router as telegram_router
from app.routes.config import router as config_router
from app.routes.formatos_upload import router as formatos_upload_router
from app.services.chroma_service import ensure_collection, sincronizar_proceso_chromadb, CLIENT
from app.services.chroma_service import sincronizar_calendario_chromadb


async def _vectorizar_en_background() -> None:
    """
    Reconstruye ChromaDB y vectoriza procesos/calendarios en segundo plano,
    DESPUÉS de que uvicorn ya está escuchando en el puerto.
    Incluye pausas para respetar el rate-limit de la API gratuita de Mistral.
    """
    print("[Background] Iniciando reconstrucción de ChromaDB...")

    for nombre in ("procesos_academicos", "calendario_academico", "documentos"):
        try:
            CLIENT.delete_collection(nombre)
            print(f"[Background] Colección '{nombre}' reseteada.")
        except Exception:
            pass

    ensure_collection()
    ensure_collection("procesos_academicos")
    ensure_collection("calendario_academico")

    db = SessionLocal()
    try:
        procesos_activos = (
            db.query(proceso_academico_model.ProcesoAcademico)
            .filter(proceso_academico_model.ProcesoAcademico.es_actual == True)
            .all()
        )
        for proceso in procesos_activos:
            sincronizar_proceso_chromadb(
                codigo_proceso=proceso.codigo_proceso,
                titulo=proceso.titulo,
                contexto_legal=proceso.contexto_legal,
                flujo_pasos=proceso.flujo_pasos,
            )
            await asyncio.sleep(2)  # Respetar rate-limit de Mistral free tier
        print(f"[Background] {len(procesos_activos)} procesos vectorizados.")

        periodos = db.query(calendario_academico_model.PeriodoAcademico).all()
        for periodo in periodos:
            sincronizar_calendario_chromadb(periodo.id, db)
            await asyncio.sleep(1)
        print(f"[Background] {len(periodos)} periodos académicos vectorizados.")

    except Exception as exc:
        print(f"[Background] Error durante la vectorización: {exc}")
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # --- STARTUP: solo lo mínimo para que el puerto quede disponible de inmediato ---
    print("Iniciando servidor: preparando base de datos...")

    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        seed_users(db)
        seed_procesos(db)
        seed_calendario(db)
    except Exception as exc:
        print(f"Error en seed: {exc}")
    finally:
        db.close()

    # Lanzar la vectorización de ChromaDB en segundo plano sin bloquear el arranque
    asyncio.create_task(_vectorizar_en_background())

    print("Servidor listo. Vectorización de ChromaDB corriendo en segundo plano.")

    # --- LA APLICACIÓN ESTÁ CORRIENDO ---
    yield

    # --- SHUTDOWN ---
    print("Apagando el servidor...")


# Inicializamos la app inyectando el lifespan
app = FastAPI(lifespan=lifespan)

# Permite pruebas desde Swagger UI y frontends locales (React/Vite/etc.).
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost",
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "https://chatbot-espe-backend.vercel.app" 
    ],
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(documents_router)
app.include_router(chat_router)
app.include_router(auth_router)
app.include_router(users_router)
app.include_router(procesos_router)
app.include_router(calendarios_router)
app.include_router(telegram_router)
app.include_router(config_router)
app.include_router(formatos_upload_router)

# Servir archivos subidos (Word docs) de forma estática
_uploads_dir = pathlib.Path(__file__).parent.parent / "uploads"
_uploads_dir.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(_uploads_dir)), name="uploads")


@app.get("/")
def home():
    return {"message": "API funcionando 2"}


if __name__ == "__main__":
    # Ejecutar con: python app/main.py
    try:
        import uvicorn

        port = int(os.getenv("PORT", "8000"))
        uvicorn.run("app.main:app", host="0.0.0.0", port=port, reload=False)
    except Exception as e:
        print("No se pudo iniciar el servidor con uvicorn:", e)