from pathlib import Path


def leer_pdf(ruta) -> str:
    """Lee un PDF y retorna todo su texto concatenado.

    Parámetros:
        ruta: ruta al archivo (str o Path).

    Retorna:
        Texto completo extraído del PDF.

    Excepciones:
        ValueError: si el archivo no existe o está vacío o no contiene texto extraíble.
        RuntimeError: si falla la lectura por un error de librería o formato.
    """
    file_path = Path(ruta)

    if not file_path.exists():
        raise ValueError(f"Archivo no encontrado: {file_path}")

    if file_path.stat().st_size == 0:
        raise ValueError("Archivo vacío")

    try:
        from pypdf import PdfReader
    except Exception as exc:
        raise RuntimeError("Dependencia 'pypdf' no encontrada. Instala 'pypdf'") from exc

    try:
        reader = PdfReader(str(file_path))
        text_parts = []
        for page in reader.pages:
            page_text = page.extract_text()
            if page_text:
                text_parts.append(page_text)

        full_text = "\n".join(text_parts).strip()
    except Exception as exc:
        raise RuntimeError("Error al leer el PDF") from exc

    if not full_text:
        raise ValueError("PDF sin texto extraíble")

    return full_text

