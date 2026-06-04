import json
import os
from typing import Callable, Iterable, Optional, Union
from urllib import request

from app.config import (
    CARRERA_NOMBRE,
    UNIVERSIDAD_NOMBRE,
    PROCESOS_SOPORTADOS,
    DIRECTOR_NOMBRE,
    DIRECTOR_CORREO,
)

# Saludos reconocidos (frases cortas)
_SALUDOS = {"hola", "buenos días", "buenos dias", "buenas tardes", "buenas noches", "buenas", "buen día", "buen dia", "buenas días"}


def _normalizar_contexto(contexto: Union[str, Iterable[str]]) -> str:
    if isinstance(contexto, str):
        return contexto.strip()

    parts = [str(item).strip() for item in contexto if str(item).strip()]
    return "\n\n".join(parts).strip()


# ==========================================
# 1. EL ENRUTADOR (ROUTER / CLASIFICADOR CON FEW-SHOT)
# ==========================================
def clasificar_intencion(pregunta: str, runner: Callable[[str, str], str]) -> str:
    """Clasificador blindado usando ejemplos explícitos (Few-Shot Prompting)."""
    system_prompt = (
        "Eres un clasificador binario estricto. Analiza la pregunta y responde ÚNICAMENTE con el número del proceso (1 al 8) o la palabra OTRO.\n\n"
        "PROCESOS VÁLIDOS:\n"
        "1. Retiro por caso fortuito o fuerza mayor\n"
        "2. Retiro Voluntario\n"
        "3. Reconocimiento/Homologación de asignaturas\n"
        "4. Cambio de sede, carrera o de Institución Educativa Superior\n"
        "5. Legalización de documentos\n"
        "6. Solicitud de Reingreso\n"
        "7. Solicitud de entrega de artefactos fuera del plazo\n"
        "8. Solicitud de recalificación de evaluaciones\n\n"
        "REGLAS DE RECHAZO (DEBES RESPONDER 'OTRO' PARA ESTOS TEMAS):\n"
        "- Intercambios culturales o internacionales.\n"
        "- Pasantías o prácticas preprofesionales.\n"
        "- Becas, ayudas económicas o problemas financieros.\n"
        "- Titulación o graduación.\n\n"
        "EJEMPLOS DE COMPORTAMIENTO (APRENDE DE ESTO):\n"
        "Q: 'quiero retirarme porque me enfermé'\n"
        "A: 1\n"
        "Q: 'voy a hacer un intercambio cultural internacional'\n"
        "A: OTRO\n"
        "Q: 'necesito homologar la materia de bases de datos'\n"
        "A: 3\n"
        "Q: 'cómo aplico a una beca de la universidad'\n"
        "A: OTRO\n"
        "Q: 'el profesor me calificó mal'\n"
        "A: 8\n"
    )
    
    # Formato estricto para forzar la respuesta
    user_content = f"Q: '{pregunta}'\nA:"

    try:
        # Usamos el runner inyectado para respetar si estamos en local o cloud
        respuesta_clasificacion = runner(system_prompt, user_content).strip().upper()
        return respuesta_clasificacion
    except Exception as e:
        print(f"⚠️ Error en el clasificador: {e}")
        return "OTRO"  # Fallback seguro: si falla, bloqueamos la consulta.


# ==========================================
# 2. PROMPT DEL SISTEMA PRINCIPAL (RAG ANTI-SANGRADO)
# ==========================================
def obtener_system_prompt() -> str:
    """Prompt enfocado en citas naturales y prohibición absoluta de código/XML."""
    procesos_lista = "\n".join(f"- {proceso}" for proceso in PROCESOS_SOPORTADOS)
    
    return (
        f"Eres un asistente académico estrictamente regulado de la carrera de {CARRERA_NOMBRE} en la {UNIVERSIDAD_NOMBRE}.\n"
        f"Tu ÚNICA función es asistir en estos 8 procesos oficiales:\n{procesos_lista}\n\n"
        "INSTRUCCIONES DE RESPUESTA (CUMPLIMIENTO OBLIGATORIO):\n"
        "1. BASADO EN EVIDENCIA: Responde usando ÚNICAMENTE la información contenida dentro del contexto provisto.\n"
        "2. CITA NATURAL (ANTI-CÓDIGO): Está ESTRICTAMENTE PROHIBIDO incluir en tu respuesta final caracteres especiales como < > o palabras como 'DOCUMENTO', 'id=', o 'XML'.\n"
        "   -> INCORRECTO: 'Como dice el <DOCUMENTO id=\"2\">...'\n"
        "   -> CORRECTO: 'De acuerdo al reglamento interno de la universidad...'\n"
        "3. NO ALUCINAR ACCIONES: No sugieras al usuario 'visitar la página web' ni 'buscar en otro lado' si el reglamento no lo dice explícitamente.\n"
        "4. PRECISIÓN: Si el reglamento dice algo, resúmelo con un tono humano, empático y formal, pero no alteres los plazos ni los requisitos."
    )


