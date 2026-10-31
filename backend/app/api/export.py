"""Export Hub API Router - Multi-format ZIP artifact bundle export.

Assigned to Engineer 5:
- Multi-format exporter: Markdown documentation bundle, Gherkin .feature files,
  OpenAPI 3.1 YAML/JSON, and formatted ZIP bundle.
- Endpoint: POST /api/v1/projects/{id}/export/zip
"""

from __future__ import annotations

import io
import json
import uuid
import zipfile
from typing import Any

from fastapi import APIRouter, HTTPException, Request, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy import select

from app.api.deps import CurrentUser, DbSession, verify_project_access
from app.models import Artifact, ArtifactType, ArtifactVersion, Project, Requirement, WorkItem

router = APIRouter(prefix="/projects/{project_id}/export", tags=["export"])


class ExportRequest(BaseModel):
    formats: list[str] = Field(
        default=["markdown", "gherkin", "openapi_yaml", "openapi_json", "zip"],
        description="List of requested formats to include in the bundle",
    )


def _dict_to_yaml(data: Any, indent: int = 0) -> str:
    """Minimal deterministic YAML serializer for OpenAPI specification export."""
    lines: list[str] = []
    pad = "  " * indent

    if isinstance(data, dict):
        for key, val in data.items():
            if isinstance(val, (dict, list)):
                lines.append(f"{pad}{key}:")
                lines.append(_dict_to_yaml(val, indent + 1))
            else:
                formatted_val = (
                    json.dumps(val)
                    if isinstance(val, str) and any(c in val for c in ':#{}[]|>&*!%@`"\n')
                    else ("null" if val is None else str(val).lower() if isinstance(val, bool) else str(val))
                )
                lines.append(f"{pad}{key}: {formatted_val}")
    elif isinstance(data, list):
        for item in data:
            if isinstance(item, (dict, list)):
                lines.append(f"{pad}-")
                lines.append(_dict_to_yaml(item, indent + 1))
            else:
                formatted_item = (
                    json.dumps(item)
                    if isinstance(item, str) and any(c in item for c in ':#{}[]|>&*!%@`"\n')
                    else ("null" if item is None else str(item).lower() if isinstance(item, bool) else str(item))
                )
                lines.append(f"{pad}- {formatted_item}")
    else:
        return f"{pad}{data}"

    return "\n".join(lines)


