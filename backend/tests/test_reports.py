import io
import uuid

from PIL import Image
from sqlalchemy import text

from tests.conftest import make_user, perigo

REPORTS = "/api/v1/reports"


async def test_cria_reporte_dentro_do_tenant(client):
    auth = await make_user(client)

    res = await client.post(REPORTS, json=perigo(), headers=auth)

    assert res.status_code == 201, res.text
    body = res.json()
    assert body["merged"] is False
    assert body["upvotes"] == 0
    assert body["status"] == "pending"
    assert body["tenant_id"] is not None  # ponto dentro do polígono de Três Lagoas
    assert abs(body["lat"] - perigo()["lat"]) < 1e-9
    assert abs(body["lng"] - perigo()["lng"]) < 1e-9


async def test_reporte_fora_de_qualquer_tenant_fica_sem_tenant(client):
    auth = await make_user(client)

    res = await client.post(REPORTS, json=perigo(lat=-23.55, lng=-46.63), headers=auth)

    assert res.status_code == 201, res.text
    assert res.json()["tenant_id"] is None


async def test_exige_login_para_criar(client):
    res = await client.post(REPORTS, json=perigo())
    assert res.status_code == 401


# --- Regra espacial dos 15 m -------------------------------------------------------------


async def test_mesma_categoria_a_menos_de_15m_vira_upvote(client):
    autor = await make_user(client, "Autor")
    vizinho = await make_user(client, "Vizinho")

    primeiro = await client.post(REPORTS, json=perigo(), headers=autor)
    segundo = await client.post(REPORTS, json=perigo(meters_north=10, title="Cratera"), headers=vizinho)

    assert primeiro.status_code == 201
    assert segundo.status_code == 200, segundo.text
    assert segundo.json()["merged"] is True
    assert segundo.json()["id"] == primeiro.json()["id"]
    assert segundo.json()["upvotes"] == 1
    assert segundo.json()["title"] == "Buraco na via"  # o pino original não é sobrescrito

    lista = (await client.get(REPORTS)).json()
    assert lista["total"] == 1


async def test_a_mais_de_15m_cria_outro_pino(client):
    autor = await make_user(client)
    vizinho = await make_user(client)

    await client.post(REPORTS, json=perigo(), headers=autor)
    longe = await client.post(REPORTS, json=perigo(meters_north=20), headers=vizinho)

    assert longe.status_code == 201
    assert longe.json()["merged"] is False
    assert (await client.get(REPORTS)).json()["total"] == 2


async def test_categoria_diferente_no_mesmo_ponto_nao_funde(client):
    auth = await make_user(client)

    await client.post(REPORTS, json=perigo(), headers=auth)
    evento = await client.post(
        REPORTS,
        json=perigo(category="evento", title="Feira", starts_at="19:30", risk_level=None),
        headers=auth,
    )

    assert evento.status_code == 201
    assert evento.json()["merged"] is False
    assert evento.json()["starts_at"] == "19:30:00"
    assert evento.json()["risk_level"] is None


async def test_mesma_pessoa_nao_infla_upvotes(client):
    autor = await make_user(client)
    vizinho = await make_user(client)

    await client.post(REPORTS, json=perigo(), headers=autor)
    do_autor = await client.post(REPORTS, json=perigo(meters_north=3), headers=autor)
    assert do_autor.status_code == 200
    assert do_autor.json()["upvotes"] == 0  # o autor não confirma o próprio reporte

    for _ in range(3):
        res = await client.post(REPORTS, json=perigo(meters_north=5), headers=vizinho)
    assert res.json()["upvotes"] == 1  # o vizinho conta uma vez só


async def test_reporte_resolvido_nao_absorve_novo(client):
    autor = await make_user(client)
    vizinho = await make_user(client)
    primeiro = (await client.post(REPORTS, json=perigo(), headers=autor)).json()

    from app.db import engine

    async with engine.begin() as conn:
        await conn.execute(
            text("UPDATE reports SET status = 'resolved' WHERE id = :id"), {"id": uuid.UUID(primeiro["id"])}
        )

    novo = await client.post(REPORTS, json=perigo(meters_north=2), headers=vizinho)

    assert novo.status_code == 201  # o buraco voltou: é um reporte novo
    assert novo.json()["id"] != primeiro["id"]


