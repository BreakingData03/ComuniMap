from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.types import UserDefinedType


class Base(DeclarativeBase):
    pass


class GeographyCast(UserDefinedType):
    """Alvo de CAST(... AS geography): faz o PostGIS medir distância em metros."""

    cache_ok = True

    def get_col_spec(self, **kw: object) -> str:
        return "geography"
