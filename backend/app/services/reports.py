from geoalchemy2 import WKTElement
from sqlalchemy import cast, func, select, update
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models import Report, ReportVote, Tenant, User
from app.models.base import GeographyCast
from app.models.report import OPEN_STATUSES
from app.schemas.report import ReportCreate


def _point(lat: float, lng: float):
    """Ponto WGS84 como expressão SQL. No PostGIS a ordem é (x=longitude, y=latitude)."""
    return func.ST_SetSRID(func.ST_MakePoint(lng, lat), 4326)


async def add_vote(session: AsyncSession, report: Report, user: User) -> bool:
    """Soma uma confirmação ao reporte. Cada pessoa conta uma vez; o autor não confirma o próprio."""
    if report.created_by == user.id:
        return False

    inserted = await session.execute(
        insert(ReportVote)
        .values(report_id=report.id, user_id=user.id)
        .on_conflict_do_nothing(index_elements=["report_id", "user_id"])
        .returning(ReportVote.report_id)
    )
    if inserted.scalar_one_or_none() is None:
        return False  # essa pessoa já tinha confirmado

    # Incremento no próprio banco: não perde voto com duas requisições simultâneas.
    await session.execute(update(Report).where(Report.id == report.id).values(upvotes=Report.upvotes + 1))
    return True


async def find_open_duplicate(session: AsyncSession, category: str, lat: float, lng: float) -> Report | None:
    """Reporte aberto da mesma categoria a até `dedup_radius_meters` do ponto, o mais próximo primeiro.

    O cast para geography faz o ST_DWithin trabalhar em metros (em geometry 4326 a unidade seria
    grau) e casa com o índice GIST de expressão `ix_reports_location_geog`.
    """
    here = cast(_point(lat, lng), GeographyCast)
    there = cast(Report.location, GeographyCast)
    stmt = (
        select(Report)
        .where(
            Report.category == category,
            Report.status.in_(OPEN_STATUSES),
            Report.moderation_status != "flagged",
            func.ST_DWithin(there, here, settings.dedup_radius_meters),
        )
        .order_by(func.ST_Distance(there, here))
        .limit(1)
    )
    return (await session.execute(stmt)).scalar_one_or_none()


async def resolve_tenant_id(session: AsyncSession, lat: float, lng: float):
    """Tenant cujo polígono cobre o ponto (None se o ponto cai fora de toda área atendida)."""
    stmt = (
        select(Tenant.id)
        .where(Tenant.is_active, func.ST_Covers(Tenant.boundary, _point(lat, lng)))
        .order_by(Tenant.created_at)
        .limit(1)
    )
    return (await session.execute(stmt)).scalar_one_or_none()


async def create_or_upvote(session: AsyncSession, data: ReportCreate, user: User) -> tuple[Report, bool]:
    """Cria o reporte ou, se já houver um aberto igual a 15 m, apenas soma um upvote nele.

    Devolve (reporte, merged). Quem chama faz o commit.
    """
    # Serializa criações da mesma categoria até o fim da transação: sem isso, dois envios
    # simultâneos do mesmo buraco passariam os dois pela checagem e criariam dois pinos.
    await session.execute(select(func.pg_advisory_xact_lock(func.hashtext(f"report:{data.category}"))))

    existing = await find_open_duplicate(session, data.category, data.lat, data.lng)
    if existing is not None:
        await add_vote(session, existing, user)
        return existing, True

    report = Report(
        tenant_id=await resolve_tenant_id(session, data.lat, data.lng),
        created_by=user.id,
        category=data.category,
        title=data.title,
        description=data.description,
        neighborhood=data.neighborhood,
        street=data.street,
        location=WKTElement(f"POINT({data.lng} {data.lat})", srid=4326),
        risk_level=data.risk_level,
        contact_whatsapp=data.contact_whatsapp,
        donation_intent=data.donation_intent,
        item_category=data.item_category,
        starts_at=data.starts_at,
        ends_at=data.ends_at,
    )
    session.add(report)
    await session.flush()
    return report, False
