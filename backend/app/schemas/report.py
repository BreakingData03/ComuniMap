import re
import uuid
from datetime import datetime, time
from typing import Literal, Self

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

Category = Literal["perigo", "caridade", "evento", "comunidade"]
RiskLevel = Literal["alto", "medio", "baixo"]
Status = Literal["pending", "in_progress", "resolved"]
DonationIntent = Literal["precisa", "doando"]


class ReportCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    category: Category
    title: str = Field(min_length=1, max_length=120)
    description: str = Field(min_length=1, max_length=2000)
    neighborhood: str = Field(min_length=1, max_length=120)
    street: str | None = Field(default=None, max_length=160)
    lat: float = Field(ge=-90, le=90)
    lng: float = Field(ge=-180, le=180)

    risk_level: RiskLevel | None = None
    contact_whatsapp: str | None = None
    donation_intent: DonationIntent | None = None
    item_category: str | None = Field(default=None, max_length=40)
    starts_at: time | None = None
    ends_at: time | None = None

    @field_validator("street", "item_category")
    @classmethod
    def blank_to_none(cls, value: str | None) -> str | None:
        return value or None

    @field_validator("contact_whatsapp")
    @classmethod
    def only_digits(cls, value: str | None) -> str | None:
        if value is None:
            return None
        digits = re.sub(r"\D", "", value)
        if not digits:
            return None
        if len(digits) != 11:
            raise ValueError("O WhatsApp deve ter 11 números (DDD + celular).")
        return digits

    @model_validator(mode="after")
    def per_category(self) -> Self:
        """Cada categoria tem seus campos; os que não se aplicam são descartados."""
        if self.category == "perigo":
            self.risk_level = self.risk_level or "medio"
        else:
            self.risk_level = None

        if self.category == "caridade":
            if not self.contact_whatsapp:
                raise ValueError("Informe o WhatsApp de contato (11 números).")
            if not self.donation_intent:
                raise ValueError("Informe se a ação precisa de doação ou está doando.")
        else:
            self.contact_whatsapp = None
            self.donation_intent = None
            self.item_category = None

        if self.category not in ("evento", "comunidade"):
            self.starts_at = None
            self.ends_at = None
        return self


class ReportOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    tenant_id: uuid.UUID | None
    created_by: uuid.UUID | None
    category: Category
    title: str
    description: str
    neighborhood: str
    street: str | None
    lat: float
    lng: float
    risk_level: RiskLevel | None
    contact_whatsapp: str | None
    donation_intent: DonationIntent | None
    item_category: str | None
    starts_at: time | None
    ends_at: time | None
    photo_url: str | None
    photo_thumb_url: str | None
    photo_status: str
    upvotes: int
    status: Status
    created_at: datetime
    # true quando o POST caiu num reporte já existente (regra dos 15 m) em vez de criar outro.
    merged: bool = False


class ReportList(BaseModel):
    items: list[ReportOut]
    total: int


class StatusUpdate(BaseModel):
    status: Status
