"""Persist workspace status and tags.

Revision ID: 0007_project_metadata
Revises: 0006_evaluations_prompts
"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "0007_project_metadata"
down_revision = "0006_evaluations_prompts"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "projects", sa.Column("status", sa.String(20), nullable=False, server_default="active")
    )
    op.add_column(
        "projects", sa.Column("tags", postgresql.JSONB(), nullable=False, server_default="[]")
    )


def downgrade():
    op.drop_column("projects", "tags")
    op.drop_column("projects", "status")