@router.post("/zip")
async def export_project_zip(
    request: Request,
    project_id: uuid.UUID,
    payload: ExportRequest,
    current_user: CurrentUser,
    session: DbSession,
) -> StreamingResponse:
    """Export all project specifications, user stories, acceptance criteria, test suites,
    and API definitions as a comprehensive multi-format ZIP bundle.
    """
    await verify_project_access(project_id, current_user, session, "artifacts:view")

    # 0. Fetch Project Metadata
    proj_stmt = select(Project).where(Project.id == project_id)
    proj_res = await session.execute(proj_stmt)
    project = proj_res.scalar_one_or_none()
    project_name = project.name if project else f"Project {project_id}"

    # 1. Fetch Ingested & Atomic Requirements
    req_stmt = (
        select(Requirement)
        .where(Requirement.project_id == project_id)
        .order_by(Requirement.requirement_key.asc())
    )
    req_res = await session.execute(req_stmt)
    db_requirements = req_res.scalars().all()

    # Also check work items for requirements if any
    wi_req_stmt = select(WorkItem).where(
        WorkItem.project_id == project_id, WorkItem.record_type == "requirement"
    )
    wi_req_res = await session.execute(wi_req_stmt)
    wi_requirements = wi_req_res.scalars().all()

    # 2. Fetch Generated Artifacts & latest versions
    art_stmt = (
        select(Artifact)
        .where(Artifact.project_id == project_id)
        .order_by(Artifact.created_at.desc())
    )
    art_res = await session.execute(art_stmt)
    db_artifacts = art_res.scalars().all()

    latest_versions_by_type: dict[str, dict[str, Any]] = {}
    for art in db_artifacts:
        ver_stmt = (
            select(ArtifactVersion)
            .where(ArtifactVersion.artifact_id == art.id)
            .order_by(ArtifactVersion.version_number.desc())
            .limit(1)
        )
        ver_res = await session.execute(ver_stmt)
        latest_ver = ver_res.scalar_one_or_none()
        if latest_ver and isinstance(latest_ver.payload, dict):
            type_str = art.artifact_type.value if hasattr(art.artifact_type, "value") else str(art.artifact_type)
            if type_str not in latest_versions_by_type:
                latest_versions_by_type[type_str] = latest_ver.payload

    # 3. Fetch Work Items for manual or persistent stories, criteria, tests, architecture, sprints
    wi_stmt = select(WorkItem).where(WorkItem.project_id == project_id)
    wi_res = await session.execute(wi_stmt)
    all_work_items = wi_res.scalars().all()

    work_items_by_type: dict[str, list[dict[str, Any]]] = {}
    for wi in all_work_items:
        rtype = wi.record_type
        if rtype not in work_items_by_type:
            work_items_by_type[rtype] = []
        payload_dict = dict(wi.payload or {})
        payload_dict["_id"] = str(wi.id)
        payload_dict["_title"] = wi.title
        payload_dict["_status"] = wi.status
        work_items_by_type[rtype].append(payload_dict)

    # 4. Construct ZIP archive in-memory
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        # A. Requirements Document
        req_lines = [
            f"# DevPilot Project Requirements Dossier",
            f"**Project ID:** `{project_id}`",
            f"**Total Atomic Requirements:** {len(db_requirements) + len(wi_requirements)}",
            "",
            "---",
            "",
        ]
        if db_requirements:
            for r in db_requirements:
                req_lines.extend([
                    f"## [{r.requirement_key}] {r.title}",
                    f"- **Category:** `{r.category.value if hasattr(r.category, 'value') else r.category}`",
                    f"- **Priority (MoSCoW):** `{r.priority.value if hasattr(r.priority, 'value') else r.priority}`",
                    f"- **Source File:** {r.source_document or 'Direct Input'}",
                    "",
                    "### Specification",
                    f"{r.description}",
                    "",
                    "---",
                    "",
                ])
        elif wi_requirements:
            for wr in wi_requirements:
                p = wr.payload or {}
                req_lines.extend([
                    f"## [{p.get('id', wr.id)}] {wr.title or p.get('title')}",
                    f"- **Category:** `{p.get('category', 'functional')}`",
                    f"- **Priority:** `{p.get('priority', 'must')}`",
                    "",
                    f"{p.get('description', '')}",
                    "",
                    "---",
                    "",
                ])
        else:
            req_lines.append("_No requirements recorded._\n")
        zf.writestr("requirements/requirements.md", "\n".join(req_lines))

        # B. User Stories (Markdown)
        user_stories = (
            latest_versions_by_type.get("user_stories", {}).get("stories", [])
            or work_items_by_type.get("user_story", [])
        )
        story_lines = [
            "# DevPilot User Stories (INVEST Compliant)",
            f"**Project ID:** `{project_id}`",
            f"**Total User Stories:** {len(user_stories)}",
            "",
            "---",
            "",
        ]
        for s in user_stories:
            sid = s.get("story_key") or s.get("id") or s.get("_id", "US")
            title = s.get("title") or s.get("_title", "User Story")
            role = s.get("as_a") or s.get("role") or s.get("userRole") or "User"
            action = s.get("i_want") or s.get("action") or ""
            benefit = s.get("so_that") or s.get("benefit") or ""
            points = s.get("estimated_story_points") or s.get("storyPoints") or "?"
            priority = s.get("priority") or "should"
            story_lines.extend([
                f"## [{sid}] {title}",
                f"- **Priority:** `{priority}`",
                f"- **Story Points (Fibonacci):** `{points}`",
                f"- **Source Requirements:** {', '.join(s.get('source_requirement_ids', s.get('sourceRequirementIds', [])))}",
                "",
                "```",
                f"As a {role}",
                f"I want {action}",
                f"So that {benefit}",
                "```",
                "",
            ])
            hints = s.get("acceptance_criteria_hints", [])
            if hints:
                story_lines.append("**Acceptance Criteria Hints:**")
                for hint in hints:
                    story_lines.append(f"- {hint}")
                story_lines.append("")
            story_lines.extend(["---", ""])
        zf.writestr("stories/user_stories.md", "\n".join(story_lines))

        # C. Acceptance Criteria (Markdown + Gherkin .feature)
        criteria = (
            latest_versions_by_type.get("acceptance_criteria", {}).get("criteria", [])
            or work_items_by_type.get("acceptance_criteria", [])
        )
        ac_lines = [
            "# DevPilot Acceptance Criteria (Given-When-Then)",
            f"**Project ID:** `{project_id}`",
            f"**Total Scenarios:** {len(criteria)}",
            "",
            "---",
            "",
        ]
        gherkin_bundle = [f"# Feature: {project_id} Acceptance Suite", ""]
        for c in criteria:
            cid = c.get("criteria_key") or c.get("id") or c.get("_id", "AC")
            title = c.get("scenario_name") or c.get("title") or c.get("_title", "Scenario")
            gherkin = c.get("gherkin", "")
            ac_lines.extend([
                f"## [{cid}] {title}",
                f"- **User Story:** `{c.get('user_story_id') or c.get('userStoryId') or 'N/A'}`",
                "",
                "```gherkin",
                gherkin,
                "```",
                "",
                "---",
                "",
            ])
            feature_slug = cid.lower().replace("-", "_")
            zf.writestr(f"features/{feature_slug}.feature", f"Feature: {title}\n\n{gherkin}\n")
            gherkin_bundle.append(f"  # {cid}: {title}\n{gherkin}\n")
        zf.writestr("specs/acceptance_criteria.md", "\n".join(ac_lines))
        zf.writestr("features/all_scenarios.feature", "\n".join(gherkin_bundle))

        # D. Automated Test Cases
        test_cases = (
            latest_versions_by_type.get("test_cases", {}).get("test_cases", [])
            or work_items_by_type.get("test_case", [])
        )
        tc_lines = [
            "# DevPilot Automated Test Suites",
            f"**Project ID:** `{project_id}`",
            f"**Total Test Cases:** {len(test_cases)}",
            "",
            "---",
            "",
        ]
        for t in test_cases:
            tid = t.get("test_key") or t.get("id") or t.get("_id", "TC")
            title = t.get("title") or t.get("_title", "Test Case")
            cat = t.get("category", "functional")
            prio = t.get("priority", "high")
            expected = t.get("expected_result") or t.get("expectedResult") or ""
            steps = t.get("steps", [])
            tc_lines.extend([
                f"## [{tid}] {title}",
                f"- **Category:** `{cat}` | **Priority:** `{prio}`",
                f"- **Automation Status:** `{t.get('automation_status', t.get('automationStatus', 'automated'))}`",
                "",
                "### Test Execution Steps",
            ])
            for idx, step in enumerate(steps, start=1):
                tc_lines.append(f"{idx}. {step}")
            tc_lines.extend([
                "",
                f"**Expected Outcome:** {expected}",
                "",
                "---",
                "",
            ])
        zf.writestr("tests/test_cases.md", "\n".join(tc_lines))

        # E. OpenAPI 3.1 Specification
        spec_data = (
            latest_versions_by_type.get("api_specification", {}).get("spec")
            or latest_versions_by_type.get("api_specification")
        )
        if not spec_data and work_items_by_type.get("api_specification"):
            spec_data = work_items_by_type["api_specification"][0]

        if spec_data and isinstance(spec_data, dict):
            # Clean spec payload
            clean_spec = {k: v for k, v in spec_data.items() if not k.startswith("_")}
            zf.writestr("openapi/openapi.json", json.dumps(clean_spec, indent=2))
            zf.writestr("openapi/openapi.yaml", _dict_to_yaml(clean_spec))

        # F. Architecture Blueprint & Mermaid Diagram
        arch_items = work_items_by_type.get("architecture", [])
        if arch_items:
            arch = arch_items[0]
            arch_lines = [
                f"# Software Architecture Blueprint",
                f"**Pattern:** `{arch.get('pattern', 'Modular Monolith / Microservices')}`",
                f"**Summary:** {arch.get('summary', '')}",
                "",
                "## Topology & Components",
            ]
            for comp in arch.get("components", []):
                arch_lines.append(
                    f"- **{comp.get('name')}:** {comp.get('role')} ({comp.get('technology')})"
                )
            if arch.get("mermaid_diagram"):
                arch_lines.extend([
                    "",
                    "## Architecture Topology Diagram",
                    "```mermaid",
                    arch.get("mermaid_diagram", ""),
                    "```",
                    "",
                ])
                zf.writestr("architecture/topology.mmd", arch.get("mermaid_diagram", ""))
            zf.writestr("architecture/architecture_blueprint.md", "\n".join(arch_lines))

        # G. Sprint Schedule
        sprint_items = work_items_by_type.get("sprint", [])
        if sprint_items:
            sprint_lines = [
                "# DevPilot Sprint Execution Schedule",
                f"**Project ID:** `{project_id}`",
                f"**Total Sprints:** {len(sprint_items)}",
                "",
                "| Sprint | Goal | Capacity | Status | Stories |",
                "|---|---|---|---|---|",
            ]
            for sp in sprint_items:
                sprint_lines.append(
                    f"| {sp.get('_title') or sp.get('name')} | {sp.get('goal', '')} | {sp.get('capacity', 30)} pts | {sp.get('status', 'planning')} | {len(sp.get('userStoryIds', []))} stories |"
                )
            zf.writestr("sprints/sprint_schedule.md", "\n".join(sprint_lines))

        # H. Root Readme & Manifest
        manifest = [
            f"# DevPilot Multi-Format Artifact Export Bundle",
            f"",
            f"**Project:** {project_name}",
            f"**Project ID:** `{project_id}`",
            f"**Generated by:** DevPilot Enterprise SDLC Co-Pilot (Engineer 5 Export Engine)",
            f"",
            "## Package Manifest",
            "- `requirements/requirements.md`: Extracted, classified and MoSCoW-tagged atomic requirements",
            "- `stories/user_stories.md`: INVEST-validated user stories with story point estimations",
            "- `specs/acceptance_criteria.md`: Given-When-Then behavioral acceptance criteria",
            "- `features/*.feature`: Standard Gherkin feature files for test runners (Cucumber/Behave)",
            "- `tests/test_cases.md`: Structured functional, security, and edge-case test suites",
            "- `openapi/openapi.json` & `openapi.yaml`: OpenAPI 3.1 compliant service contracts",
            "- `architecture/`: Recommended topology blueprint and Mermaid.js architecture diagrams",
            "- `sprints/sprint_schedule.md`: Topologically sequenced, capacity-balanced sprint backlog",
            "",
            "All artifacts are cross-referenced and traceable to source BRD/PRD specifications.",
        ]
        zf.writestr("README.md", "\n".join(manifest))

    buf.seek(0)
    filename = f"devpilot-export-{str(project_id)[:8]}.zip"
    return StreamingResponse(
        buf,
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )

