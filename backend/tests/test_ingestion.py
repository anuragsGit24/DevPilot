from io import BytesIO

import pytest
from docx import Document

from app.ingestion.extractor import extract_requirements
from app.ingestion.parsers import DocumentParseError, parse_document
from app.ingestion.validation import UploadValidationError, validate_upload


def test_parses_text_and_normalizes_whitespace() -> None:
    document = parse_document(
        b"  The system shall authenticate users.  \r\n\n",
        "requirements.txt",
        "text/plain",
    )
    assert document.text == "The system shall authenticate users."


def test_parses_minimal_docx() -> None:
    content = BytesIO()
    document = Document()
    document.add_paragraph("The system must encrypt data.")
    document.save(content)
    parsed = parse_document(content.getvalue(), "requirements.docx")
    assert parsed.text == "The system must encrypt data."


def test_rejects_unsupported_and_empty_uploads() -> None:
    with pytest.raises(UploadValidationError):
        validate_upload("requirements.exe", "application/octet-stream", 10)
    with pytest.raises(DocumentParseError):
        parse_document(b"", "requirements.txt")


def test_extracts_atomic_requirements_with_classification() -> None:
    requirements = extract_requirements(
        "- The system shall authenticate users.\n"
        "- The API must encrypt passwords.\n"
        "- The dashboard should have low latency."
    )
    assert [item.requirement_key for item in requirements] == ["REQ-001", "REQ-002", "REQ-003"]
    assert requirements[0].category.value == "security"
    assert requirements[1].category.value == "security"
    assert requirements[2].priority.value == "should"
