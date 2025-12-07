"""Assistant service for database operations."""

from typing import List, Optional
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.assistant import Assistant
from app.models.user import User


async def get_public_assistants(
    db: AsyncSession,
    limit: int = 20,
    offset: int = 0,
    tag: Optional[str] = None,
) -> tuple[List[Assistant], int]:
    """
    Get public assistants for discovery.

    Returns a tuple of (assistants, total_count).
    """
    query = select(Assistant).where(Assistant.is_public == True)

    if tag:
        query = query.where(Assistant.tags.contains([tag]))

    # Get total count
    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar() or 0

    # Get paginated results, sorted by usage_count desc
    query = query.order_by(Assistant.usage_count.desc()).offset(offset).limit(limit)
    result = await db.execute(query)
    assistants = list(result.scalars().all())

    return assistants, total


async def get_user_assistants(
    db: AsyncSession,
    user: User,
) -> List[Assistant]:
    """Get assistants created by a specific user."""
    result = await db.execute(
        select(Assistant)
        .where(Assistant.created_by == user.id)
        .order_by(Assistant.updated_at.desc())
    )
    return list(result.scalars().all())


async def get_assistant_by_id(
    db: AsyncSession,
    assistant_id: UUID,
) -> Optional[Assistant]:
    """Get an assistant by ID."""
    result = await db.execute(select(Assistant).where(Assistant.id == assistant_id))
    return result.scalar_one_or_none()


async def create_assistant(
    db: AsyncSession,
    user: User,
    name: str,
    description: str,
    personality: str,
    tone: str,
    voice_settings: dict,
    avatar_emoji: str,
    avatar_url: Optional[str],
    is_public: bool,
    tags: List[str],
) -> Assistant:
    """Create a new assistant."""
    assistant = Assistant(
        name=name,
        description=description,
        personality=personality,
        tone=tone,
        voice_settings=voice_settings,
        avatar_emoji=avatar_emoji,
        avatar_url=avatar_url,
        is_public=is_public,
        tags=tags,
        created_by=user.id,
        is_system=False,
        usage_count=0,
    )
    db.add(assistant)
    await db.flush()
    return assistant


async def update_assistant(
    db: AsyncSession,
    assistant: Assistant,
    **updates,
) -> Assistant:
    """Update an assistant with the provided fields."""
    for key, value in updates.items():
        if value is not None and hasattr(assistant, key):
            setattr(assistant, key, value)
    await db.flush()
    return assistant


async def delete_assistant(
    db: AsyncSession,
    assistant: Assistant,
) -> bool:
    """Delete an assistant."""
    await db.delete(assistant)
    await db.flush()
    return True


async def increment_usage(
    db: AsyncSession,
    assistant: Assistant,
) -> None:
    """Increment the usage count for an assistant."""
    assistant.usage_count += 1
    await db.flush()
