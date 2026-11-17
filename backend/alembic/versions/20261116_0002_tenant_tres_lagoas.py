"""Tenant inicial: Prefeitura de Três Lagoas

Revision ID: 0002
Revises: 0001
Create Date: 2026-11-16
"""
from collections.abc import Sequence

from alembic import op

revision: str = "0002"
down_revision: str | None = "0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

# ATENÇÃO: retângulo APROXIMADO em volta da área urbana de Três Lagoas-MS, só para o
# ambiente local funcionar. Antes do piloto, trocar pela malha municipal oficial do IBGE.
BOUNDARY_WKT = (
    "MULTIPOLYGON(((-51.85 -20.92, -51.55 -20.92, -51.55 -20.66, -51.85 -20.66, -51.85 -20.92)))"
)


def upgrade() -> None:
    op.execute(
        f"""
        INSERT INTO tenants (id, slug, name, kind, boundary)
        VALUES (
            '7d0f3b52-2c1e-4a53-9d36-0c6f5f1d3a01',
            'tres-lagoas',
            'Prefeitura de Três Lagoas',
            'prefeitura',
            ST_GeomFromText('{BOUNDARY_WKT}', 4326)
        )
        ON CONFLICT (slug) DO NOTHING
        """
    )


def downgrade() -> None:
    op.execute("DELETE FROM tenants WHERE slug = 'tres-lagoas'")
