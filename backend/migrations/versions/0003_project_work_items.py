"""add project-scoped flexible workspace records

Revision ID: 0003_project_work_items
Revises: 0002_real_auth_and_audit
"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0003_project_work_items"
down_revision: str | None = "0002_real_auth_and_audit"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "work_items",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "project_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("projects.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("record_type", sa.String(80), nullable=False),
        sa.Column("title", sa.String(300), nullable=False),
        sa.Column("status", sa.String(80), nullable=True),
        sa.Column("payload", postgresql.JSONB(), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("source_ids", postgresql.JSONB(), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column(
            "parent_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("work_items.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "created_by",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id"),
            nullable=False,
        ),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_work_items_project_id", "work_items", ["project_id"])
    op.create_index("ix_work_items_record_type", "work_items", ["record_type"])
    op.create_index("ix_work_items_parent_id", "work_items", ["parent_id"])
    op.create_index("ix_work_items_project_type", "work_items", ["project_id", "record_type"])
    op.create_index("ix_work_items_project_status", "work_items", ["project_id", "status"])


def downgrade() -> None:
    op.drop_index("ix_work_items_project_status", table_name="work_items")
    op.drop_index("ix_work_items_project_type", table_name="work_items")
    op.drop_index("ix_work_items_parent_id", table_name="work_items")
    op.drop_index("ix_work_items_record_type", table_name="work_items")
    op.drop_index("ix_work_items_project_id", table_name="work_items")
    op.drop_table("work_items")
