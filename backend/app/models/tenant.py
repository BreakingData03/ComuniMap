import uuid
from datetime import datetime

from geoalchemy2 import Geometry, WKBElement
from sqlalchemy import Boolean, CheckConstraint, DateTime, Index, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base

TENANT_KINDS = ("prefeitura", "concessionaria")


class Tenant(Base):
    """Cliente B2G (prefeitura ou concessionária) e a área que ele atende."""

    __tablename__ = "tenants"
    __table_args__ = (
        Index("ix_tenants_boundary_gist", "boundary", postgresql_using="gist"),
        CheckConstraint("kind IN ('prefeitura', 'concessionaria')", name="ck_tenants_kind"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    slug: Mapped[str] = mapped_column(String(80), unique=True)
    name: Mapped[str] = mapped_column(String(160))
    kind: Mapped[str] = mapped_column(String(20), default="prefeitura")
    # Reportes dentro deste polígono pertencem ao tenant.
    boundary: Mapped[WKBElement] = mapped_column(Geometry("MULTIPOLYGON", srid=4326, spatial_index=False))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
