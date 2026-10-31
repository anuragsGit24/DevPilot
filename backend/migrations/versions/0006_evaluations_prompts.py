"""Engineer 4: evaluations, traceability metadata, prompt versioning tables

Revision ID: 0006_evaluations_prompts
Revises: 0005_requirement_chunks_pgvector
Create Date: 2026-10-31 00:00:00
"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0006_evaluations_prompts"
down_revision: str | None = "0005_requirement_chunks_pgvector"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

evaluation_status = postgresql.ENUM(
    "pending", "running", "completed", "failed", name="evaluation_status", create_type=False
)
prompt_lifecycle_state = postgresql.ENUM(
    "draft", "tested", "active", "retired", name="prompt_lifecycle_state", create_type=False
)


def upgrade() -> None:
    evaluation_status.create(op.get_bind(), checkfirst=True)
    prompt_lifecycle_state.create(op.get_bind(), checkfirst=True)

    # 1. Evaluation runs (rubric scoring outputs)
    op.create_table(
        "evaluations",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("projects.id", ondelete="CASCADE"), nullable=False),
        sa.Column("status", evaluation_status, nullable=False),
        sa.Column("triggered_by", sa.String(30), nullable=True),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("artifact_stats", postgresql.JSONB(), nullable=True),
        sa.Column("metrics", postgresql.JSONB(), nullable=True),
        sa.Column("issues", postgresql.JSONB(), nullable=True),
        sa.Column("scores", postgresql.JSONB(), nullable=True),
        sa.Column("summary", sa.Text(), nullable=True),
        sa.Column("rubric_metadata", postgresql.JSONB(), nullable=True),
    )
    op.create_index("ix_evaluations_project_id", "evaluations", ["project_id"])
    op.create_index("ix_evaluations_project_created", "evaluations", ["project_id", "created_at"])

    # 2. Prompt library and immutable prompt revisions (PromptOps)
    op.create_table(
        "prompts",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("projects.id", ondelete="CASCADE"), nullable=True),
        sa.Column("prompt_key", sa.String(100), nullable=False),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("artifact_type", sa.String(50), nullable=False),
        sa.Column("lifecycle_state", prompt_lifecycle_state, nullable=False),
        sa.Column("active_version_number", sa.Integer(), nullable=True),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("project_id", "prompt_key", name="uq_prompts_project_key"),
    )

    op.create_table(
        "prompt_versions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("prompt_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("prompts.id", ondelete="CASCADE"), nullable=False),
        sa.Column("version_number", sa.Integer(), nullable=False),
        sa.Column("system_prompt", sa.Text(), nullable=False),
        sa.Column("user_prompt", sa.Text(), nullable=False),
        sa.Column("model", sa.String(100), nullable=True),
        sa.Column("temperature", sa.Float(), nullable=True),
        sa.Column("checksum", sa.String(64), nullable=False),
        sa.Column("variables", postgresql.JSONB(), nullable=True),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("prompt_id", "version_number", name="uq_prompt_versions_number"),
        sa.UniqueConstraint("prompt_id", "checksum", name="uq_prompt_versions_checksum"),
    )
    op.create_index("ix_prompt_versions_prompt_id", "prompt_versions", ["prompt_id"])

    # 3. Prompt regression runs (comparison between two revisions)
    op.create_table(
        "prompt_regressions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("prompt_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("prompts.id", ondelete="CASCADE"), nullable=False),
        sa.Column("candidate_version_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("prompt_versions.id", ondelete="SET NULL"), nullable=True),
        sa.Column("baseline_version_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("prompt_versions.id", ondelete="SET NULL"), nullable=True),
        sa.Column("is_pass", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("results", postgresql.JSONB(), nullable=True),
        sa.Column("run_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("run_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_prompt_regressions_prompt_id", "prompt_regressions", ["prompt_id"])
    op.create_index("ix_prompt_regressions_run_at", "prompt_regressions", ["run_at"])


def downgrade() -> None:
    op.drop_index("ix_prompt_regressions_run_at", table_name="prompt_regressions")
    op.drop_index("ix_prompt_regressions_prompt_id", table_name="prompt_regressions")
    op.drop_table("prompt_regressions")

    op.drop_index("ix_prompt_versions_prompt_id", table_name="prompt_versions")
    op.drop_table("prompt_versions")
    op.drop_table("prompts")

    op.drop_index("ix_evaluations_project_created", table_name="evaluations")
    op.drop_index("ix_evaluations_project_id", table_name="evaluations")
    op.drop_table("evaluations")

    prompt_lifecycle_state.drop(op.get_bind(), checkfirst=True)
    evaluation_status.drop(op.get_bind(), checkfirst=True)
