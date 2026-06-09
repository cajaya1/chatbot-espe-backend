import os
from dotenv import load_dotenv

load_dotenv()

# Información de la carrera
CARRERA_NOMBRE = os.getenv("CARRERA_NOMBRE", "Tecnologías de la Información en Línea (ITIV)")
UNIVERSIDAD_NOMBRE = os.getenv("UNIVERSIDAD_NOMBRE", "Universidad de las Fuerzas Armadas (ESPE)")

# Procesos soportados por el chatbot
PROCESOS_SOPORTADOS = [
    "Retiro voluntario",
    "Retiro por caso fortuito/fuerza mayor",
    "Cambio de carrera, sede o IES (Institución Educativa Superior)",
    "Reingreso",
    "Homologación",
    "Legalización de documentos",
    "Solicitudes de calificación de trabajos atrasados",
    "Solicitudes de recalificación de evaluaciones",
]

# Telegram Bot
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")

# Información del director de carrera
DIRECTOR_NOMBRE = os.getenv("DIRECTOR_NOMBRE", "Director de Carrera")
DIRECTOR_CORREO = os.getenv("DIRECTOR_CORREO", "dmmarcillo@espe.edu.ec")
