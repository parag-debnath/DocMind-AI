from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.chunk import Chunk
from app.services.embeddings import generate_embedding


def retrieve(
    db: Session,
    document_ids: list[int],
    question: str,
    limit: int = 5,
) -> list[dict]:
    # Convert the user's question into an embedding vector.
    query_embedding = generate_embedding(question)

    # Build the query.
    stmt = select(Chunk)

    if document_ids:
        stmt = stmt.where(Chunk.document_id.in_(document_ids))

    # Rank chunks by cosine distance.
    stmt = (
        stmt
        .where(Chunk.embedding.is_not(None))
        .order_by(Chunk.embedding.cosine_distance(query_embedding))
        .limit(limit)
    )

    chunks = db.execute(stmt).scalars().all()

    return [
        {
            "chunk_id": chunk.id,
            "document_id": chunk.document_id,
            "page_number": chunk.page_number,
            "content": chunk.content,
        }
        for chunk in chunks
    ]