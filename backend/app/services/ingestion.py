from sqlalchemy import delete
from sqlalchemy.orm import Session

from app.models.chunk import Chunk
from app.models.document import Document
from app.services.parsers import extract_text
from app.services.chunking import chunk_text
from app.services.embeddings import generate_embedding


def process_document(db: Session, document: Document) -> None:
    document.status = "PROCESSING"
    db.commit()

    try:
        # Remove any previous chunks if this document is being reprocessed.
        db.execute(
            delete(Chunk).where(Chunk.document_id == document.id)
        )
        db.commit()

        pages = extract_text(
            document.storage_path,
            document.mime_type,
        )

        index = 0
        total_chunks = 0

        for page in pages:
            chunks = chunk_text(page["text"])

            for text in chunks:
                # Generate the vector embedding for this chunk.
                embedding = generate_embedding(text)

                chunk = Chunk(
                    document_id=document.id,
                    content=text,
                    page_number=page.get("page_number"),
                    chunk_index=index,
                    metadata_json={},
                    embedding=embedding,
                )

                db.add(chunk)

                index += 1
                total_chunks += 1

        # Do not mark the document READY unless chunks were created.
        if total_chunks == 0:
            raise ValueError(
                "Document processing produced no text chunks."
            )

        # Flush first so SQLAlchemy sends the chunks to PostgreSQL.
        db.flush()

        # Verify every chunk has an embedding.
        missing_embeddings = (
            db.query(Chunk)
            .filter(
                Chunk.document_id == document.id,
                Chunk.embedding.is_(None),
            )
            .count()
        )

        if missing_embeddings > 0:
            raise ValueError(
                f"{missing_embeddings} chunks are missing embeddings."
            )

        document.status = "READY"
        db.commit()

    except Exception:
        db.rollback()

        document.status = "FAILED"
        db.commit()

        raise