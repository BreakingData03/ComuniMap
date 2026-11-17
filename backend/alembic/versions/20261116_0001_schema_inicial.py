"""Schema inicial: tenants, users, reports, report_votes

Revision ID: 0001
Revises:
Create Date: 2026-11-16
"""
from collections.abc import Sequence

import sqlalchemy as sa
from geoalchemy2 import Geometry

from alembic import op

revision: str = "0001"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS postgis")

    op.create_table(
        "tenants",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("slug", sa.String(80), nullable=False, unique=True),
        sa.Column("name", sa.String(160), nullable=False),
        sa.Column("kind", sa.String(20), nullable=False),
        sa.Column("boundary", Geometry("MULTIPOLYGON", srid=4326, spatial_index=False), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.CheckConstraint("kind IN ('prefeitura', 'concessionaria')", name="ck_tenants_kind"),
    )
    op.create_index("ix_tenants_boundary_gist", "tenants", ["boundary"], postgresql_using="gist")

    op.create_table(
        "users",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("name", sa.String(120), nullable=False),
        sa.Column("email", sa.String(254), nullable=False, unique=True),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("role", sa.String(20), nullable=False, server_default="citizen"),
        sa.Column("tenant_id", sa.Uuid(), sa.ForeignKey("tenants.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.CheckConstraint("role IN ('citizen', 'agent', 'admin')", name="ck_users_role"),
    )

    op.create_table(
        "reports",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("tenant_id", sa.Uuid(), sa.ForeignKey("tenants.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_by", sa.Uuid(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("category", sa.String(20), nullable=False),
        sa.Column("title", sa.String(120), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("neighborhood", sa.String(120), nullable=False),
        sa.Column("street", sa.String(160), nullable=True),
        sa.Column("location", Geometry("POINT", srid=4326, spatial_index=False), nullable=False),
        sa.Column("risk_level", sa.String(10), nullable=True),
        sa.Column("contact_whatsapp", sa.String(20), nullable=True),
        sa.Column("donation_intent", sa.String(10), nullable=True),
        sa.Column("item_category", sa.String(40), nullable=True),
        sa.Column("starts_at", sa.Time(), nullable=True),
        sa.Column("ends_at", sa.Time(), nullable=True),
        sa.Column("upvotes", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("status", sa.String(20), nullable=False, server_default="pending"),
        sa.Column("moderation_status", sa.String(20), nullable=False, server_default="pending"),
        sa.Column("photo_path", sa.String(255), nullable=True),
        sa.Column("photo_thumb_path", sa.String(255), nullable=True),
        sa.Column("photo_status", sa.String(20), nullable=False, server_default="none"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.CheckConstraint(
            "category IN ('perigo', 'caridade', 'evento', 'comunidade')", name="ck_reports_category"
        ),
        sa.CheckConstraint("status IN ('pending', 'in_progress', 'resolved')", name="ck_reports_status"),
        sa.CheckConstraint(
            "risk_level IS NULL OR risk_level IN ('alto', 'medio', 'baixo')", name="ck_reports_risk_level"
        ),
        sa.CheckConstraint(
            "donation_intent IS NULL OR donation_intent IN ('precisa', 'doando')",
            name="ck_reports_donation_intent",
        ),
        sa.CheckConstraint(
            "moderation_status IN ('pending', 'approved', 'flagged')", name="ck_reports_moderation_status"
        ),
        sa.CheckConstraint(
            "photo_status IN ('none', 'processing', 'ready', 'rejected')", name="ck_reports_photo_status"
        ),
        sa.CheckConstraint("upvotes >= 0", name="ck_reports_upvotes"),
    )
    op.create_index("ix_reports_tenant_id", "reports", ["tenant_id"])
    op.create_index("ix_reports_created_by", "reports", ["created_by"])
    op.create_index("ix_reports_category_status", "reports", ["category", "status"])
    # Índice espacial da coluna geometry (bbox, ST_Covers).
    op.create_index("ix_reports_location_gist", "reports", ["location"], postgresql_using="gist")
    # Índice de expressão para o ST_DWithin em METROS da regra de deduplicação dos 15 m:
    # a consulta compara location::geography, então é este índice que ela usa.
    op.execute("CREATE INDEX ix_reports_location_geog ON reports USING gist ((location::geography))")

    op.create_table(
        "report_votes",
        sa.Column(
            "report_id", sa.Uuid(), sa.ForeignKey("reports.id", ondelete="CASCADE"), primary_key=True
        ),
        sa.Column("user_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("report_votes")
    op.drop_table("reports")
    op.drop_table("users")
    op.drop_table("tenants")
