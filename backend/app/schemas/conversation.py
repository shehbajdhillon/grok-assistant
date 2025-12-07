"""Pydantic schemas for Conversation."""

from datetime import datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from .assistant import AssistantResponse, VoiceSettings, migrate_voice_settings
from .message import MessageResponse


class ConversationAssistantInfo(BaseModel):
    """Minimal assistant info for conversation listings."""

    id: UUID
    name: str
    avatarEmoji: str
    tone: str
    voiceSettings: Optional[VoiceSettings] = None


class ConversationBase(BaseModel):
    """Base conversation schema."""

    assistantId: UUID


class ConversationCreate(ConversationBase):
    """Schema for creating a conversation."""

    pass


class ConversationResponse(BaseModel):
    """Conversation response schema."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    assistantId: UUID
    title: str
    createdAt: datetime
    updatedAt: datetime
    messages: List[MessageResponse] = Field(default_factory=list)
    assistant: Optional[ConversationAssistantInfo] = None

    @classmethod
    def from_orm_with_mapping(
        cls,
        conversation,
        include_messages: bool = False,
        include_assistant: bool = False,
    ) -> "ConversationResponse":
        """Create from ORM model with field name mapping."""
        messages = []
        if include_messages and conversation.messages:
            messages = [
                MessageResponse.from_orm_with_mapping(msg)
                for msg in conversation.messages
            ]

        assistant_info = None
        if include_assistant and conversation.assistant:
            assistant = conversation.assistant
            assistant_info = ConversationAssistantInfo(
                id=assistant.id,
                name=assistant.name,
                avatarEmoji=assistant.avatar_emoji,
                tone=assistant.tone,
                voiceSettings=VoiceSettings(**migrate_voice_settings(assistant.voice_settings)),
            )

        return cls(
            id=conversation.id,
            assistantId=conversation.assistant_id,
            title=conversation.title,
            createdAt=conversation.created_at,
            updatedAt=conversation.updated_at,
            messages=messages,
            assistant=assistant_info,
        )


class ConversationListItem(BaseModel):
    """Conversation item for list responses (without full messages)."""

    id: UUID
    assistantId: UUID
    title: str
    createdAt: datetime
    updatedAt: datetime
    messageCount: int
    assistant: ConversationAssistantInfo


class ConversationListResponse(BaseModel):
    """Paginated list of conversations."""

    items: List[ConversationListItem]
    total: int
