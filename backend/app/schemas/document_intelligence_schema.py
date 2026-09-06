from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class DocumentDetailResponse(BaseModel):
    id: int
    filename: str
    mime_type: str | None = None
    storage_path: str
    status: str
    created_at: datetime
    chunk_count: int
    page_count: int


class DocumentChunkResponse(BaseModel):
    id: int
    document_id: int
    page_number: int | None = None
    chunk_index: int
    content: str
    has_embedding: bool
    metadata: dict = Field(default_factory=dict)


class DocumentSearchItem(BaseModel):
    id: int
    filename: str
    mime_type: str | None = None
    status: str
    created_at: datetime
