import sys
try:
    import pysqlite3
    sys.modules['sqlite3'] = sys.modules.pop('pysqlite3')
except ImportError:
    pass

import os
from contextlib import asynccontextmanager
from dotenv import load_dotenv
import asyncio
# Cargar variables de entorno antes de importar otros módulos de la app
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.database import Base, SessionLocal, engine
from app.core.seed import seed_procesos, seed_users
from app.models import user as user_model  # noqa: F401
from app.models import document as document_model  # noqa: F401
from app.models import proceso_academico as proceso_academico_model  # noqa: F401
from app.models import calendario_academico as calendario_academico_model  # noqa: F401
from app.routes.documents import router as documents_router
from app.routes.chat import router as chat_router
from app.routes.auth import router as auth_router
from app.routes.users import router as users_router
from app.routes.procesos import router as procesos_router
from app.routes.calendarios import router as calendarios_router
from app.services.chroma_service import ensure_collection, sincronizar_proceso_chromadb, CLIENT
from app.services.chroma_service import sincronizar_calendario_chromadb


@asynccontextmanager
async def lifespan(app: FastAPI):
    # --- LÓGICA DE ENCENDIDO (STARTUP) ---
    print("Iniciando servidor: Configurando base de datos y reconstruyendo ChromaDB...")
    
    # 1. BORRAR LA COLECCIÓN VIEJA PARA ARREGLAR LAS DIMENSIONES (384 vs 1024)
    try:
        CLIENT.delete_collection("procesos_academicos")
        print("Colección 'procesos_academicos' reseteada para recibir vectores de Mistral (1024d).")
    except Exception:
        pass

    try:
        CLIENT.delete_collection("calendario_academico")
        print("Colección 'calendario_academico' reseteada para recibir vectores de Mistral (1024d).")
    except Exception:
        pass
        
    try:
        CLIENT.delete_collection("documentos")
    except Exception:
        pass

    Base.metadata.create_all(bind=engine)
    ensure_collection()
    ensure_collection("procesos_academicos")
    ensure_collection("calendario_academico")
    
    db = SessionLocal()
    try:
        # 1. Ejecutar seeds iniciales
        seed_users(db)
        seed_procesos(db)

        # 2. Sincronización vectorial en memoria para despliegue en la nube
        procesos_activos = (
            db.query(proceso_academico_model.ProcesoAcademico)
            .filter(proceso_academico_model.ProcesoAcademico.es_actual == True)
            .all()
        )
        
        if procesos_activos:
            for proceso in procesos_activos:
                sincronizar_proceso_chromadb(
                    codigo_proceso=proceso.codigo_proceso,
                    titulo=proceso.titulo,
                    contexto_legal=proceso.contexto_legal,
                    flujo_pasos=proceso.flujo_pasos
                )
                # Pausa de 2 segundos para respetar el límite de la API gratuita de Mistral
                await asyncio.sleep(2)
                
            print(f"Se vectorizaron {len(procesos_activos)} procesos exitosamente para el RAG.")
        else:
            print("La base de datos de Postgres está vacía. No hay procesos para vectorizar.")

        periodos_academicos = db.query(calendario_academico_model.PeriodoAcademico).all()
        if periodos_academicos:
            for periodo in periodos_academicos:
                sincronizar_calendario_chromadb(periodo.id, db)
                await asyncio.sleep(1)

            print(f"Se vectorizaron {len(periodos_academicos)} periodos académicos exitosamente para el RAG.")
        else:
            print("La base de datos de Postgres está vacía. No hay periodos académicos para vectorizar.")

    except Exception as e:
        print(f"Error crítico durante el arranque o reconstrucción de ChromaDB: {e}")
    finally:
        db.close()
        
    # --- LA APLICACIÓN ESTÁ CORRIENDO ---
    yield 
    
    # --- LÓGICA DE APAGADO (SHUTDOWN) ---
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