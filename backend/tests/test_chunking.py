import pytest

from app.ingestion.chunking import chunk_text


def test_chunks_text_with_configured_overlap() -> None:
    chunks = chunk_text(" ".join(f"word-{index}" for index in range(120)), max_tokens=50, overlap_tokens=10)
    assert len(chunks) == 3
    assert chunks[0].token_count == 50
    assert chunks[1].content.split()[0] == "word-40"
    assert chunks[-1].content.split()[-1] == "word-119"


def test_rejects_invalid_chunk_configuration() -> None:
    with pytest.raises(ValueError):
        chunk_text("text", max_tokens=0)
    with pytest.raises(ValueError):
        chunk_text("text", max_tokens=10, overlap_tokens=10)
