from pydantic import BaseModel, Field


class MessageRequest(BaseModel):
    question: str = Field(min_length=1)
    document_ids: list[int] = []


class MessageResponse(BaseModel):
    answer: str
    citations: list[dict] = []
