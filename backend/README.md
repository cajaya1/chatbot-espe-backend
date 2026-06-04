

## Requisitos

- Python 3.10 o superior recomendado
- `pip`

## Estructura

```text
backend/
├── app/
│   └── main.py
├── requirements.txt
└── venv/
```

## Instalación

1. Clona el repositorio en la nueva máquina.
2. Entra a la carpeta `backend`.
3. Crea y activa un entorno virtual.

### Windows

```bash
python -m venv venv
venv\Scripts\activate
```
 source venv/Scripts/activate
```

### Linux / macOS

```bash
python3 -m venv venv
source venv/bin/activate
```

4. Instala las dependencias.

```bash
pip install -r requirements.txt
```
## Mistral
ollama run mistral
## Variables De Entorno

1. Crea tu archivo local a partir de la plantilla:

```bash
copy .env.example .env
```

En Linux/macOS:

```bash
cp .env.example .env
```

2. Edita `.env` y completa al menos `MISTRAL_API_KEY`.

Variables disponibles:

- `MISTRAL_API_KEY`: clave de API de Mistral cloud.
- `MISTRAL_MODEL`: modelo a usar (por defecto recomendado: `mistral-small-latest`).
- `MISTRAL_API_URL`: endpoint de Mistral (`https://api.mistral.ai/v1/chat/completions`).
- `DATABASE_URL`: cadena de conexión a PostgreSQL. Ejemplo: `postgresql+psycopg2://root:rootroot@localhost:5432/chatbot`
- `JWT_SECRET`: secreto para firmar tokens JWT.
- `JWT_ALGORITHM`: algoritmo JWT (por defecto: `HS256`).
- `JWT_EXPIRES_MINUTES`: minutos de expiración del token.

## PostgreSQL

1. Asegúrate de tener PostgreSQL levantado en el puerto `5432`.
2. Crea la base principal si aún no existe:

```bash
psql -U root -h localhost -p 5432 -c "CREATE DATABASE chatbot;"
```

La base vectorial para archivos se crea automáticamente en la carpeta `backend\institucional_vector_db` cuando inicias el backend.

## Ejecutar la aplicación

Desde la carpeta `backend`, levanta el servidor con:

```bash
uvicorn app.main:app --reload
```

Si quieres cargar variables desde `.env` explícitamente:

```bash
uvicorn app.main:app --reload --env-file .env
```

Si quieres cambiar el host o el puerto:

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Alternativamente puedes ejecutar el paquete directamente con Python (arranca Uvicorn internamente):

```powershell
# Desde la carpeta `backend` (Windows PowerShell)
python -m app.main

# O en Linux/macOS
python -m app.main
```

Nota: este modo requiere que `uvicorn` esté instalado en el entorno virtual. Si no está en `requirements.txt`, instálalo con `pip install uvicorn[standard]`.

## Probar la API

Abre en el navegador o usa un cliente HTTP:

```bash
http://127.0.0.1:8000/
```
```bash
http://127.0.0.1:8000/docs
```

Respuesta esperada:

```json
{"message": "API funcionando 2"}
```

Buscar contexto semántico:

```bash
curl -X POST "http://127.0.0.1:8000/documents/search" \
	-H "Content-Type: application/json" \
	-d '{"pregunta":"¿Qué dice el documento sobre gatos?"}'
```

Ejecutar tests:

```bash
python -m pytest -q
```

## Dependencias y recomendaciones

- Instala todas las dependencias listadas en `requirements.txt`:

```powershell
pip install -r requirements.txt
```

- Asegúrate de tener `uvicorn[standard]` para ejecutar el servidor con `python -m app.main` o con `uvicorn`:

```powershell
pip install "uvicorn[standard]"
```

- Si vas a usar la API de Mistral cloud, configura `MISTRAL_API_KEY` en `.env` o en variables de entorno antes de arrancar.

## Notas

- El archivo `requirements.txt` incluye: `fastapi`, `uvicorn[standard]`, `python-multipart`, `pypdf`, `chromadb`, `sentence-transformers` y `pytest`.
- Si agregas nuevas rutas, modelos o servicios, documenta aquí cómo ejecutarlos y qué variables de entorno necesitan.
