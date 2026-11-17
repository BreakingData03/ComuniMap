from sqlalchemy import text

AUTH = "/api/v1/auth"
PESSOA = {"name": "João da Silva", "email": "Joao@Exemplo.com", "password": "segredo123"}


async def test_cadastro_login_e_me(client):
    res = await client.post(f"{AUTH}/register", json=PESSOA)
    assert res.status_code == 201, res.text
    assert res.json()["email"] == "joao@exemplo.com"  # e-mail normalizado
    assert "password" not in res.text

    login = await client.post(f"{AUTH}/login", json={"email": "JOAO@exemplo.com", "password": "segredo123"})
    assert login.status_code == 200, login.text
    token = login.json()["access_token"]

    me = await client.get(f"{AUTH}/me", headers={"Authorization": f"Bearer {token}"})
    assert me.status_code == 200
    assert me.json()["name"] == "João da Silva"
    assert me.json()["role"] == "citizen"


async def test_senha_e_guardada_com_hash(client):
    await client.post(f"{AUTH}/register", json=PESSOA)

    from app.db import engine

    async with engine.connect() as conn:
        stored = (await conn.execute(text("SELECT password_hash FROM users"))).scalar_one()
    assert stored.startswith("$argon2")
    assert "segredo123" not in stored


async def test_email_repetido_da_409(client):
    await client.post(f"{AUTH}/register", json=PESSOA)
    res = await client.post(f"{AUTH}/register", json={**PESSOA, "email": "joao@exemplo.com"})
    assert res.status_code == 409


async def test_login_errado_da_401(client):
    await client.post(f"{AUTH}/register", json=PESSOA)

    errada = await client.post(f"{AUTH}/login", json={"email": "joao@exemplo.com", "password": "outra-senha"})
    inexistente = await client.post(f"{AUTH}/login", json={"email": "ninguem@exemplo.com", "password": "x"})

    assert errada.status_code == 401
    assert inexistente.status_code == 401
    assert errada.json() == inexistente.json()  # não revela se o e-mail existe


async def test_me_sem_token_ou_com_token_invalido(client):
    assert (await client.get(f"{AUTH}/me")).status_code == 401
    assert (await client.get(f"{AUTH}/me", headers={"Authorization": "Bearer lixo"})).status_code == 401


async def test_senha_curta_e_recusada(client):
    res = await client.post(f"{AUTH}/register", json={**PESSOA, "password": "123"})
    assert res.status_code == 422
