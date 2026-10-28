"""add project-scoped requirements domain model

Revision ID: 0004_requirements
Revises: 0003_project_work_items
"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0004_requirements"
down_revision: str | None = "0003_project_work_items"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    requirement_category = postgresql.ENUM(
        "functional",
        "non_functional",
        "security",
        "performance",
        "usability",
        "other",
        name="requirement_category",
        create_type=False,
    )
    moscow_priority = postgresql.ENUM(
        "must",
        "should",
        "could",
        "wont",
        name="moscow_priority",
        create_type=False,
    )
    requirement_category.create(op.get_bind(), checkfirst=True)
    moscow_priority.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "requirements",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "project_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("projects.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("requirement_key", sa.String(30), nullable=False),
        sa.Column("title", sa.String(300), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("category", requirement_category, nullable=True),
        sa.Column("priority", moscow_priority, nullable=True),
        sa.Column("source_document", sa.String(500), nullable=True),
        sa.Column("source_location", postgresql.JSONB(), nullable=True),
        sa.Column("embedding_metadata", postgresql.JSONB(), nullable=True),
        sa.Column(
            "created_by",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id"),
            nullable=False,
        ),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("project_id", "requirement_key", name="uq_requirements_project_key"),
    )
    op.create_index("ix_requirements_project_id", "requirements", ["project_id"])
    op.create_index(
        "ix_requirements_project_category", "requirements", ["project_id", "category"]
    )
    op.create_index("ix_requirements_project_priority", "requirements", ["project_id", "priority"])


def downgrade() -> None:
    op.drop_index("ix_requirements_project_priority", table_name="requirements")
    op.drop_index("ix_requirements_project_category", table_name="requirements")
    op.drop_index("ix_requirements_project_id", table_name="requirements")
    op.drop_table("requirements")
    postgresql.ENUM(name="moscow_priority").drop(op.get_bind(), checkfirst=True)
    postgresql.ENUM(name="requirement_category").drop(op.get_bind(), checkfirst=True)
