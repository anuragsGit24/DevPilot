from unittest.mock import Mock, patch

import pytest

from app.ingestion.embeddings import EmbeddingProviderError, _encode_local, _load_model


def test_local_encoder_returns_configured_vectors() -> None:
    model = Mock()
    model.encode.return_value = [[0.6, 0.8]]
    with patch("app.ingestion.embeddings.get_settings") as settings:
        settings.return_value.embedding_dimensions = 2
        settings.return_value.embedding_model = "test-model"
        settings.return_value.embedding_device = "cpu"
        settings.return_value.embedding_batch_size = 16
        with patch("app.ingestion.embeddings._load_model", return_value=model):
            assert _encode_local(["requirement"], "Document") == [[0.6, 0.8]]
    model.encode.assert_called_once()


def test_local_encoder_rejects_wrong_dimensions() -> None:
    model = Mock()
    model.encode.return_value = [[0.6, 0.8]]
    with patch("app.ingestion.embeddings.get_settings") as settings:
        settings.return_value.embedding_dimensions = 3
        with patch("app.ingestion.embeddings._load_model", return_value=model), pytest.raises(
            EmbeddingProviderError, match="dimensions"
        ):
            _encode_local(["requirement"], "Document")


def test_model_load_failure_is_explicit() -> None:
    _load_model.cache_clear()
    with patch("app.ingestion.embeddings.get_settings") as settings:
        settings.return_value.embedding_model = "missing-model"
        settings.return_value.embedding_device = "cpu"
        with patch(
            "sentence_transformers.SentenceTransformer",
            side_effect=OSError("missing"),
        ), pytest.raises(EmbeddingProviderError, match="Unable to load"):
            _load_model()
    _load_model.cache_clear()
