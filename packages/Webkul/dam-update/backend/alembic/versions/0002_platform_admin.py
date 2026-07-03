"""Platform admin: soft-delete, category ordering, user moderation,
news tags, AI providers, login history, job runs.

Revision ID: 0002
Revises: 0001
Create Date: 2026-07-03 00:00:00

"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0002"
down_revision: Union[str, None] = "0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _has_column(bind, table: str, column: str) -> bool:
    insp = sa.inspect(bind)
    try:
        return column in {c["name"] for c in insp.get_columns(table)}
    except Exception:  # noqa: BLE001
        return False


def _has_table(bind, table: str) -> bool:
    return sa.inspect(bind).has_table(table)


def upgrade() -> None:
    bind = op.get_bind()

    # --- Announcements: soft delete -------------------------------------
    if not _has_column(bind, "announcements", "deleted_at"):
        op.add_column(
            "announcements",
            sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        )

    # --- Categories: ordering / visibility / feature -------------------
    if not _has_column(bind, "categories", "position"):
        op.add_column(
            "categories",
            sa.Column("position", sa.Integer(), nullable=False, server_default="0"),
        )
    if not _has_column(bind, "categories", "is_hidden"):
        op.add_column(
            "categories",
            sa.Column("is_hidden", sa.Boolean(), nullable=False, server_default=sa.false()),
        )
    if not _has_column(bind, "categories", "is_featured"):
        op.add_column(
            "categories",
            sa.Column("is_featured", sa.Boolean(), nullable=False, server_default=sa.false()),
        )

    # --- Users: moderation + login tracking ----------------------------
    if not _has_column(bind, "users", "is_suspended"):
        op.add_column(
            "users",
            sa.Column("is_suspended", sa.Boolean(), nullable=False, server_default=sa.false()),
        )
    if not _has_column(bind, "users", "suspended_at"):
        op.add_column(
            "users", sa.Column("suspended_at", sa.DateTime(timezone=True), nullable=True)
        )
    if not _has_column(bind, "users", "last_login_at"):
        op.add_column(
            "users", sa.Column("last_login_at", sa.DateTime(timezone=True), nullable=True)
        )
    if not _has_column(bind, "users", "deleted_at"):
        op.add_column(
            "users", sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True)
        )

    # --- News: tags ----------------------------------------------------
    if not _has_column(bind, "news_articles", "tags"):
        op.add_column(
            "news_articles",
            sa.Column("tags", sa.Text(), nullable=False, server_default=""),
        )

    # --- AI providers --------------------------------------------------
    if not _has_table(bind, "ai_providers"):
        op.create_table(
            "ai_providers",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("key", sa.String(50), nullable=False),
            sa.Column("name", sa.String(100), nullable=False),
            sa.Column("provider_type", sa.String(30), nullable=False, server_default="openai_compatible"),
            sa.Column("api_key", sa.Text(), nullable=False, server_default=""),
            sa.Column("base_url", sa.String(500), nullable=False, server_default=""),
            sa.Column("model", sa.String(200), nullable=False, server_default=""),
            sa.Column("temperature", sa.Float(), nullable=False, server_default="0.7"),
            sa.Column("max_tokens", sa.Integer(), nullable=False, server_default="600"),
            sa.Column("timeout", sa.Integer(), nullable=False, server_default="30"),
            sa.Column("daily_limit", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("enabled", sa.Boolean(), nullable=False, server_default=sa.false()),
            sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.false()),
            sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        )
        op.create_index("ix_ai_providers_key", "ai_providers", ["key"], unique=True)

    # --- Login history -------------------------------------------------
    if not _has_table(bind, "login_history"):
        op.create_table(
            "login_history",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column(
                "user_id",
                sa.Integer(),
                sa.ForeignKey("users.id", ondelete="CASCADE"),
                nullable=False,
            ),
            sa.Column("ip", sa.String(64), nullable=False, server_default=""),
            sa.Column("user_agent", sa.String(400), nullable=False, server_default=""),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        )
        op.create_index("ix_login_history_user_id", "login_history", ["user_id"])

    # --- Job runs ------------------------------------------------------
    if not _has_table(bind, "job_runs"):
        op.create_table(
            "job_runs",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("name", sa.String(100), nullable=False),
            sa.Column("status", sa.String(20), nullable=False, server_default="running"),
            sa.Column("detail", sa.Text(), nullable=False, server_default=""),
            sa.Column("items", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("duration_ms", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("trigger", sa.String(20), nullable=False, server_default="manual"),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        )
        op.create_index("ix_job_runs_name", "job_runs", ["name"])
        op.create_index("ix_job_runs_created_at", "job_runs", ["created_at"])


def downgrade() -> None:
    op.drop_table("job_runs")
    op.drop_table("login_history")
    op.drop_table("ai_providers")
    op.drop_column("news_articles", "tags")
    op.drop_column("users", "deleted_at")
    op.drop_column("users", "last_login_at")
    op.drop_column("users", "suspended_at")
    op.drop_column("users", "is_suspended")
    op.drop_column("categories", "is_featured")
    op.drop_column("categories", "is_hidden")
    op.drop_column("categories", "position")
    op.drop_column("announcements", "deleted_at")
