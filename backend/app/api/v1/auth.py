from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_session
from app.models import User
from app.schemas.user import LoginRequest, TokenOut, UserCreate, UserOut
from app.security import create_access_token, get_current_user, hash_password, rate_limit, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post(
    "/register",
    response_model=UserOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(rate_limit("register", limit=10, window_seconds=3600))],
)
async def register(data: UserCreate, session: AsyncSession = Depends(get_session)) -> User:
    user = User(name=data.name, email=data.email, password_hash=hash_password(data.password))
    session.add(user)
    try:
        await session.commit()
    except IntegrityError:
        await session.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, "E-mail já cadastrado! Faça login.") from None
    return user


@router.post(
    "/login",
    response_model=TokenOut,
    dependencies=[Depends(rate_limit("login", limit=10, window_seconds=300))],
)
async def login(data: LoginRequest, session: AsyncSession = Depends(get_session)) -> TokenOut:
    email = data.email.strip().lower()
    user = (await session.execute(select(User).where(User.email == email))).scalar_one_or_none()
    if not verify_password(data.password, user.password_hash if user else None) or user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "E-mail ou senha incorretos!")
    return TokenOut(access_token=create_access_token(user.id), user=UserOut.model_validate(user))


@router.get("/me", response_model=UserOut)
async def me(user: User = Depends(get_current_user)) -> User:
    return user
