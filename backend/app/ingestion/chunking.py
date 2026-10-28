from dataclasses import dataclass


@dataclass(frozen=True)
class TextChunk:
    index: int
    content: str
    token_count: int


def chunk_text(text: str, max_tokens: int = 500, overlap_tokens: int = 50) -> list[TextChunk]:
    if max_tokens <= 0:
        raise ValueError("max_tokens must be positive.")
    if overlap_tokens < 0 or overlap_tokens >= max_tokens:
        raise ValueError("overlap_tokens must be non-negative and smaller than max_tokens.")

    words = text.split()
    if not words:
        return []
    step = max_tokens - overlap_tokens
    chunks: list[TextChunk] = []
    for index, start in enumerate(range(0, len(words), step)):
        content_words = words[start : start + max_tokens]
        if not content_words:
            break
        chunks.append(TextChunk(index, " ".join(content_words), len(content_words)))
        if start + max_tokens >= len(words):
            break
    return chunks
