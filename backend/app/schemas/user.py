"""Pydantic schemas for User."""

from datetime import datetime
from typing import Literal, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr


class UserPreferences(BaseModel):
    """User preferences schema."""

    theme: Literal["light", "dark", "system"] = "system"
    defaultVoiceEnabled: bool = True
    autoPlayVoice: bool = False


class UserBase(BaseModel):
    """Base user schema."""

    email: EmailStr
    name: Optional[str] = None
    avatarUrl: Optional[str] = None


class UserResponse(UserBase):
    """User response schema."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    preferences: UserPreferences
    createdAt: datetime

    @classmethod
    def from_orm_with_mapping(cls, user) -> "UserResponse":
        """Create from ORM model with field name mapping."""
        return cls(
            id=user.id,
            email=user.email,
            name=user.name,
            avatarUrl=user.avatar_url,
            preferences=UserPreferences(**user.preferences),
            createdAt=user.created_at,
        )


class UserPreferencesUpdate(BaseModel):
    """Schema for updating user preferences."""

    theme: Optional[Literal["light", "dark", "system"]] = None
    defaultVoiceEnabled: Optional[bool] = None
    autoPlayVoice: Optional[bool] = None