# ==========================================
# 3. CONEXIONES CON EL LLM (OLLAMA / CLOUD)
# ==========================================
def _invocar_mistral_local(system_prompt: str, user_content: str) -> str:
    """Invoca el endpoint local de OLLAMA usando la estructura nativa de CHAT."""
    api_url = os.getenv("MISTRAL_API_URL", "http://localhost:11434/api/chat")
    model = os.getenv("MISTRAL_MODEL", "mistral")

    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_content}
        ],
        "stream": False,
        "options": {
            "temperature": 0.0  # Precisión matemática
        }
    }

    req = request.Request(
        api_url,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    with request.urlopen(req, timeout=30) as resp:
        body = resp.read().decode("utf-8")
        data = json.loads(body)
        message = data.get("message", {})
        return str(message.get("content", "")).strip()


def _invocar_mistral_api(system_prompt: str, user_content: str) -> str:
    """Invoca la API oficial de Mistral Cloud respetando la separación de roles."""
    api_key = os.getenv("MISTRAL_API_KEY", "").strip()
    if not api_key:
        raise RuntimeError("MISTRAL_API_KEY no configurada")

    api_url = os.getenv("MISTRAL_API_URL", "https://api.mistral.ai/v1/chat/completions")
    model = os.getenv("MISTRAL_MODEL", "mistral-small-latest")

    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_content}
        ],
        "temperature": 0.0,
    }

    req = request.Request(
        api_url,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}",
        },
        method="POST",
    )

    with request.urlopen(req, timeout=30) as resp:
        body = resp.read().decode("utf-8")
        data = json.loads(body)
        choices = data.get("choices", [])
        if not choices:
            return ""
        message = choices[0].get("message", {})
        return str(message.get("content", "")).strip()


def _invocar_modelo(system_prompt: str, user_content: str) -> str:
    """Decide de manera transparente el backend de inferencia según la API Key."""
    if os.getenv("MISTRAL_API_KEY", "").strip():
        return _invocar_mistral_api(system_prompt, user_content)
    return _invocar_mistral_local(system_prompt, user_content)


# ==========================================
# 4. ORQUESTADOR PRINCIPAL
# ==========================================
def generar_respuesta(
    pregunta: str,
    contexto: Union[str, Iterable[str]],
    model_runner: Optional[Callable[[str, str], str]] = None,
) -> str:
    """Orquestador principal del flujo del Chatbot."""
    if not pregunta or not pregunta.strip():
        return "No tengo suficiente informacion"

    # 1. Intercepción de saludos comunes
    pregunta_limpia = pregunta.strip().lower()
    if pregunta_limpia in _SALUDOS:
        procesos_formateados = ", ".join(PROCESOS_SOPORTADOS)
        return f"Hola, ¿en qué proceso necesita ayuda? Puedo asistirle con: {procesos_formateados}."

    runner = model_runner or _invocar_modelo

    # 2. EL CORTAFUEGOS: Clasificación de intención antes del RAG
    print(f"🔍 Evaluando intención para: '{pregunta.strip()}'")
    intencion = clasificar_intencion(pregunta, runner)
    print(f"🎯 Resultado del enrutador: {intencion}")
    
    # Si el LLM detecta que no pertenece a los 8 procesos, cortamos el flujo aquí mismo.
    if "OTRO" in intencion or not any(char.isdigit() for char in intencion):
        return f"Este proceso no está disponible en el presente chatbot. Para obtener ayuda, contacte al director de carrera en: {DIRECTOR_CORREO}"

    # 3. SI PASA EL FILTRO, PROCEDEMOS A GENERAR LA RESPUESTA BASADA EN CONTEXTO
    contexto_texto = _normalizar_contexto(contexto)
    
    system_prompt = obtener_system_prompt()
    user_content = f"CONTEXTO INSTITUCIONAL:\n{contexto_texto}\n\nPREGUNTA DEL ESTUDIANTE:\n{pregunta.strip()}"

    try:
        respuesta = runner(system_prompt, user_content).strip()
    except Exception as e:
        print(f"⚠️ Error en el pipeline de inferencia RAG: {e}")
        return f"No tengo suficiente información. Para obtener ayuda específica sobre este tema, contacte al director de carrera en: {DIRECTOR_CORREO}"

    if not respuesta:
        return f"No tengo suficiente información. Para obtener ayuda específica sobre este tema, contacte al director de carrera en: {DIRECTOR_CORREO}"

    return respuesta