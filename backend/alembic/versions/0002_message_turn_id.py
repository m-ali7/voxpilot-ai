"""add turn_id to messages

Revision ID: 0002
Revises: 0001
Create Date: 2026-08-26

"""
import sqlalchemy as sa
from alembic import op

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("messages", sa.Column("turn_id", sa.String(length=64), nullable=True))
    op.create_index("ix_messages_turn_id", "messages", ["turn_id"])


def downgrade() -> None:
    op.drop_index("ix_messages_turn_id", table_name="messages")
    op.drop_column("messages", "turn_id")
