from pathlib import Path

from app.core.config import get_settings
from app.ingestion.parsers import SUPPORTED_EXTENSIONS


class UploadValidationError(ValueError):
    """Raised when an uploaded file violates ingestion limits."""


def validate_upload(filename: str | None, content_type: str | None, size: int) -> None:
    if not filename or not Path(filename).suffix:
        raise UploadValidationError("A filename with a supported extension is required.")
    if Path(filename).suffix.lower() not in SUPPORTED_EXTENSIONS:
        supported = ", ".join(sorted(SUPPORTED_EXTENSIONS))
        raise UploadValidationError(f"Unsupported file type. Supported extensions: {supported}.")
    if size <= 0:
        raise UploadValidationError("The uploaded file is empty.")
    if size > get_settings().requirements_max_upload_bytes:
        raise UploadValidationError(
            f"The uploaded file exceeds the {get_settings().requirements_max_upload_bytes} byte limit."
        )
    if content_type and not content_type.startswith(("application/", "text/")):
        raise UploadValidationError("The uploaded file has an unsupported content type.")
