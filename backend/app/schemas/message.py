"""Pydantic schemas for Message."""

from datetime import datetime
from typing import Literal, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class MessageBase(BaseModel):
    """Base message schema."""

    content: str = Field(..., min_length=1)


class MessageCreate(MessageBase):
    """Schema for creating a message (user sends this)."""

    pass


class MessageResponse(BaseModel):
    """Message response schema."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    conversationId: UUID
    role: Literal["user", "assistant"]
    content: str
    audioUrl: Optional[str] = None
    createdAt: datetime

    @classmethod
    def from_orm_with_mapping(cls, message) -> "MessageResponse":
        """Create from ORM model with field name mapping."""
        return cls(
            id=message.id,
            conversationId=message.conversation_id,
            role=message.role,
            content=message.content,
            audioUrl=message.audio_url,
            createdAt=message.created_at,
        )


class SendMessageResponse(BaseModel):
    """Response from sending a message."""

    userMessage: MessageResponse
    assistantMessage: MessageResponse
