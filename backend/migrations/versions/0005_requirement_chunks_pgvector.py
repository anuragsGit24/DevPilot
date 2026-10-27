"""add pgvector-backed requirement chunks

Revision ID: 0005_requirement_chunks_pgvector
Revises: 0004_requirements
"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from pgvector.sqlalchemy import Vector
from sqlalchemy.dialects import postgresql

revision: str = "0005_requirement_chunks_pgvector"
down_revision: str | None = "0004_requirements"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")
    op.create_table(
        "requirement_chunks",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("requirement_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("requirements.id", ondelete="CASCADE"), nullable=False),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("projects.id", ondelete="CASCADE"), nullable=False),
        sa.Column("chunk_index", sa.Integer(), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("token_count", sa.Integer(), nullable=False),
        sa.Column("embedding", Vector(768), nullable=True),
        sa.Column("embedding_metadata", postgresql.JSONB(), nullable=True),
        sa.UniqueConstraint("requirement_id", "chunk_index", name="uq_requirement_chunks_index"),
    )
    op.create_index("ix_requirement_chunks_requirement_id", "requirement_chunks", ["requirement_id"])
    op.create_index("ix_requirement_chunks_project_id", "requirement_chunks", ["project_id"])


def downgrade() -> None:
    op.drop_index("ix_requirement_chunks_project_id", table_name="requirement_chunks")
    op.drop_index("ix_requirement_chunks_requirement_id", table_name="requirement_chunks")
    op.drop_table("requirement_chunks")
