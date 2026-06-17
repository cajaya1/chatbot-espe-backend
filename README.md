# Plataforma de Asistencia Académica — Carrera ITIV (ESPE)

Plataforma web y **asistente virtual (chatbot)** para los estudiantes de la carrera de
**Tecnologías de la Información en Línea (ITIV)** de la **Universidad de las Fuerzas
Armadas — ESPE**. Centraliza la información de los procesos académicos reglamentarios,
ofrece la descarga de formatos y anexos oficiales, publica el calendario académico
vigente y responde consultas mediante un chatbot basado en recuperación aumentada
(RAG) sobre la normativa institucional.

---

## ✨ Características

- **Sitio público**: página de inicio con carrusel institucional, guía de procesos
  académicos, descarga de formatos/anexos y datos de contacto.
- **Asistente virtual (RAG)**: responde preguntas sobre los procesos académicos usando
  el reglamento institucional vectorizado en ChromaDB y embeddings/LLM de Mistral.
- **Integración con Telegram**: el mismo asistente está disponible vía bot de Telegram.
- **Portal administrativo**: gestión de procesos académicos, formatos, calendario
  académico, usuarios y datos de contacto del sitio, protegido con autenticación JWT.
- **Versionado de procesos**: cada proceso académico mantiene historial de versiones.

---

## 🧱 Arquitectura

| Capa            | Tecnología                                                        |
|-----------------|-------------------------------------------------------------------|
| Frontend        | React 19 + Vite + Tailwind CSS + React Router                     |
| Backend         | FastAPI (Python) + SQLAlchemy                                     |
| Base de datos   | PostgreSQL (local) / Supabase o Render PostgreSQL (producción)    |
| Búsqueda vectorial | ChromaDB (persistente en disco)                               |
| IA              | Mistral (embeddings `mistral-embed` + chat completions)          |
| Autenticación   | JWT                                                              |
| Mensajería      | Bot de Telegram                                                  |

El backend expone una API REST consumida por el frontend. El conocimiento del chatbot
se almacena como vectores en ChromaDB; PostgreSQL es la fuente de verdad de los
procesos, formatos, calendario y usuarios.

---

## 📁 Estructura del repositorio

```
.
├── backend/                  # API FastAPI
│   ├── app/
│   │   ├── core/             # database, seed, utilidades
│   │   ├── models/           # modelos SQLAlchemy
│   │   ├── routes/ schema/   # endpoints y esquemas Pydantic
│   │   └── services/         # Mistral, ChromaDB, usuarios, etc.
│   ├── scripts/              # scripts de mantenimiento de única ejecución
│   ├── institucional_vector_db/  # ChromaDB local (no versionado)
│   ├── requirements.txt
│   └── .env.example
├── frontend-espe/            # SPA en React + Vite
│   ├── src/                  # páginas, componentes, layouts, servicios
│   └── package.json
├── render.yaml               # blueprint de despliegue del backend en Render
└── README.md
```

---

## 🚀 Puesta en marcha (desarrollo local)

### Requisitos

- Python 3.11 o superior
- Node.js 18 o superior
- PostgreSQL (puerto 5432)
- Una API key de Mistral (para embeddings y chat)

### 1. Base de datos

```bash
psql -U postgres -h localhost -p 5432 -c "CREATE DATABASE chatbot;"
```

La base vectorial (ChromaDB) se crea automáticamente al iniciar el backend; no
requiere datos iniciales.

### 2. Backend (FastAPI)

```bash
cd backend
python -m venv venv
source venv/Scripts/activate      # Windows (Git Bash)
# source venv/bin/activate        # Linux / macOS
pip install -r requirements.txt
cp .env.example .env              # completa tus valores reales
uvicorn app.main:app --reload --env-file .env
```

Al iniciar, el backend ejecuta el *seed* y crea estos usuarios de prueba:

| Usuario        | Contraseña     | Rol     |
|----------------|----------------|---------|
| `admin`        | `admin`        | admin   |
| `cajaya1`      | `cajaya1`      | editor  |
| `mvmaldonado`  | `mvmaldonado`  | editor  |

> El seed es **idempotente**: solo inserta procesos/usuarios que no existen. No
> sobrescribe datos ya presentes en la base.

### 3. Frontend (Vite)

```bash
cd frontend-espe
npm install
cp .env.example .env.local        # ajusta VITE_API_URL si hace falta
npm run dev
```

---

## 🔐 Variables de entorno

### Backend (`backend/.env`)

| Variable              | Descripción                                            |
|-----------------------|--------------------------------------------------------|
| `MISTRAL_API_KEY`     | API key de Mistral (embeddings + chat)                 |
| `MISTRAL_MODEL`       | Modelo de chat (p. ej. `mistral-small-latest`)         |
| `MISTRAL_API_URL`     | Endpoint de chat completions de Mistral                |
| `DATABASE_URL`        | Cadena de conexión a PostgreSQL                        |
| `TELEGRAM_BOT_TOKEN`  | Token del bot de Telegram (@BotFather)                 |
| `JWT_SECRET`          | Secreto para firmar los JWT                            |
| `JWT_ALGORITHM`       | Algoritmo JWT (`HS256`)                                |
| `JWT_EXPIRES_MINUTES` | Expiración del token en minutos                        |
| `CARRERA_NOMBRE`, `UNIVERSIDAD_NOMBRE`, `DIRECTOR_NOMBRE`, `DIRECTOR_CORREO` | Datos institucionales |

### Frontend (`frontend-espe/.env.local`)

| Variable             | Descripción                                       |
|----------------------|---------------------------------------------------|
| `VITE_API_URL`       | URL del backend (por defecto `http://localhost:8000`) |
| `VITE_SUPPORT_EMAIL` | Correo de soporte para recuperación de acceso     |

> ⚠️ **Nunca** subas tus archivos `.env` al repositorio. Están ignorados en
> `.gitignore`; usa los `.env.example` como plantilla.

---

## ☁️ Despliegue

- **Frontend**: Vercel (build de Vite).
- **Backend**: Render, usando el blueprint [`render.yaml`](render.yaml) con:
  - `rootDir: backend`
  - build: `pip install -r requirements.txt`
  - start: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
  - disco persistente montado en `/var/data` para ChromaDB
- **Base de datos**: PostgreSQL administrado (Render o **Supabase**).

Tras importar el blueprint en Render, define `MISTRAL_API_KEY` y `JWT_SECRET` como
secretos. El disco persistente es **imprescindible** para no perder el índice de
ChromaDB entre reinicios.

---

## 🛠️ Scripts de mantenimiento

En `backend/scripts/` viven utilidades de **única ejecución** (no se ejecutan en el
arranque ni en cada despliegue).

### `sync_titulos_chatbot.py`

Corrige el título de los procesos `PROC-04` y `PROC-07` en la base de datos y reindexa
su contexto en ChromaDB para que el chatbot use los nombres actualizados. Es
idempotente y debe ejecutarse **una vez por entorno** (local y producción):

```bash
cd backend
python -m scripts.sync_titulos_chatbot
```

En producción, ejecútalo desde la shell del servicio de Render: actualiza la base de
datos (Supabase) y reindexa el ChromaDB del disco persistente.
