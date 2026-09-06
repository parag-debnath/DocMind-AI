from __future__ import annotations

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.chunk import Chunk
from app.models.document import Document


def _document_belongs_to_user(db: Session, document_id: int, user_id: int) -> Document | None:
    stmt = select(Document).where(
        Document.id == document_id,
        Document.user_id == user_id,
    )
    return db.execute(stmt).scalar_one_or_none()


def get_document_detail(
    db: Session,
    document_id: int,
    user_id: int,
) -> dict | None:
    document = _document_belongs_to_user(db, document_id, user_id)
    if document is None:
        return None

    chunk_count = db.scalar(
        select(func.count(Chunk.id)).where(Chunk.document_id == document.id)
    ) or 0

    pages = db.scalar(
        select(func.count(func.distinct(Chunk.page_number))).where(
            Chunk.document_id == document.id,
            Chunk.page_number.is_not(None),
        )
    ) or 0

    return {
        "id": document.id,
        "filename": document.filename,
        "mime_type": document.mime_type,
        "storage_path": document.storage_path,
        "status": document.status,
        "created_at": document.created_at,
        "chunk_count": chunk_count,
        "page_count": pages,
    }


def get_document_chunks(
    db: Session,
    document_id: int,
    user_id: int,
    page_number: int | None = None,
) -> list[dict] | None:
    document = _document_belongs_to_user(db, document_id, user_id)
    if document is None:
        return None

    stmt = select(Chunk).where(Chunk.document_id == document_id)

    if page_number is not None:
        stmt = stmt.where(Chunk.page_number == page_number)

    stmt = stmt.order_by(Chunk.page_number.asc().nulls_last(), Chunk.chunk_index.asc())

    chunks = db.execute(stmt).scalars().all()

    return [
        {
            "id": chunk.id,
            "document_id": chunk.document_id,
            "page_number": chunk.page_number,
            "chunk_index": chunk.chunk_index,
            "content": chunk.content,
            "has_embedding": chunk.embedding is not None,
            "metadata": chunk.metadata_json or {},
        }
        for chunk in chunks
    ]


def search_documents(
    db: Session,
    user_id: int,
    query: str,
    limit: int = 20,
) -> list[dict]:
    """Simple lexical library search.

    This is intentionally separate from semantic RAG. Hybrid retrieval will
    combine this kind of lexical signal with pgvector retrieval later.
    """
    query = query.strip()
    if not query:
        return []

    limit = max(1, min(limit, 50))
    pattern = f"%{query}%"

    stmt = (
        select(Document)
        .where(
            Document.user_id == user_id,
            Document.filename.ilike(pattern),
        )
        .order_by(Document.id.desc())
        .limit(limit)
    )

    documents = db.execute(stmt).scalars().all()

    return [
        {
            "id": doc.id,
            "filename": doc.filename,
            "mime_type": doc.mime_type,
            "status": doc.status,
            "created_at": doc.created_at,
        }
        for doc in documents
    ]
