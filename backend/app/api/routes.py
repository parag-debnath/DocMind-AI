from pathlib import Path

import shutil

from fastapi import APIRouter, Depends, File, Header, HTTPException, Query, UploadFile

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import get_db

from app.models.user import User
from app.models.document import Document
from app.models.conversation import Conversation
from app.models.message import Message

from app.schemas.auth import RegisterRequest, LoginRequest, AuthResponse
from app.schemas.document import DocumentResponse
from app.schemas.document_intelligence_schema import (
    DocumentChunkResponse,
    DocumentDetailResponse,
    DocumentSearchItem,
)
from app.schemas.chat import MessageRequest, MessageResponse

from app.services.security import (
    hash_password,
    verify_password,
    create_token,
    decode_token,
)
from app.services.rag import retrieve
from app.services.ai import answer_question
from app.services.document_intelligence import (
    get_document_chunks,
    get_document_detail,
    search_documents,
)

router = APIRouter()


def current_user(authorization: str | None, db: Session) -> User:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token")
    try:
        user_id = decode_token(authorization[7:], settings.jwt_secret)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


@router.post("/auth/register", response_model=AuthResponse)
def register(data: RegisterRequest, db: Session = Depends(get_db)):
    email = data.email.lower().strip()
    if len(data.password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
    if db.execute(select(User).where(User.email == email)).scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Email is already registered")

    user = User(email=email, name=data.name.strip(), password_hash=hash_password(data.password))
    db.add(user)
    db.commit()
    db.refresh(user)
    return AuthResponse(access_token=create_token(user.id, settings.jwt_secret))


@router.post("/auth/login", response_model=AuthResponse)
def login(data: LoginRequest, db: Session = Depends(get_db)):
    user = db.execute(select(User).where(User.email == data.email.lower().strip())).scalar_one_or_none()
    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    return AuthResponse(access_token=create_token(user.id, settings.jwt_secret))


@router.get("/auth/me")
def me(authorization: str | None = Header(default=None), db: Session = Depends(get_db)):
    user = current_user(authorization, db)
    return {"id": user.id, "email": user.email, "name": user.name}


@router.get("/documents", response_model=list[DocumentResponse])
def list_documents(
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
):
    user = current_user(authorization, db)
    return db.execute(
        select(Document)
        .where(Document.user_id == user.id)
        .order_by(Document.id.desc())
    ).scalars().all()


@router.get(
    "/documents/search",
    response_model=list[DocumentSearchItem],
)
def document_search(
    q: str = Query(min_length=1, max_length=200),
    limit: int = Query(default=20, ge=1, le=50),
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
):
    user = current_user(authorization, db)
    return search_documents(db, user.id, q, limit)


@router.get(
    "/documents/{document_id}/detail",
    response_model=DocumentDetailResponse,
)
def document_detail(
    document_id: int,
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
):
    user = current_user(authorization, db)
    result = get_document_detail(db, document_id, user.id)

    if result is None:
        raise HTTPException(status_code=404, detail="Document not found")

    result["storage_path"] = ""
    return result


@router.get(
    "/documents/{document_id}/chunks",
    response_model=list[DocumentChunkResponse],
)
def document_chunks(
    document_id: int,
    page: int | None = Query(default=None, ge=1),
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
):
    user = current_user(authorization, db)
    result = get_document_chunks(
        db,
        document_id,
        user.id,
        page,
    )

    if result is None:
        raise HTTPException(status_code=404, detail="Document not found")

    return result

@router.post("/conversations")
def create_conversation(
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
):
    user = current_user(authorization, db)
    conversation = Conversation(user_id=user.id)
    db.add(conversation)
    db.commit()
    db.refresh(conversation)
    return {"id": conversation.id, "title": conversation.title}


@router.post("/conversations/{conversation_id}/messages", response_model=MessageResponse)
def send_message(
    conversation_id: int,
    data: MessageRequest,
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
):
    user = current_user(authorization, db)
    conversation = db.get(Conversation, conversation_id)
    if not conversation or conversation.user_id != user.id:
        raise HTTPException(status_code=404, detail="Conversation not found")

    db.add(Message(conversation_id=conversation.id, role="user", content=data.question))
    db.commit()

    contexts = retrieve(db, data.document_ids, data.question)
    answer = answer_question(data.question, contexts)

    db.add(Message(conversation_id=conversation.id, role="assistant", content=answer))
    db.commit()

    citations = [
        {"document_id": c["document_id"], "page_number": c["page_number"], "chunk_id": c["chunk_id"]}
        for c in contexts
    ]
    return MessageResponse(answer=answer, citations=citations)
