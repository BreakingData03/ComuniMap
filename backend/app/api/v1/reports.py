import logging
import shutil
import uuid
from typing import Literal

from fastapi import APIRouter, Depends, File, HTTPException, Query, Response, UploadFile, status
from fastapi.concurrency import run_in_threadpool
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.db import get_session
from app.models import Report, Tenant, User
from app.models.report import OPEN_STATUSES
from app.models.user import ROLE_ADMIN, ROLE_AGENT
from app.schemas.report import Category, ReportCreate, ReportList, ReportOut, Status, StatusUpdate
from app.security import get_current_user, rate_limit
from app.services import reports as reports_service
from app.worker import tasks

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/reports", tags=["reports"])


async def _enqueue(task, *args: str) -> bool:
    """Publica uma tarefa no Celery sem derrubar a requisição se o broker estiver fora."""
    try:
        await run_in_threadpool(task.delay, *args)
        return True
    except Exception:
        logger.warning("Não foi possível enfileirar %s%s", task.name, args, exc_info=True)
        return False


async def _get_report(session: AsyncSession, report_id: uuid.UUID) -> Report:
    report = await session.get(Report, report_id)
    if report is None or report.moderation_status == "flagged":
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Registro não encontrado.")
    return report


def _is_staff(user: User, report: Report) -> bool:
    """Admin da plataforma ou agente do tenant dono do reporte."""
    if user.role == ROLE_ADMIN:
        return True
    return user.role == ROLE_AGENT and user.tenant_id is not None and user.tenant_id == report.tenant_id


def _parse_bbox(bbox: str) -> tuple[float, float, float, float]:
    try:
        min_lng, min_lat, max_lng, max_lat = (float(part) for part in bbox.split(","))
    except ValueError:
        raise HTTPException(
            422, "bbox deve ser minLng,minLat,maxLng,maxLat."
        ) from None
    return min_lng, min_lat, max_lng, max_lat


@router.get("", response_model=ReportList)
async def list_reports(
    category: Category | None = None,
    report_status: Status | Literal["all"] | None = Query(
        default=None, alias="status", description="Padrão: só abertos (pending e in_progress)."
    ),
    tenant: str | None = Query(default=None, description="Slug do tenant."),
    bbox: str | None = Query(default=None, description="minLng,minLat,maxLng,maxLat"),
    q: str | None = Query(default=None, max_length=100),
    limit: int = Query(default=200, ge=1, le=1000),
    offset: int = Query(default=0, ge=0),
    session: AsyncSession = Depends(get_session),
) -> ReportList:
    filters = [Report.moderation_status != "flagged"]

    if category:
        filters.append(Report.category == category)
    if report_status is None:
        filters.append(Report.status.in_(OPEN_STATUSES))
    elif report_status != "all":
        filters.append(Report.status == report_status)
    if tenant:
        filters.append(Report.tenant_id == select(Tenant.id).where(Tenant.slug == tenant).scalar_subquery())
    if bbox:
        # && compara caixas envolventes e usa o índice GIST da coluna geometry.
        filters.append(Report.location.op("&&")(func.ST_MakeEnvelope(*_parse_bbox(bbox), 4326)))
    if q and q.strip():
        escaped = q.strip().replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
        pattern = f"%{escaped}%"
        filters.append(
            or_(
                Report.title.ilike(pattern),
                Report.description.ilike(pattern),
                Report.neighborhood.ilike(pattern),
                Report.street.ilike(pattern),
            )
        )

    total = (await session.execute(select(func.count()).select_from(Report).where(*filters))).scalar_one()
    rows = await session.execute(
        select(Report).where(*filters).order_by(Report.created_at.desc()).limit(limit).offset(offset)
    )
    return ReportList(items=[ReportOut.model_validate(r) for r in rows.scalars()], total=total)


@router.post(
    "",
    response_model=ReportOut,
    status_code=status.HTTP_201_CREATED,
    responses={200: {"description": "Já havia um reporte aberto igual a 15 m: upvote somado nele."}},
    dependencies=[Depends(rate_limit("report-create", limit=30, window_seconds=600))],
)
async def create_report(
    data: ReportCreate,
    response: Response,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> ReportOut:
    report, merged = await reports_service.create_or_upvote(session, data, user)
    await session.commit()
    await session.refresh(report)

    if merged:
        response.status_code = status.HTTP_200_OK
    else:
        await _enqueue(tasks.moderate_report, str(report.id))

    return ReportOut.model_validate(report).model_copy(update={"merged": merged})


@router.get("/{report_id}", response_model=ReportOut)
async def get_report(report_id: uuid.UUID, session: AsyncSession = Depends(get_session)) -> Report:
    return await _get_report(session, report_id)


@router.post("/{report_id}/upvote", response_model=ReportOut)
async def upvote_report(
    report_id: uuid.UUID,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> Report:
    report = await _get_report(session, report_id)
    await reports_service.add_vote(session, report, user)
    await session.commit()
    await session.refresh(report)
    return report


@router.patch("/{report_id}/status", response_model=ReportOut)
async def update_status(
    report_id: uuid.UUID,
    data: StatusUpdate,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> Report:
    report = await _get_report(session, report_id)
    if not _is_staff(user, report):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Só a equipe responsável pela área muda o status.")
    report.status = data.status
    await session.commit()
    await session.refresh(report)
    return report


@router.post(
    "/{report_id}/photo",
    response_model=ReportOut,
    status_code=status.HTTP_202_ACCEPTED,
    dependencies=[Depends(rate_limit("report-photo", limit=30, window_seconds=600))],
)
async def upload_photo(
    report_id: uuid.UUID,
    photo: UploadFile = File(...),
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> Report:
    """Recebe a foto e devolve 202: o worker valida, converte para WebP e gera a miniatura."""
    report = await _get_report(session, report_id)
    if report.created_by != user.id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Só quem criou o registro pode enviar a foto.")
    if not (photo.content_type or "").startswith("image/"):
        raise HTTPException(status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, "Envie um arquivo de imagem.")

    incoming = tasks.incoming_dir()
    incoming.mkdir(parents=True, exist_ok=True)
    incoming_name = uuid.uuid4().hex  # nome gerado aqui: o nome enviado pelo cliente nunca vira caminho
    target = incoming / incoming_name

    size = 0
    try:
        with target.open("wb") as out:
            while chunk := await photo.read(1024 * 1024):
                size += len(chunk)
                if size > settings.max_photo_bytes:
                    raise HTTPException(
                        status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        f"A foto passa de {settings.max_photo_bytes // (1024 * 1024)} MB.",
                    )
                out.write(chunk)
    except HTTPException:
        target.unlink(missing_ok=True)
        raise

    if size == 0:
        target.unlink(missing_ok=True)
        raise HTTPException(422, "Arquivo de foto vazio.")

    if not await _enqueue(tasks.process_report_photo, str(report.id), incoming_name):
        target.unlink(missing_ok=True)
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE, "Processamento de fotos indisponível. Tente mais tarde."
        )

    report.photo_status = "processing"
    await session.commit()
    await session.refresh(report)
    return report


@router.delete("/{report_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_report(
    report_id: uuid.UUID,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> Response:
    report = await _get_report(session, report_id)
    if report.created_by != user.id and not _is_staff(user, report):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Você só pode excluir os registros que criou.")

    await session.delete(report)
    await session.commit()
    shutil.rmtree(tasks.public_dir() / "reports" / str(report_id), ignore_errors=True)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