async def test_consulta_dos_15m_usa_o_indice_espacial(client):
    """O plano do ST_DWithin em geography precisa casar com o índice de expressão."""
    from app.db import engine

    async with engine.begin() as conn:
        await conn.execute(text("SET LOCAL enable_seqscan = off"))
        plano = await conn.execute(
            text(
                "EXPLAIN SELECT id FROM reports WHERE ST_DWithin(CAST(location AS geography), "
                "CAST(ST_SetSRID(ST_MakePoint(-51.6997, -20.7849), 4326) AS geography), 15)"
            )
        )
        assert "ix_reports_location_geog" in "\n".join(row[0] for row in plano)


# --- Upvote, exclusão, status ------------------------------------------------------------


async def test_upvote_direto_conta_uma_vez(client):
    autor = await make_user(client)
    vizinho = await make_user(client)
    report = (await client.post(REPORTS, json=perigo(), headers=autor)).json()

    await client.post(f"{REPORTS}/{report['id']}/upvote", headers=vizinho)
    res = await client.post(f"{REPORTS}/{report['id']}/upvote", headers=vizinho)

    assert res.status_code == 200
    assert res.json()["upvotes"] == 1


async def test_so_o_autor_exclui(client):
    autor = await make_user(client)
    outro = await make_user(client)
    report = (await client.post(REPORTS, json=perigo(), headers=autor)).json()

    assert (await client.delete(f"{REPORTS}/{report['id']}", headers=outro)).status_code == 403
    assert (await client.delete(f"{REPORTS}/{report['id']}", headers=autor)).status_code == 204
    assert (await client.get(REPORTS)).json()["total"] == 0


async def test_cidadao_nao_muda_status(client):
    autor = await make_user(client)
    report = (await client.post(REPORTS, json=perigo(), headers=autor)).json()

    res = await client.patch(f"{REPORTS}/{report['id']}/status", json={"status": "resolved"}, headers=autor)

    assert res.status_code == 403


async def test_agente_do_tenant_muda_status_e_resolvido_sai_da_lista(client):
    autor = await make_user(client)
    agente = await make_user(client, "Agente")
    report = (await client.post(REPORTS, json=perigo(), headers=autor)).json()

    from app.db import engine

    async with engine.begin() as conn:
        await conn.execute(
            text("UPDATE users SET role = 'agent', tenant_id = :t WHERE name = 'Agente'"),
            {"t": uuid.UUID(report["tenant_id"])},
        )

    res = await client.patch(f"{REPORTS}/{report['id']}/status", json={"status": "resolved"}, headers=agente)

    assert res.status_code == 200, res.text
    assert res.json()["status"] == "resolved"
    assert (await client.get(REPORTS)).json()["total"] == 0  # padrão: só abertos
    assert (await client.get(REPORTS, params={"status": "all"})).json()["total"] == 1


# --- Validação e filtros -----------------------------------------------------------------


async def test_caridade_exige_whatsapp_de_11_digitos(client):
    auth = await make_user(client)
    base = perigo(category="caridade", title="Cestas", donation_intent="doando", item_category="Alimentos")

    assert (await client.post(REPORTS, json=base, headers=auth)).status_code == 422
    assert (
        await client.post(REPORTS, json={**base, "contact_whatsapp": "6799999"}, headers=auth)
    ).status_code == 422

    ok = await client.post(REPORTS, json={**base, "contact_whatsapp": "(67) 99999-8888"}, headers=auth)
    assert ok.status_code == 201, ok.text
    assert ok.json()["contact_whatsapp"] == "67999998888"
    assert ok.json()["risk_level"] is None  # campo de outra categoria é descartado


