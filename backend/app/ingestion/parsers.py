from dataclasses import dataclass
from io import BytesIO
from pathlib import Path

from docx import Document
from pypdf import PdfReader

SUPPORTED_EXTENSIONS = frozenset({".pdf", ".docx", ".txt", ".md", ".markdown"})


@dataclass(frozen=True)
class ParsedDocument:
    text: str
    filename: str
    content_type: str | None
    page_count: int | None = None


class DocumentParseError(ValueError):
    """Raised when a supported document cannot be read or contains no text."""


def parse_document(
    content: bytes,
    filename: str,
    content_type: str | None = None,
) -> ParsedDocument:
    suffix = Path(filename).suffix.lower()
    if suffix not in SUPPORTED_EXTENSIONS:
        raise DocumentParseError(f"Unsupported document type: '{suffix or 'unknown'}'.")
    if not content:
        raise DocumentParseError("The uploaded document is empty.")

    try:
        if suffix == ".pdf":
            reader = PdfReader(BytesIO(content))
            text = "\n".join(page.extract_text() or "" for page in reader.pages)
            page_count = len(reader.pages)
        elif suffix == ".docx":
            document = Document(BytesIO(content))
            text = "\n".join(paragraph.text for paragraph in document.paragraphs)
            page_count = None
        else:
            text = content.decode("utf-8-sig")
            page_count = None
    except (UnicodeDecodeError, OSError, ValueError) as exc:
        raise DocumentParseError("The uploaded document could not be read.") from exc

    normalized_text = _normalize_text(text)
    if not normalized_text:
        raise DocumentParseError("The uploaded document contains no readable text.")
    return ParsedDocument(
        text=normalized_text,
        filename=filename,
        content_type=content_type,
        page_count=page_count,
    )


def _normalize_text(text: str) -> str:
    return "\n".join(line.strip() for line in text.replace("\r\n", "\n").split("\n") if line.strip())
