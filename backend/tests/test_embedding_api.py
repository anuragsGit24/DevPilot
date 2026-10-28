from unittest.mock import AsyncMock, Mock, patch

import pytest

from app.ingestion.embeddings import EmbeddingProviderError, _embed_api


@pytest.mark.asyncio
async def test_api_provider_returns_valid_vectors() -> None:
    response = Mock()
    response.json.return_value = {"embedding": {"values": [0.1, 0.2]}}
    response.raise_for_status.return_value = None
    client = AsyncMock()
    client.post.return_value = response
    with patch("app.ingestion.embeddings.get_settings") as settings:
        settings.return_value.embedding_api_url = (
            "https://generativelanguage.googleapis.com/v1beta/models/"
            "gemini-embedding-2:embedContent"
        )
        settings.return_value.embedding_api_key = "test-key"
        settings.return_value.embedding_model = "gemini-embedding-2"
        settings.return_value.embedding_dimensions = 2
        settings.return_value.embedding_timeout_seconds = 30
        with patch("app.ingestion.embeddings.httpx.AsyncClient") as client_type:
            client_type.return_value.__aenter__.return_value = client
            assert await _embed_api(["hello"], "Document") == [[0.1, 0.2]]
    client.post.assert_awaited_once()


@pytest.mark.asyncio
async def test_api_provider_requires_url() -> None:
    with patch("app.ingestion.embeddings.get_settings") as settings:
        settings.return_value.embedding_api_url = "https://embedding.test"
        settings.return_value.embedding_api_key = None
        with pytest.raises(EmbeddingProviderError, match="API_KEY"):
            await _embed_api(["hello"], "Document")
