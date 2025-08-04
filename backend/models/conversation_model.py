#conversation_model.py
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
from datetime import datetime
from models.db import db
import enum

class RoleEnum(enum.Enum):
    user = "user"
    ai = "ai"

class Conversation(db.Model):
    __tablename__ = "Conversations"

    id = Column(Integer, primary_key=True)
    user_id = Column(String(255), nullable=False)
    title = Column(String(255))
    created_at = Column(DateTime, default=datetime.utcnow)

    messages = relationship("Message", back_populates="conversation", cascade="all, delete")

class Message(db.Model):
    __tablename__ = "Messages"

    id = Column(Integer, primary_key=True)
    conversation_id = Column(Integer, ForeignKey("Conversations.id"), nullable=False)
    role = Column(Enum(RoleEnum), nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    conversation = relationship("Conversation", back_populates="messages")
