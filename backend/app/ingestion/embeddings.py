import asyncio
from collections.abc import Sequence
from functools import lru_cache
from typing import Any

import httpx

from app.core.config import get_settings


class EmbeddingProviderError(RuntimeError):
    """Raised when the configured embedding provider cannot create vectors."""


@lru_cache(maxsize=1)
def _load_model() -> Any:
    """Load optional local EmbeddingGemma inference only when explicitly selected."""
    try:
        import torch
        from sentence_transformers import SentenceTransformer
    except ImportError as exc:
        raise EmbeddingProviderError(
            "Local embeddings require the 'local-embeddings' extra."
        ) from exc

    settings = get_settings()
    device = settings.embedding_device
    if device == "auto":
        device = "cuda" if torch.cuda.is_available() else "cpu"
    if device.startswith("cuda") and not torch.cuda.is_available():
        raise EmbeddingProviderError("CUDA was requested, but no CUDA-capable GPU is available.")
    dtype = (
        torch.bfloat16
        if device.startswith("cuda") and torch.cuda.is_bf16_supported()
        else torch.float32
    )
    try:
        return SentenceTransformer(
            settings.embedding_model,
            device=device,
            model_kwargs={"torch_dtype": dtype},
            config_kwargs={"vision_config": None, "audio_config": None},
        )
    except (OSError, RuntimeError, ValueError) as exc:
        raise EmbeddingProviderError(
            f"Unable to load embedding model '{settings.embedding_model}'."
        ) from exc


def _encode_local(texts: list[str], prompt_name: str) -> list[list[float]]:
    settings = get_settings()
    model = _load_model()
    try:
        embeddings = model.encode(
            texts,
            prompt_name=prompt_name,
            batch_size=settings.embedding_batch_size,
            normalize_embeddings=True,
            show_progress_bar=False,
            convert_to_tensor=True,
        )
    except (OSError, RuntimeError, ValueError) as exc:
        raise EmbeddingProviderError("The local embedding model failed during inference.") from exc
    vectors = embeddings.detach().cpu().tolist() if hasattr(embeddings, "detach") else embeddings
    if not isinstance(vectors, list) or len(vectors) != len(texts):
        raise EmbeddingProviderError("The local embedding model returned an invalid response.")
    _validate_dimensions(vectors)
    return vectors


def _format_api_text(text: str, prompt_name: str) -> str:
    if prompt_name == "SearchQuery":
        return f"task: search result | query: {text}"
    if prompt_name == "Document":
        return f"title: none | text: {text}"
    return text


async def _embed_api(texts: list[str], prompt_name: str) -> list[list[float]]:
    settings = get_settings()
    if not settings.embedding_api_url:
        raise EmbeddingProviderError(
            "DEVPILOT_EMBEDDING_API_URL must be configured when embedding_provider=api."
        )
    if not settings.embedding_api_key:
        raise EmbeddingProviderError(
            "DEVPILOT_EMBEDDING_API_KEY must be configured when embedding_provider=api."
        )

    headers = {
        "Content-Type": "application/json",
        "x-goog-api-key": settings.embedding_api_key,
    }
    try:
        async with httpx.AsyncClient(timeout=settings.embedding_timeout_seconds) as client:
            responses = await asyncio.gather(
                *(
                    client.post(
                        settings.embedding_api_url,
                        json={
                            "model": f"models/{settings.embedding_model}",
                            "content": {
                                "parts": [{"text": _format_api_text(text, prompt_name)}]
                            },
                            "outputDimensionality": settings.embedding_dimensions,
                        },
                        headers=headers,
                    )
                    for text in texts
                )
            )
            vectors: list[list[float]] = []
            for response in responses:
                response.raise_for_status()
                body = response.json()
                values = None
                if isinstance(body, dict):
                    embedding = body.get("embedding")
                    if isinstance(embedding, dict):
                        values = embedding.get("values")
                    if values is None:
                        embeddings = body.get("embeddings")
                        values = embeddings[0].get("values") if embeddings else None
                if not isinstance(values, list):
                    raise EmbeddingProviderError(
                        "The Gemini Embeddings API returned an invalid response."
                    )
                vectors.append(values)
    except (httpx.HTTPError, ValueError, TypeError, IndexError) as exc:
        raise EmbeddingProviderError("The Gemini Embeddings API request failed.") from exc
    _validate_dimensions(vectors)
    return vectors


def _validate_dimensions(vectors: list[list[float]]) -> None:
    dimensions = get_settings().embedding_dimensions
    if any(len(vector) != dimensions for vector in vectors):
        raise EmbeddingProviderError("The embedding vector dimensions do not match configuration.")


async def embed_texts(
    texts: Sequence[str],
    prompt_name: str = "Document",
) -> list[list[float]]:
    values = list(texts)
    if not values:
        return []
    settings = get_settings()
    if settings.embedding_provider == "api":
        return await _embed_api(values, prompt_name)
    if settings.embedding_provider == "gemma":
        return await asyncio.to_thread(_encode_local, values, prompt_name)
    raise EmbeddingProviderError(
        "DEVPILOT_EMBEDDING_PROVIDER must be either 'api' or 'gemma'."
    )
