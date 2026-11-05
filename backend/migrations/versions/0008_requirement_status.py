"""Persist requirement review state."""

import sqlalchemy as sa
from alembic import op

revision = "0008_requirement_status"
down_revision = "0007_project_metadata"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "requirements",
        sa.Column("status", sa.String(20), nullable=False, server_default="extracted"),
    )


def downgrade():
    op.drop_column("requirements", "status")
