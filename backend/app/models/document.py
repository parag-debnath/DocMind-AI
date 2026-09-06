from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from datetime import datetime
from app.db.session import Base


class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True, nullable=False)
    filename = Column(String(255), nullable=False)
    mime_type = Column(String(255), nullable=False)
    storage_path = Column(String(1024), nullable=False)
    status = Column(String(30), default="UPLOADED", nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
