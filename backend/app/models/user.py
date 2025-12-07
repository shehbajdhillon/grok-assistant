import uuid
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base, TimestampMixin, UUIDMixin

if TYPE_CHECKING:
    from .assistant import Assistant
    from .conversation import Conversation


class User(Base, UUIDMixin, TimestampMixin):
    """User model - linked to Clerk authentication via email."""

    __tablename__ = "users"

    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    avatar_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # User preferences stored as JSONB for flexibility
    preferences: Mapped[dict] = mapped_column(
        JSONB,
        nullable=False,
        default=lambda: {
            "theme": "system",
            "defaultVoiceEnabled": True,
            "autoPlayVoice": False,
        },
    )

    # Relationships
    created_assistants: Mapped[List["Assistant"]] = relationship(
        "Assistant",
        back_populates="creator",
        cascade="all, delete-orphan",
        foreign_keys="Assistant.created_by",
    )
    conversations: Mapped[List["Conversation"]] = relationship(
        "Conversation",
        back_populates="user",
        cascade="all, delete-orphan",
    )
