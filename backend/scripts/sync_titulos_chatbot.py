"""Script de mantenimiento de ÚNICA EJECUCIÓN por entorno.

Corrige el título de dos procesos académicos y reindexa su contexto en ChromaDB
para que el asistente virtual (chatbot) refleje los nombres actualizados.

Qué hace (idempotente):
  1. Actualiza en la base de datos el título de los procesos PROC-04 y PROC-07
     (si aún tienen el texto anterior). En producción, esa base de datos es la
     de Supabase, por lo que ejecutarlo allí actualiza Supabase.
  2. Reindexa el contexto de esos procesos en ChromaDB con el nuevo título, de
     modo que las respuestas del chatbot usen el nombre correcto.

IMPORTANTE: este script NO está conectado al arranque ni al pipeline de
despliegue. No se ejecuta en cada push: hay que invocarlo manualmente UNA vez
por entorno (una vez en local y una vez en el backend de producción).

Uso (desde la carpeta backend/, con las dependencias instaladas):

    python -m scripts.sync_titulos_chatbot
"""

from app.core.database import SessionLocal
from app.models.proceso_academico import ProcesoAcademico
from app.services.chroma_service import upsert_contexto_proceso

# Código de proceso -> título correcto que debe quedar en la BD y en el índice.
CORRECCIONES = {
    "PROC-04": "Cambio de sede, carrera o IES (Institución de Educación Superior)",
    "PROC-07": "Entrega de evaluaciones/trabajos fuera del plazo límite",
}


def main() -> None:
    db = SessionLocal()
    try:
        for codigo, titulo_correcto in CORRECCIONES.items():
            proceso = (
                db.query(ProcesoAcademico)
                .filter(
                    ProcesoAcademico.codigo_proceso == codigo,
                    ProcesoAcademico.es_actual.is_(True),
                )
                .first()
            )

            if not proceso:
                print(f"[omitido] No existe un proceso vigente con código {codigo}")
                continue

            # 1. Corrige el título en la base de datos (Supabase en producción).
            if proceso.titulo != titulo_correcto:
                print(f"[bd] {codigo}: '{proceso.titulo}' -> '{titulo_correcto}'")
                proceso.titulo = titulo_correcto
                db.commit()
                db.refresh(proceso)
            else:
                print(f"[bd] {codigo}: el título ya estaba actualizado")

            # 2. Reindexa el contexto del proceso en ChromaDB con el título nuevo.
            upsert_contexto_proceso(
                proceso.contexto_legal,
                proceso.codigo_proceso,
                titulo=proceso.titulo,
                flujo_pasos=proceso.flujo_pasos,
            )
            print(f"[chroma] reindexado {codigo}")

        print("Sincronización completada.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
