from unittest.mock import Mock, patch

import pytest

from app.ingestion.embeddings import EmbeddingProviderError, _load_model


def test_auto_selects_cuda_when_available() -> None:
    _load_model.cache_clear()
    torch = Mock()
    torch.cuda.is_available.return_value = True
    sentence_transformers = Mock()
    with (
        patch.dict("sys.modules", {"torch": torch, "sentence_transformers": sentence_transformers}),
        patch("app.ingestion.embeddings.get_settings") as settings,
    ):
        settings.return_value.embedding_device = "auto"
        settings.return_value.embedding_model = "test-model"
        settings.return_value.embedding_dimensions = 2
        settings.return_value.embedding_batch_size = 16
        _load_model()
    call = sentence_transformers.SentenceTransformer.call_args
    assert call.args == ("test-model",)
    assert call.kwargs["device"] == "cuda"
    assert call.kwargs["config_kwargs"] == {"vision_config": None, "audio_config": None}
    _load_model.cache_clear()


def test_explicit_cuda_fails_without_gpu() -> None:
    _load_model.cache_clear()
    torch = Mock()
    torch.cuda.is_available.return_value = False
    sentence_transformers = Mock()
    with (
        patch.dict("sys.modules", {"torch": torch, "sentence_transformers": sentence_transformers}),
        patch("app.ingestion.embeddings.get_settings") as settings,
    ):
        settings.return_value.embedding_device = "cuda"
        settings.return_value.embedding_dimensions = 2
        settings.return_value.embedding_batch_size = 16
        with pytest.raises(EmbeddingProviderError, match="CUDA"):
            _load_model()
    _load_model.cache_clear()