async def test_filtros_de_categoria_bbox_e_busca(client):
    auth = await make_user(client)
    await client.post(REPORTS, json=perigo(title="Fios soltos"), headers=auth)
    await client.post(
        REPORTS, json=perigo(meters_north=500, category="comunidade", title="Praça da Vila"), headers=auth
    )

    assert (await client.get(REPORTS, params={"category": "comunidade"})).json()["total"] == 1
    assert (await client.get(REPORTS, params={"q": "fios"})).json()["total"] == 1
    assert (await client.get(REPORTS, params={"tenant": "tres-lagoas"})).json()["total"] == 2
    perto = await client.get(REPORTS, params={"bbox": "-51.7007,-20.7859,-51.6987,-20.7839"})
    assert [r["title"] for r in perto.json()["items"]] == ["Fios soltos"]
    assert (await client.get(REPORTS, params={"bbox": "abc"})).status_code == 422


# --- Worker ------------------------------------------------------------------------------


def _jpeg(size=(3000, 2000)) -> bytes:
    buffer = io.BytesIO()
    Image.new("RGB", size, (200, 30, 30)).save(buffer, "JPEG")
    return buffer.getvalue()


async def test_foto_e_enfileirada_e_processada_em_webp(client, _no_celery):
    from app.worker import tasks

    auth = await make_user(client)
    outro = await make_user(client)
    report = (await client.post(REPORTS, json=perigo(), headers=auth)).json()
    files = {"photo": ("foto.jpg", _jpeg(), "image/jpeg")}

    assert (await client.post(f"{REPORTS}/{report['id']}/photo", files=files, headers=outro)).status_code == 403

    res = await client.post(f"{REPORTS}/{report['id']}/photo", files=files, headers=auth)
    assert res.status_code == 202, res.text
    assert res.json()["photo_status"] == "processing"

    name, report_id, incoming_name = next(c for c in _no_celery if c[0] == "reports.process_photo")
    assert tasks.process_photo_file(uuid.UUID(report_id), incoming_name) == "ready"

    pronto = (await client.get(f"{REPORTS}/{report['id']}")).json()
    assert pronto["photo_status"] == "ready"
    assert pronto["photo_url"].endswith(".webp")

    with Image.open(tasks.public_dir() / pronto["photo_url"].removeprefix("/media/")) as img:
        assert img.format == "WEBP"
        assert max(img.size) == tasks.MAX_SIDE
    assert not (tasks.incoming_dir() / incoming_name).exists()  # upload cru é apagado

    servida = await client.get(pronto["photo_thumb_url"])
    assert servida.status_code == 200
    assert servida.headers["content-type"] == "image/webp"


async def test_arquivo_que_nao_e_imagem_e_rejeitado_pelo_worker(client, _no_celery):
    from app.worker import tasks

    auth = await make_user(client)
    report = (await client.post(REPORTS, json=perigo(), headers=auth)).json()
    files = {"photo": ("foto.jpg", b"<script>alert(1)</script>", "image/jpeg")}

    await client.post(f"{REPORTS}/{report['id']}/photo", files=files, headers=auth)
    _, report_id, incoming_name = next(c for c in _no_celery if c[0] == "reports.process_photo")

    assert tasks.process_photo_file(uuid.UUID(report_id), incoming_name) == "rejected"
    depois = (await client.get(f"{REPORTS}/{report['id']}")).json()
    assert depois["photo_status"] == "rejected"
    assert depois["photo_url"] is None


async def test_moderacao_segura_termo_da_blocklist(client):
    from app.worker import tasks

    auth = await make_user(client)
    limpo = (await client.post(REPORTS, json=perigo(), headers=auth)).json()
    sujo = (
        await client.post(
            REPORTS, json=perigo(meters_north=300, description="texto com PalavraProibida"), headers=auth
        )
    ).json()

    assert tasks.moderate_text(uuid.UUID(limpo["id"])) == "approved"
    assert tasks.moderate_text(uuid.UUID(sujo["id"])) == "flagged"

    lista = (await client.get(REPORTS)).json()
    assert [r["id"] for r in lista["items"]] == [limpo["id"]]
    assert (await client.get(f"{REPORTS}/{sujo['id']}")).status_code == 404
