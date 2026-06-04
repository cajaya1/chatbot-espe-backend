# CHATBOT ESPE - Puesta en marcha

## Despliegue recomendado

- Frontend: Vercel
- Backend: Render con disco persistente para ChromaDB
- Base de datos: PostgreSQL administrado por Render o Supabase

Variables clave para producción:

- `VITE_API_URL` en el frontend apuntando a tu backend público
- `DATABASE_URL` en el backend apuntando a PostgreSQL administrado
- `MISTRAL_API_KEY` en el backend para usar Mistral en la nube

Importante: `backend/institucional_vector_db` debe persistir entre reinicios si sigues usando ChromaDB local.

### Render

El archivo [render.yaml](render.yaml) ya deja preparado el backend para Render con:

- `rootDir: backend`
- `pip install -r requirements.txt` como build command
- `uvicorn app.main:app --host 0.0.0.0 --port $PORT` como start command
- disco persistente montado en `/var/data`
- `CHROMA_PATH=/var/data/institucional_vector_db`
- base PostgreSQL creada por el blueprint

Al subir el repositorio a Render, importa ese blueprint y luego define `MISTRAL_API_KEY` y `JWT_SECRET` como secretos.

## Requisitos

- Python 3.10 o superior
- Node.js 18 o superior
- PostgreSQL (puerto 5432)
- Ollama instalado

## Manifiestos de dependencias

- Backend: `backend/requirements.txt` está versionado para despliegue reproducible.
- Frontend: `frontend-espe/package.json` ya está alineado con los imports actuales del proyecto.

## Servicios que deben estar levantados

1. **Ollama + modelo Mistral**
2. **PostgreSQL**
3. **Backend (FastAPI)**
4. **Frontend (Vite)**

## PostgreSQL

Se utiliza el usuario `root` con contraseña `rootroot` en el puerto `5432`.

```bash
psql -U root -h localhost -p 5432 -c "CREATE DATABASE chatbot;"
```

La base vectorial para archivos se crea automáticamente en `backend\institucional_vector_db` cuando inicias el backend (no necesita datos iniciales).

## Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
uvicorn app.main:app --reload --env-file .env
```

En Linux/macOS:

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --env-file .env
```

Usuarios iniciales creados al iniciar:

- `cajaya1` / `cajaya1`
- `mvmaldonado` / `mvmaldonado`
- `admin` / `admin`

## Ollama + Mistral

```bash
ollama pull mistral
ollama serve
```

Para probar rápidamente:

```bash
ollama run mistral
```

## Frontend

```bash
cd frontend-espe
npm install
copy .env.example .env.local
npm run dev
```

En Linux/macOS:

```bash
cd frontend-espe
npm install
cp .env.example .env.local
npm run dev
```

Variables recomendadas en `frontend-espe\.env.local`:

- `VITE_API_URL` (por defecto `http://localhost:8000`)
- `VITE_SUPPORT_EMAIL` para recuperación de contraseña
