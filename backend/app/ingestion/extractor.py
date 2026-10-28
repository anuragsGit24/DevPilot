import re
from dataclasses import dataclass

from app.models import MoSCoWPriority, RequirementCategory


@dataclass(frozen=True)
class ExtractedRequirement:
    requirement_key: str
    title: str
    description: str
    category: RequirementCategory
    priority: MoSCoWPriority


_REQUIREMENT_MARKER = re.compile(
    r"(?i)\b(?:shall|must|required to|should|could|won't|will)\b"
)
_BULLET = re.compile(r"^\s*(?:[-*+]|\d+[.)])\s+")


def extract_requirements(text: str) -> list[ExtractedRequirement]:
    candidates: list[str] = []
    for paragraph in text.splitlines():
        is_bullet = bool(_BULLET.match(paragraph))
        cleaned = _BULLET.sub("", paragraph).strip()
        if cleaned and (is_bullet or _looks_like_requirement(cleaned)):
            candidates.extend(_split_atomic_requirements(cleaned))

    requirements: list[ExtractedRequirement] = []
    for index, description in enumerate(candidates, start=1):
        priority = _priority_for(description)
        requirements.append(
            ExtractedRequirement(
                requirement_key=f"REQ-{index:03d}",
                title=_title_for(description),
                description=description,
                category=_category_for(description),
                priority=priority,
            )
        )
    return requirements


def _looks_like_requirement(value: str) -> bool:
    return bool(_REQUIREMENT_MARKER.search(value) or _BULLET.search(value))


def _split_atomic_requirements(value: str) -> list[str]:
    parts = re.split(r"(?<=[.!?])\s+(?=[A-Z0-9])", value)
    return [part.strip() for part in parts if len(part.strip()) >= 12]


def _title_for(description: str) -> str:
    title = re.sub(r"(?i)^(the system|the application|users?)\s+(shall|must|should|could)\s+", "", description)
    return title[:300].rstrip(".")


def _priority_for(description: str) -> MoSCoWPriority:
    value = description.lower()
    if "won't" in value or "wont" in value:
        return MoSCoWPriority.wont
    if "must" in value or "shall" in value or "required" in value:
        return MoSCoWPriority.must
    if "should" in value:
        return MoSCoWPriority.should
    return MoSCoWPriority.could


def _category_for(description: str) -> RequirementCategory:
    value = description.lower()
    keyword_groups = (
        (RequirementCategory.security, ("security", "authenticate", "authorize", "encrypt", "password")),
        (RequirementCategory.performance, ("latency", "performance", "response time", "throughput", "scale")),
        (RequirementCategory.usability, ("accessible", "usability", "intuitive", "screen reader")),
    )
    for category, keywords in keyword_groups:
        if any(keyword in value for keyword in keywords):
            return category
    if any(keyword in value for keyword in ("shall", "must", "should", "could", "will")):
        return RequirementCategory.functional
    return RequirementCategory.other
