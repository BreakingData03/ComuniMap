FROM python:3.13-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# requirements-dev inclui pytest/ruff: esta imagem é a de desenvolvimento local.
COPY requirements.txt requirements-dev.txt ./
RUN pip install -r requirements-dev.txt

# Usuário sem privilégio; a pasta de mídia nasce com o dono certo para o volume herdar.
RUN useradd --create-home --uid 1000 app \
    && mkdir -p /data/media \
    && chown -R app:app /data/media /app

COPY --chown=app:app . .

USER app
EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
