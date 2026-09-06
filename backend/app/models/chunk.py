from datetime import datetime

from pgvector.sqlalchemy import Vector
from sqlalchemy import Column, DateTime, ForeignKey, Integer, JSON, Text

from app.db.session import Base


class Chunk(Base):
    __tablename__ = "chunks"

    id = Column(Integer, primary_key=True)

    document_id = Column(
        Integer,
        ForeignKey("documents.id"),
        index=True,
        nullable=False,
    )

    content = Column(Text, nullable=False)

    page_number = Column(Integer, nullable=True)

    chunk_index = Column(Integer, nullable=False)

    metadata_json = Column(JSON, default=dict)

    embedding = Column(Vector(1024), nullable=True)

    created_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )