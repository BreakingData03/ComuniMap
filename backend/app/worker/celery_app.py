from celery import Celery

from app.config import settings

celery_app = Celery("comunimap", broker=settings.celery_broker_url, include=["app.worker.tasks"])

celery_app.conf.update(
    task_ignore_result=True,  # o resultado vai para o banco, não para um result backend
    task_acks_late=True,  # se o worker morrer no meio, a tarefa volta para a fila
    worker_prefetch_multiplier=1,
    timezone="America/Campo_Grande",
    broker_connection_retry_on_startup=True,
    # Publicação falha rápido se o Redis estiver fora, em vez de prender a requisição da API.
    broker_transport_options={"socket_connect_timeout": 2, "socket_timeout": 5},
    task_publish_retry_policy={"max_retries": 1, "interval_start": 0, "interval_step": 0.2},
)
