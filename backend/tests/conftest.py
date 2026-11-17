"""Os testes rodam num banco SEPARADO (<nome>_test), criado aqui e limpo a cada teste.

O banco de desenvolvimento nunca é tocado: a URL é trocada antes de qualquer import de `app`,
e a limpeza se recusa a rodar se o nome do banco não terminar em `_test`.
"""

import os
import tempfile
import uuid

import psycopg
from sqlalchemy.engine import make_url

_dev_url = make_url(
    os.environ.get("DATABASE_URL", "postgresql+psycopg://comunimap:comunimap@localhost:5442/comunimap")
)
_base_name = _dev_url.database.removesuffix("_test")
TEST_DB = f"{_base_name}_test"
_test_url = _dev_url.set(database=TEST_DB)

os.environ["DATABASE_URL"] = _test_url.render_as_string(hide_password=False)
os.environ["RATE_LIMIT_ENABLED"] = "false"
os.environ["MEDIA_ROOT"] = tempfile.mkdtemp(prefix="comunimap-test-media-")
os.environ["MODERATION_BLOCKLIST"] = "palavraproibida"

import pytest  # noqa: E402
import pytest_asyncio  # noqa: E402
from alembic.config import Config  # noqa: E402
from httpx import ASGITransport, AsyncClient  # noqa: E402
from sqlalchemy import text  # noqa: E402

from alembic import command  # noqa: E402

# Dentro de Três Lagoas (cai no polígono do tenant semeado pela migração).
BASE_LAT = -20.7849
BASE_LNG = -51.6997
METER_IN_LAT_DEGREES = 1 / 111_320


def _admin_dsn() -> str:
    return _dev_url.set(drivername="postgresql", database="postgres").render_as_string(hide_password=False)


@pytest.fixture(scope="session", autouse=True)
def _database():
    with psycopg.connect(_admin_dsn(), autocommit=True) as conn:
        exists = conn.execute("SELECT 1 FROM pg_database WHERE datname = %s", (TEST_DB,)).fetchone()
        if not exists:
            conn.execute(f'CREATE DATABASE "{TEST_DB}"')

    # Sobe o schema pelas migrações de verdade: o teste também valida o Alembic.
    command.upgrade(Config("alembic.ini"), "head")
    yield


@pytest_asyncio.fixture(autouse=True)
async def _clean_tables(_database):
    from app.db import engine

    assert engine.url.database.endswith("_test"), "Recusando limpar um banco que não é de teste"
    yield
    async with engine.begin() as conn:
        # tenants fica: é dado de referência semeado pela migração.
        await conn.execute(text("TRUNCATE report_votes, reports, users RESTART IDENTITY CASCADE"))


@pytest.fixture(autouse=True)
def _no_celery(monkeypatch):
    """Nenhum teste publica no broker; as tarefas são chamadas direto quando interessam."""
    from app.worker import tasks

    calls: list[tuple] = []
    for task in (tasks.process_report_photo, tasks.moderate_report):
        monkeypatch.setattr(task, "delay", lambda *args, _name=task.name: calls.append((_name, *args)))
    return calls


@pytest_asyncio.fixture
async def client():
    from app.main import app

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c


async def make_user(client: AsyncClient, name: str = "Maria") -> dict[str, str]:
    """Cadastra, faz login e devolve os headers de autenticação."""
    email = f"{uuid.uuid4().hex[:10]}@exemplo.com"
    res = await client.post("/api/v1/auth/register", json={"name": name, "email": email, "password": "segredo123"})
    assert res.status_code == 201, res.text
    res = await client.post("/api/v1/auth/login", json={"email": email, "password": "segredo123"})
    assert res.status_code == 200, res.text
    return {"Authorization": f"Bearer {res.json()['access_token']}"}


def perigo(meters_north: float = 0.0, **overrides) -> dict:
    """Payload de um perigo deslocado N metros ao norte do ponto base."""
    payload = {
        "category": "perigo",
        "title": "Buraco na via",
        "description": "Buraco grande na pista.",
        "neighborhood": "Centro",
        "street": "Rua Paranaíba",
        "risk_level": "alto",
        "lat": BASE_LAT + meters_north * METER_IN_LAT_DEGREES,
        "lng": BASE_LNG,
    }
    payload.update(overrides)
    return payload
