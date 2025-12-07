"""Pydantic schemas for Assistant."""

from datetime import datetime
from typing import List, Literal, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

# Type aliases matching frontend types
VoiceId = Literal["ara", "rex", "eve", "leo", "una", "sal"]

# Map old OpenAI voice IDs to xAI voices (for backwards compatibility)
VOICE_ID_MIGRATION: dict[str, str] = {
    "alloy": "ara",
    "echo": "rex",
    "fable": "eve",
    "onyx": "leo",
    "nova": "una",
    "shimmer": "sal",
}


def migrate_voice_settings(voice_settings: dict | None) -> dict:
    """Migrate old voice IDs to new xAI voice IDs."""
    settings = voice_settings.copy() if voice_settings else {"voiceId": "ara", "speed": 1.0, "pitch": 1.0}
    old_voice_id = settings.get("voiceId", "ara")
    settings["voiceId"] = VOICE_ID_MIGRATION.get(old_voice_id, old_voice_id)
    return settings


TonePreset = Literal[
    # Positive tones
    "professional",
    "friendly",
    "humorous",
    "empathetic",
    "motivational",
    "cheerful",
    "playful",
    "enthusiastic",
    "warm",
    "supportive",
    # Neutral tones
    "casual",
    "formal",
    "mysterious",
    "calm",
    "analytical",
    "stoic",
    "philosophical",
    # Negative tones
    "sarcastic",
    "blunt",
    "cynical",
    "melancholic",
    "stern",
    "dramatic",
    "pessimistic",
]


class VoiceSettings(BaseModel):
    """Voice settings schema."""

    voiceId: VoiceId = "ara"
    speed: float = Field(default=1.0, ge=0.5, le=2.0)
    pitch: float = Field(default=1.0, ge=0.5, le=2.0)


class AssistantBase(BaseModel):
    """Base assistant schema."""

    name: str = Field(..., min_length=1, max_length=100)
    description: str = Field(..., min_length=1, max_length=500)
    personality: str = Field(..., min_length=1)
    tone: TonePreset
    voiceSettings: VoiceSettings = Field(default_factory=VoiceSettings)
    avatarEmoji: str = Field(default="🤖", max_length=10)
    avatarUrl: Optional[str] = None
    isPublic: bool = True
    tags: List[str] = Field(default_factory=list)


class AssistantCreate(AssistantBase):
    """Schema for creating an assistant."""

    pass


class AssistantUpdate(BaseModel):
    """Schema for updating an assistant (all fields optional)."""

    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, min_length=1, max_length=500)
    personality: Optional[str] = Field(None, min_length=1)
    tone: Optional[TonePreset] = None
    voiceSettings: Optional[VoiceSettings] = None
    avatarEmoji: Optional[str] = Field(None, max_length=10)
    avatarUrl: Optional[str] = None
    isPublic: Optional[bool] = None
    tags: Optional[List[str]] = None


class AssistantResponse(AssistantBase):
    """Assistant response schema."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    createdAt: datetime
    updatedAt: datetime
    createdBy: str  # UUID string or 'system'
    usageCount: int

    @classmethod
    def from_orm_with_mapping(cls, assistant) -> "AssistantResponse":
        """Create from ORM model with field name mapping."""
        voice_settings = migrate_voice_settings(assistant.voice_settings)

        return cls(
            id=assistant.id,
            name=assistant.name,
            description=assistant.description,
            personality=assistant.personality,
            tone=assistant.tone,
            voiceSettings=VoiceSettings(**voice_settings),
            avatarEmoji=assistant.avatar_emoji,
            avatarUrl=assistant.avatar_url,
            isPublic=assistant.is_public,
            tags=assistant.tags or [],
            createdAt=assistant.created_at,
            updatedAt=assistant.updated_at,
            createdBy=str(assistant.created_by) if assistant.created_by else "system",
            usageCount=assistant.usage_count,
        )


class AssistantListResponse(BaseModel):
    """Paginated list of assistants."""

    items: List[AssistantResponse]
    total: int
    limit: int
    offset: int


class AssistantGenerateRequest(BaseModel):
    """Request schema for generating assistant from natural language."""

    prompt: str = Field(..., min_length=10, max_length=1000)


class AssistantGenerateResponse(AssistantBase):
    """Response schema with generated assistant data for form pre-fill."""

    pass
