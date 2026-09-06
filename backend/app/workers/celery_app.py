from celery import Celery
from app.core.config import settings

celery = Celery("DocMind AI", broker=settings.redis_url, backend=settings.redis_url)
celery.conf.task_default_queue = "documents"


@celery.task
def process_document_task(document_id: int):
    from app.db.session import SessionLocal
    from app.models.document import Document
    from app.services.ingestion import process_document

    db = SessionLocal()
    try:
        document = db.get(Document, document_id)
        if document:
            process_document(db, document)
    finally:
        db.close()
