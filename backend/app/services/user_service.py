"""User service for database operations."""

from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User


async def get_user_by_email(db: AsyncSession, email: str) -> Optional[User]:
    """Get a user by their email address."""
    result = await db.execute(select(User).where(User.email == email))
    return result.scalar_one_or_none()


async def get_or_create_user(db: AsyncSession, email: str, name: Optional[str] = None) -> User:
    """
    Get an existing user or create a new one.

    This is the primary way users are created - on first API access with a valid Clerk token.
    """
    user = await get_user_by_email(db, email)

    if user is None:
        user = User(
            email=email,
            name=name,
            preferences={
                "theme": "system",
                "defaultVoiceEnabled": True,
                "autoPlayVoice": False,
            },
        )
        db.add(user)
        await db.flush()  # Get the ID without committing

    return user


async def update_user_preferences(
    db: AsyncSession,
    user: User,
    preferences: dict,
) -> User:
    """Update user preferences (partial update)."""
    current_prefs = user.preferences or {}
    updated_prefs = {**current_prefs, **preferences}
    user.preferences = updated_prefs
    await db.flush()
    return user
