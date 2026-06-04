from app.services.llm_service import construir_prompt, generar_respuesta


def test_generar_respuesta_con_contexto_y_runner_simulado():
    def fake_runner(prompt: str) -> str:
        assert "CONTEXTO:" in prompt
        assert "PREGUNTA:" in prompt
        return "La respuesta esta en el contexto."

    out = generar_respuesta(
        "Que tema trata el documento?",
        ["El documento trata sobre evaluacion multicultural en software."],
        model_runner=fake_runner,
    )

    assert out == "La respuesta esta en el contexto."


def test_generar_respuesta_sin_contexto():
    out = generar_respuesta("Que dice?", "")
    assert out == "No tengo suficiente informacion"


def test_prompt_contiene_contexto_y_pregunta():
    prompt = construir_prompt("Pregunta", ["Bloque 1", "Bloque 2"])
    assert "Bloque 1" in prompt
    assert "Bloque 2" in prompt
    assert "Pregunta" in prompt
