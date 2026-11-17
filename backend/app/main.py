from fastapi import APIRouter, Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1 import auth, reports
from app.config import settings
from app.db import get_session
from app.worker.tasks import public_dir

app = FastAPI(
    title="ComuniMap API",
    version="0.1.0",
    description="Mapeamento urbano colaborativo: perigos, doações e pontos comunitários.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_methods=["*"],
    allow_headers=["*"],
)

api_v1 = APIRouter(prefix="/api/v1")
api_v1.include_router(auth.router)
api_v1.include_router(reports.router)
app.include_router(api_v1)

# Só a pasta public/ é servida; uploads ainda não validados ficam em incoming/, fora dela.
public_dir().mkdir(parents=True, exist_ok=True)
app.mount("/media", StaticFiles(directory=public_dir()), name="media")


@app.get("/health", tags=["infra"])
async def health(session: AsyncSession = Depends(get_session)) -> dict[str, str]:
    try:
        await session.execute(text("SELECT 1"))
    except Exception:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "Banco de dados indisponível.") from None
    return {"status": "ok"}
