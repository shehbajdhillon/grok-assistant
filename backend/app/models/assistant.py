import uuid
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import ARRAY, Boolean, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base, TimestampMixin, UUIDMixin

if TYPE_CHECKING:
    from .conversation import Conversation
    from .user import User


class Assistant(Base, UUIDMixin, TimestampMixin):
    """AI Assistant model with personality configuration."""

    __tablename__ = "assistants"

    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str] = mapped_column(String(500), nullable=False)
    personality: Mapped[str] = mapped_column(Text, nullable=False)  # System prompt

    # Tone preset: professional, casual, friendly, formal, humorous, empathetic, motivational, mysterious
    tone: Mapped[str] = mapped_column(String(50), nullable=False)

    # Voice settings stored as JSONB: {voiceId, speed, pitch}
    voice_settings: Mapped[dict] = mapped_column(
        JSONB,
        nullable=False,
        default=lambda: {"voiceId": "alloy", "speed": 1.0, "pitch": 1.0},
    )

    avatar_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    avatar_emoji: Mapped[str] = mapped_column(String(10), nullable=False, default="🤖")

    # Owner - nullable for system assistants
    created_by: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    # Flags
    is_system: Mapped[bool] = mapped_column(Boolean, default=False)
    is_public: Mapped[bool] = mapped_column(Boolean, default=True, index=True)

    # Usage tracking
    usage_count: Mapped[int] = mapped_column(Integer, default=0, index=True)

    # Tags for categorization
    tags: Mapped[List[str]] = mapped_column(ARRAY(String), default=list)

    # Relationships
    creator: Mapped[Optional["User"]] = relationship(
        "User",
        back_populates="created_assistants",
        foreign_keys=[created_by],
    )
    conversations: Mapped[List["Conversation"]] = relationship(
        "Conversation",
        back_populates="assistant",
        cascade="all, delete-orphan",
    )
