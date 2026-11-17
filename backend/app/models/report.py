import uuid
from datetime import datetime, time

from geoalchemy2 import Geometry, WKBElement
from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    Time,
    func,
)
from sqlalchemy.orm import Mapped, column_property, mapped_column

from app.models.base import Base

CATEGORIES = ("perigo", "caridade", "evento", "comunidade")
RISK_LEVELS = ("alto", "medio", "baixo")
STATUSES = ("pending", "in_progress", "resolved")
OPEN_STATUSES = ("pending", "in_progress")
DONATION_INTENTS = ("precisa", "doando")


class Report(Base):
    __tablename__ = "reports"
    __table_args__ = (
        # Índice espacial da coluna geometry (consultas por bbox / ST_Covers).
        Index("ix_reports_location_gist", "location", postgresql_using="gist"),
        # O índice em (location::geography), usado pelo ST_DWithin em metros da regra dos 15 m,
        # é criado na migração: é um índice de expressão.
        Index("ix_reports_category_status", "category", "status"),
        CheckConstraint("category IN ('perigo', 'caridade', 'evento', 'comunidade')", name="ck_reports_category"),
        CheckConstraint("status IN ('pending', 'in_progress', 'resolved')", name="ck_reports_status"),
        CheckConstraint(
            "risk_level IS NULL OR risk_level IN ('alto', 'medio', 'baixo')", name="ck_reports_risk_level"
        ),
        CheckConstraint(
            "donation_intent IS NULL OR donation_intent IN ('precisa', 'doando')",
            name="ck_reports_donation_intent",
        ),
        CheckConstraint(
            "moderation_status IN ('pending', 'approved', 'flagged')", name="ck_reports_moderation_status"
        ),
        CheckConstraint(
            "photo_status IN ('none', 'processing', 'ready', 'rejected')", name="ck_reports_photo_status"
        ),
        CheckConstraint("upvotes >= 0", name="ck_reports_upvotes"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("tenants.id", ondelete="SET NULL"), index=True
    )
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), index=True
    )

    category: Mapped[str] = mapped_column(String(20))
    title: Mapped[str] = mapped_column(String(120))
    description: Mapped[str] = mapped_column(Text)
    neighborhood: Mapped[str] = mapped_column(String(120))
    street: Mapped[str | None] = mapped_column(String(160))

    location: Mapped[WKBElement] = mapped_column(Geometry("POINT", srid=4326, spatial_index=False))

    # Só perigo
    risk_level: Mapped[str | None] = mapped_column(String(10))
    # Só caridade
    contact_whatsapp: Mapped[str | None] = mapped_column(String(20))
    donation_intent: Mapped[str | None] = mapped_column(String(10))
    item_category: Mapped[str | None] = mapped_column(String(40))
    # Só evento / comunidade
    starts_at: Mapped[time | None] = mapped_column(Time)
    ends_at: Mapped[time | None] = mapped_column(Time)

    upvotes: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    status: Mapped[str] = mapped_column(String(20), default="pending", server_default="pending")
    moderation_status: Mapped[str] = mapped_column(String(20), default="pending", server_default="pending")

    # Caminhos relativos à pasta pública de mídia; preenchidos pelo worker.
    photo_path: Mapped[str | None] = mapped_column(String(255))
    photo_thumb_path: Mapped[str | None] = mapped_column(String(255))
    photo_status: Mapped[str] = mapped_column(String(20), default="none", server_default="none")

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    @property
    def photo_url(self) -> str | None:
        return f"/media/{self.photo_path}" if self.photo_path else None

    @property
    def photo_thumb_url(self) -> str | None:
        return f"/media/{self.photo_thumb_path}" if self.photo_thumb_path else None


# lat/lng saem do próprio PostGIS em todo SELECT do modelo.
Report.lat = column_property(func.ST_Y(Report.__table__.c.location))
Report.lng = column_property(func.ST_X(Report.__table__.c.location))


class ReportVote(Base):
    """Uma confirmação por pessoa por reporte: impede inflar `upvotes` repetindo o envio."""

    __tablename__ = "report_votes"

    report_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("reports.id", ondelete="CASCADE"), primary_key=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
