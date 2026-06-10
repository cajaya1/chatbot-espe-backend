from __future__ import annotations

import logging
import os
import re
from typing import Any

import anyio
import httpx
from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.config import DIRECTOR_CORREO
from app.core.database import get_db
from app.models.calendario_academico import PeriodoAcademico
from app.models.proceso_academico import ProcesoAcademico
from app.routes.chat import (
    _build_system_prompt,
    _construir_fuente_formateada,
    _extract_results,
    _invocar_llm,
)
from app.services.chroma_service import buscar_contexto_proceso

logger = logging.getLogger(__name__)

router = APIRouter(tags=["telegram"])

# URLs públicas para construir links absolutos de descarga en los mensajes.
# RENDER_EXTERNAL_URL la define Render automáticamente en producción.
_BACKEND_URL = (
    os.getenv("BACKEND_PUBLIC_URL")
    or os.getenv("RENDER_EXTERNAL_URL")
    or "http://localhost:8000"
).rstrip("/")
_FRONTEND_URL = os.getenv(
    "FRONTEND_PUBLIC_URL", "https://chatbot-espe-backend.vercel.app"
).rstrip("/")


def _link_anexo(ruta: str) -> str:
    """Convierte la ruta relativa del anexo en una URL absoluta descargable."""
    ruta = ruta.strip()
    if ruta.startswith("http"):
        return ruta
    if ruta.startswith("/uploads/"):
        filename = ruta.rsplit("/", 1)[-1]
        return f"{_BACKEND_URL}/api/formatos/download/{filename}"
    # Formatos del seed: viven en public/ del frontend
    return f"{_FRONTEND_URL}{ruta if ruta.startswith('/') else '/' + ruta}"

# ---------------------------------------------------------------------------
# Estado de sesión en memoria: {chat_id -> {"codigo": str|None, "titulo": str|None}}
# ---------------------------------------------------------------------------
_sessions: dict[int, dict[str, str | None]] = {}


def _get_token() -> str:
    token = os.getenv("TELEGRAM_BOT_TOKEN", "").strip()
    if not token:
        raise RuntimeError("TELEGRAM_BOT_TOKEN no está configurado en .env")
    return token


async def _send_message(chat_id: int, text: str) -> None:
    token = _get_token()
    url = f"https://api.telegram.org/bot{token}/sendMessage"
    payload = {
        "chat_id": chat_id,
        "text": text,
        "parse_mode": "HTML",
    }
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.post(url, json=payload)
        if resp.status_code != 200:
            logger.error("Error al enviar mensaje a Telegram: %s", resp.text)


def _listar_procesos(db: Session) -> list[ProcesoAcademico]:
    return (
        db.query(ProcesoAcademico)
        .filter(ProcesoAcademico.es_actual.is_(True))
        .order_by(ProcesoAcademico.codigo_proceso)
        .all()
    )


def _texto_lista_procesos(procesos: list[ProcesoAcademico]) -> str:
    lineas = ["<b>Procesos disponibles:</b>\n"]
    for i, p in enumerate(procesos, 1):
        lineas.append(f"  {i}. {p.titulo}")
    lineas.append(
        "\nResponde con el <b>numero</b> del proceso o escribe parte de su nombre "
        "para seleccionarlo. Luego puedes hacerme tu consulta."
    )
    return "\n".join(lineas)


def _obtener_calendario_texto(db: Session) -> str:
    periodo = (
        db.query(PeriodoAcademico)
        .filter(PeriodoAcademico.es_actual.is_(True))
        .first()
    )
    if not periodo or not periodo.actividades:
        return ""
    lineas = [f"Periodo: {periodo.nombre}"]
    for act in periodo.actividades:
        lineas.append(f"- {act.actividad}: {act.fecha_texto}")
    return "\n".join(lineas)


