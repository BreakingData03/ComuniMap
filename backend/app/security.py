import time
import uuid
from datetime import UTC, datetime, timedelta

import jwt
import redis.asyncio as aioredis
from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from redis.exceptions import RedisError
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.db import get_session
from app.models import User

ALGORITHM = "HS256"

_hasher = PasswordHasher()
_bearer = HTTPBearer(auto_error=False)
_redis = aioredis.from_url(settings.redis_url, socket_connect_timeout=1, socket_timeout=1)

# Hash de mentira para gastar o mesmo tempo quando o e-mail não existe (não revela quem tem conta).
_DUMMY_HASH = _hasher.hash("comunimap-dummy-password")


def hash_password(password: str) -> str:
    return _hasher.hash(password)


def verify_password(password: str, password_hash: str | None) -> bool:
    try:
        return _hasher.verify(password_hash or _DUMMY_HASH, password) and password_hash is not None
    except (VerificationError, InvalidHashError):
        return False


def create_access_token(user_id: uuid.UUID) -> str:
    now = datetime.now(UTC)
    payload = {
        "sub": str(user_id),
        "iat": now,
        "exp": now + timedelta(minutes=settings.access_token_ttl_minutes),
    }
    return jwt.encode(payload, settings.secret_key, algorithm=ALGORITHM)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
    session: AsyncSession = Depends(get_session),
) -> User:
    unauthorized = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Faça login para continuar.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if credentials is None:
        raise unauthorized
    try:
        payload = jwt.decode(credentials.credentials, settings.secret_key, algorithms=[ALGORITHM])
        user_id = uuid.UUID(payload["sub"])
    except (jwt.PyJWTError, KeyError, ValueError):
        raise unauthorized from None

    user = await session.get(User, user_id)
    if user is None:
        raise unauthorized
    return user


def rate_limit(name: str, limit: int, window_seconds: int):
    """Limite simples por IP em janela fixa, no Redis. Se o Redis cair, deixa passar."""

    async def dependency(request: Request) -> None:
        if not settings.rate_limit_enabled:
            return
        ip = request.client.host if request.client else "unknown"
        key = f"rl:{name}:{ip}:{int(time.time()) // window_seconds}"
        try:
            count = await _redis.incr(key)
            if count == 1:
                await _redis.expire(key, window_seconds)
        except RedisError:
            return
        if count > limit:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Muitas tentativas. Aguarde um instante e tente de novo.",
            )

    return dependency
