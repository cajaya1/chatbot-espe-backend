from backend.app.services import chroma_service


class DummyCollection:
    def __init__(self):
        self.add_calls = []

    def add(self, ids, documents, metadatas, embeddings):
        self.add_calls.append(
            {
                "ids": ids,
                "documents": documents,
                "metadatas": metadatas,
                "embeddings": embeddings,
            }
        )

    def query(self, query_embeddings, n_results, include):
        return {"documents": [["frag 1", "frag 2", "frag 3"]]}


def test_chunk_text_splits_paragraphs():
    text = "Parrafo uno.\n\nParrafo dos."
    chunks = chroma_service._chunk_text(text)
    assert len(chunks) == 2


def test_guardar_texto_creates_ids_and_metadata(monkeypatch):
    collection = DummyCollection()
    monkeypatch.setattr(chroma_service, "_get_collection", lambda name="documentos": collection)
    monkeypatch.setattr(chroma_service, "_embed_texts", lambda texts: [[0.1, 0.2] for _ in texts])

    ids = chroma_service.guardar_texto("texto de prueba\n\notro bloque", "doc-a")

    assert len(ids) == 2
    assert collection.add_calls
    call = collection.add_calls[0]
    assert all(i.startswith("doc-a-") for i in call["ids"])
    assert all(m["id_doc"] == "doc-a" for m in call["metadatas"])


def test_buscar_contexto_returns_top3(monkeypatch):
    collection = DummyCollection()
    monkeypatch.setattr(chroma_service, "_get_collection", lambda name="documentos": collection)
    monkeypatch.setattr(chroma_service, "_embed_texts", lambda texts: [[0.1, 0.2] for _ in texts])

    result = chroma_service.buscar_contexto("pregunta")

    assert result == ["frag 1", "frag 2", "frag 3"]