def _intentar_seleccionar_proceso(
    texto: str, procesos: list[ProcesoAcademico]
) -> ProcesoAcademico | None:
    texto_limpio = texto.strip()

    # Selección por número
    if texto_limpio.isdigit():
        idx = int(texto_limpio) - 1
        if 0 <= idx < len(procesos):
            return procesos[idx]
        return None

    # Selección por coincidencia parcial de título
    texto_lower = texto_limpio.lower()
    for p in procesos:
        if texto_lower in p.titulo.lower():
            return p

    return None


async def _responder_pregunta(
    chat_id: int,
    pregunta: str,
    proceso: ProcesoAcademico,
    db: Session,
) -> None:
    results = buscar_contexto_proceso(pregunta, proceso.codigo_proceso, n_results=3)
    fragmentos, _, _ = _extract_results(results)

    if not fragmentos:
        await _send_message(
            chat_id,
            f"Entiendo que preguntas sobre <b>{proceso.titulo}</b>, pero no encuentro "
            f"ese detalle especifico en mis registros normativos.\n\n"
            f"Por favor, comunicate con el Director de Carrera: {DIRECTOR_CORREO}",
        )
        return

    contexto_plano = "\n\n".join([
        f"--- REGLA DE LA UNIVERSIDAD ---\n{frag}\n----------------------------------"
        for frag in fragmentos
    ])
    intro = f"(El usuario pregunta sobre el proceso: {proceso.titulo}. Responde asumiendo este contexto)."
    user_content = f"{intro}\n\nCONTEXTO INSTITUCIONAL:\n{contexto_plano}\n\nPREGUNTA DEL ESTUDIANTE:\n{pregunta}"

    calendario_texto = _obtener_calendario_texto(db)
    system_prompt = _build_system_prompt(calendario_texto)

    try:
        respuesta = await anyio.to_thread.run_sync(
            _invocar_llm, system_prompt, user_content
        )
    except Exception as exc:
        logger.exception("Error al invocar el LLM: %s", exc)
        await _send_message(
            chat_id,
            "El servicio de IA no esta disponible en este momento. Intenta mas tarde.",
        )
        return

    # Fuentes
    fuente_reglamento = _construir_fuente_formateada(fragmentos)
    texto_fuentes = f"\n\n<b>Fuente:</b> {fuente_reglamento}"

    if proceso.ruta_anexo:
        url_anexo = _link_anexo(proceso.ruta_anexo)
        texto_fuentes += f'\n<b>Formato:</b> <a href="{url_anexo}">Descargar Formato Oficial (Word)</a>'

    await _send_message(chat_id, respuesta + texto_fuentes)


# ---------------------------------------------------------------------------
# Webhook principal
# ---------------------------------------------------------------------------

