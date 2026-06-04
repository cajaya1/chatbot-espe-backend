from typing import Optional

from pydantic import BaseModel


class ChatRequest(BaseModel):
    pregunta: str
    codigo_proceso: str


class ChatResponse(BaseModel):
    respuesta: str
    fuentes: Optional[list] = None