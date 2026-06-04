import sys
from pathlib import Path

# Asegurar que el paquete 'app' se pueda importar cuando se ejecuta desde scripts/
sys.path.append(str(Path(__file__).resolve().parents[1]))

from backend.app.services.chroma_service import guardar_texto, buscar_contexto


def main():
    texto = (
        "Primer párrafo de prueba sobre gatos y mascotas.\n\n"
        "Segundo párrafo que menciona perros y ejemplos de texto para indexar."
    )

    print("Guardando texto de prueba...")
    ids = guardar_texto(texto, "testdoc1")
    print("IDs creados:", ids)

    consulta = "gatos"
    print(f"Buscando contexto para: {consulta}")
    resultados = buscar_contexto(consulta, n_results=3)
    print("Resultados:")
    for i, r in enumerate(resultados):
        print(i + 1, r[:200])


if __name__ == '__main__':
    main()
