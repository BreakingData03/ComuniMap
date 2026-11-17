"""Tarefas em segundo plano: processamento de fotos e moderação.

O worker usa SQLAlchemy síncrono (Celery não roda em event loop), com a mesma URL da API.
"""

import logging
import secrets
import uuid
from pathlib import Path

from PIL import Image, ImageOps, UnidentifiedImageError
from sqlalchemy import create_engine, select, update
from sqlalchemy.orm import Session

from app.config import settings
from app.models import Report
from app.worker.celery_app import celery_app

logger = logging.getLogger(__name__)

MAX_SIDE = 1600
THUMB_SIDE = 400
# Acima disso o Pillow recusa a imagem (proteção contra "bomba de descompressão").
Image.MAX_IMAGE_PIXELS = 50_000_000

_engine = create_engine(settings.database_url, pool_pre_ping=True)


def media_root() -> Path:
    return Path(settings.media_root)


def public_dir() -> Path:
    """Única pasta servida em /media. Uploads crus ficam fora dela, em incoming/."""
    return media_root() / "public"


def incoming_dir() -> Path:
    return media_root() / "incoming"


def _unlink(*paths: Path | None) -> None:
    for path in paths:
        if path is not None:
            path.unlink(missing_ok=True)


def process_photo_file(report_id: uuid.UUID, incoming_name: str) -> str:
    """Valida o upload, regrava como WebP (o que descarta EXIF/GPS) e gera a miniatura.

    Devolve o photo_status final: 'ready' ou 'rejected'.
    """
    source = incoming_dir() / Path(incoming_name).name  # .name: nunca sai de incoming/

    with Session(_engine) as session:
        report = session.get(Report, report_id)
        if report is None:
            _unlink(source)
            return "rejected"

        old_files = [public_dir() / p for p in (report.photo_path, report.photo_thumb_path) if p]

        try:
            with Image.open(source) as original:
                # Regravar a partir dos pixels garante que o arquivo final é de fato uma imagem.
                image = ImageOps.exif_transpose(original).convert("RGB")
        except (UnidentifiedImageError, OSError, ValueError, Image.DecompressionBombError):
            logger.warning("Foto rejeitada para o reporte %s", report_id)
            session.execute(update(Report).where(Report.id == report_id).values(photo_status="rejected"))
            session.commit()
            _unlink(source)
            return "rejected"

        token = secrets.token_hex(8)
        relative = Path("reports") / str(report_id)
        target_dir = public_dir() / relative
        target_dir.mkdir(parents=True, exist_ok=True)

        image.thumbnail((MAX_SIDE, MAX_SIDE))
        image.save(target_dir / f"{token}.webp", "WEBP", quality=80, method=4)

        thumb = image.copy()
        thumb.thumbnail((THUMB_SIDE, THUMB_SIDE))
        thumb.save(target_dir / f"{token}_thumb.webp", "WEBP", quality=75, method=4)

        session.execute(
            update(Report)
            .where(Report.id == report_id)
            .values(
                photo_path=(relative / f"{token}.webp").as_posix(),
                photo_thumb_path=(relative / f"{token}_thumb.webp").as_posix(),
                photo_status="ready",
            )
        )
        session.commit()

    _unlink(source, *old_files)
    return "ready"


def moderate_text(report_id: uuid.UUID) -> str:
    """Moderação automática mínima: segura (flagged) registros com termos da blocklist.

    É o gancho para uma moderação de verdade (serviço externo ou fila de revisão humana).
    Com a blocklist vazia, tudo é aprovado.
    """
    with Session(_engine) as session:
        row = session.execute(
            select(Report.title, Report.description, Report.neighborhood, Report.street).where(
                Report.id == report_id
            )
        ).one_or_none()
        if row is None:
            return "missing"

        text = " ".join(part for part in row if part).lower()
        verdict = "flagged" if any(term in text for term in settings.blocklist_terms) else "approved"

        session.execute(update(Report).where(Report.id == report_id).values(moderation_status=verdict))
        session.commit()
        return verdict


@celery_app.task(name="reports.process_photo")
def process_report_photo(report_id: str, incoming_name: str) -> str:
    return process_photo_file(uuid.UUID(report_id), incoming_name)


@celery_app.task(name="reports.moderate")
def moderate_report(report_id: str) -> str:
    return moderate_text(uuid.UUID(report_id))