@router.post("/api/telegram/webhook")
async def telegram_webhook(
    request: Request, db: Session = Depends(get_db)
) -> dict[str, Any]:
    try:
        data = await request.json()
    except Exception:
        return {"ok": True}

    message = data.get("message") or data.get("edited_message")
    if not message:
        return {"ok": True}

    chat_id: int = message["chat"]["id"]
    text: str = (message.get("text") or "").strip()

    if not text:
        return {"ok": True}

    procesos = _listar_procesos(db)
    sesion = _sessions.setdefault(chat_id, {"codigo": None, "titulo": None})

    # ------------------------------------------------------------------
    # Comandos
    # ------------------------------------------------------------------
    if text in ("/start", "/inicio"):
        _sessions[chat_id] = {"codigo": None, "titulo": None}
        await _send_message(
            chat_id,
            "Hola, soy el <b>Asistente Academico ITIV - ESPE</b>.\n\n"
            "Puedo orientarte sobre los tramites academicos de la carrera "
            "Tecnologias de la Informacion en Linea (ITIV).\n\n"
            + _texto_lista_procesos(procesos),
        )
        return {"ok": True}

    if text in ("/procesos", "/menu"):
        _sessions[chat_id]["codigo"] = None
        _sessions[chat_id]["titulo"] = None
        await _send_message(chat_id, _texto_lista_procesos(procesos))
        return {"ok": True}

    if text in ("/limpiar", "/reset", "/nuevo"):
        _sessions[chat_id] = {"codigo": None, "titulo": None}
        await _send_message(
            chat_id,
            "Conversacion reiniciada.\n\n" + _texto_lista_procesos(procesos),
        )
        return {"ok": True}

    if text == "/ayuda":
        await _send_message(
            chat_id,
            "<b>Comandos disponibles:</b>\n\n"
            "/start — Iniciar el asistente\n"
            "/procesos — Ver la lista de tramites\n"
            "/limpiar — Reiniciar la conversacion\n"
            "/ayuda — Mostrar esta ayuda\n\n"
            "Para consultar, primero selecciona un tramite por numero o nombre "
            "y luego escribe tu pregunta libremente.",
        )
        return {"ok": True}

    # ------------------------------------------------------------------
    # Selección de proceso (si no hay uno activo o el texto parece un numero/titulo)
    # ------------------------------------------------------------------
    proceso_activo = None
    if sesion["codigo"]:
        proceso_activo = next(
            (p for p in procesos if p.codigo_proceso == sesion["codigo"]), None
        )

    # Intentar interpretar el mensaje como selección de proceso
    if not proceso_activo or text.isdigit() or len(text) < 15:
        seleccionado = _intentar_seleccionar_proceso(text, procesos)
        if seleccionado:
            _sessions[chat_id]["codigo"] = seleccionado.codigo_proceso
            _sessions[chat_id]["titulo"] = seleccionado.titulo
            pasos = "\n".join(
                f"{i}. {p}" for i, p in enumerate(seleccionado.flujo_pasos or [], 1)
            )
            await _send_message(
                chat_id,
                f"Has seleccionado: <b>{seleccionado.titulo}</b>\n\n"
                f"<b>Pasos generales:</b>\n{pasos}\n\n"
                "Ahora escribe tu consulta sobre este tramite.",
            )
            return {"ok": True}

    # ------------------------------------------------------------------
    # Sin proceso seleccionado y el texto no es selección reconocible
    # ------------------------------------------------------------------
    if not proceso_activo:
        await _send_message(
            chat_id,
            "Por favor, primero selecciona un tramite de la lista.\n\n"
            + _texto_lista_procesos(procesos),
        )
        return {"ok": True}

    # ------------------------------------------------------------------
    # Pregunta libre sobre el proceso activo
    # ------------------------------------------------------------------
    pregunta_limpia = re.sub(r"[^\w\s]", "", text.lower()).strip()
    saludos = {"hola", "buenas", "saludos", "buenos dias", "buenas tardes", "buenas noches"}
    despedidas = {"gracias", "muchas gracias", "ok", "entendido", "perfecto", "listo"}

    if pregunta_limpia in saludos:
        await _send_message(
            chat_id,
            f"Hola, estoy aqui para ayudarte con <b>{proceso_activo.titulo}</b>. "
            "Escribe tu consulta.",
        )
        return {"ok": True}

    if pregunta_limpia in despedidas:
        await _send_message(
            chat_id,
            "De nada. Si tienes otra duda, usa /procesos para seleccionar un tramite.",
        )
        return {"ok": True}

    await _responder_pregunta(chat_id, text, proceso_activo, db)
    return {"ok": True}


# ---------------------------------------------------------------------------
# Endpoint utilitario para registrar/consultar el webhook
# ---------------------------------------------------------------------------

@router.get("/api/telegram/set-webhook")
async def set_webhook(url: str) -> dict[str, Any]:
    """
    Registra la URL del webhook en Telegram.
    Llama este endpoint una sola vez al desplegar:
      GET /api/telegram/set-webhook?url=https://tu-dominio.com/api/telegram/webhook
    """
    token = _get_token()
    api_url = f"https://api.telegram.org/bot{token}/setWebhook"
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.post(api_url, json={"url": url})
    return resp.json()


@router.get("/api/telegram/webhook-info")
async def webhook_info() -> dict[str, Any]:
    """Consulta el estado actual del webhook registrado en Telegram."""
    token = _get_token()
    api_url = f"https://api.telegram.org/bot{token}/getWebhookInfo"
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.get(api_url)
    return resp.json()
