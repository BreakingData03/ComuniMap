import uuid
from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base

ROLE_CITIZEN = "citizen"
ROLE_AGENT = "agent"  # servidor/atendente do tenant: muda status dos reportes da sua área
ROLE_ADMIN = "admin"  # equipe da plataforma: vê e muda tudo


class User(Base):
    __tablename__ = "users"
    __table_args__ = (CheckConstraint("role IN ('citizen', 'agent', 'admin')", name="ck_users_role"),)

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(120))
    email: Mapped[str] = mapped_column(String(254), unique=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(20), default=ROLE_CITIZEN, server_default=ROLE_CITIZEN)
    # Só para agentes: o tenant que eles atendem.
    tenant_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("tenants.id", ondelete="SET NULL"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
