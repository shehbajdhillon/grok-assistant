"""Conversation service for database operations."""

from typing import List, Optional
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.assistant import Assistant
from app.models.conversation import Conversation
from app.models.message import Message
from app.models.user import User


async def get_user_conversations(
    db: AsyncSession,
    user: User,
    limit: int = 50,
    offset: int = 0,
    assistant_id: Optional[UUID] = None,
) -> tuple[List[Conversation], int]:
    """
    Get conversations for a user.

    Returns a tuple of (conversations, total_count).
    """
    query = (
        select(Conversation)
        .where(Conversation.user_id == user.id)
        .options(selectinload(Conversation.assistant))
    )

    if assistant_id:
        query = query.where(Conversation.assistant_id == assistant_id)

    # Get total count
    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar() or 0

    # Get paginated results, sorted by updated_at desc
    query = query.order_by(Conversation.updated_at.desc()).offset(offset).limit(limit)
    result = await db.execute(query)
    conversations = list(result.scalars().all())

    return conversations, total


async def get_conversation_by_id(
    db: AsyncSession,
    conversation_id: UUID,
    include_messages: bool = False,
) -> Optional[Conversation]:
    """Get a conversation by ID."""
    query = select(Conversation).where(Conversation.id == conversation_id)

    if include_messages:
        query = query.options(
            selectinload(Conversation.messages),
            selectinload(Conversation.assistant),
        )
    else:
        query = query.options(selectinload(Conversation.assistant))

    result = await db.execute(query)
    return result.scalar_one_or_none()


async def create_conversation(
    db: AsyncSession,
    user: User,
    assistant: Assistant,
    title: str,
    letta_agent_id: Optional[str] = None,
) -> Conversation:
    """Create a new conversation."""
    conversation = Conversation(
        user_id=user.id,
        assistant_id=assistant.id,
        title=title,
        letta_agent_id=letta_agent_id,
    )
    db.add(conversation)
    await db.flush()

    # Reload with relationships
    await db.refresh(conversation)
    return conversation


async def update_conversation_title(
    db: AsyncSession,
    conversation: Conversation,
    title: str,
) -> Conversation:
    """Update conversation title."""
    conversation.title = title
    await db.flush()
    return conversation


async def delete_conversation(
    db: AsyncSession,
    conversation: Conversation,
) -> bool:
    """Delete a conversation (cascades to messages)."""
    await db.delete(conversation)
    await db.flush()
    return True


async def add_message(
    db: AsyncSession,
    conversation: Conversation,
    role: str,
    content: str,
    audio_url: Optional[str] = None,
) -> Message:
    """Add a message to a conversation."""
    message = Message(
        conversation_id=conversation.id,
        role=role,
        content=content,
        audio_url=audio_url,
    )
    db.add(message)
    await db.flush()

    # Update conversation title if first user message
    if role == "user":
        messages_count = await db.scalar(
            select(func.count()).where(Message.conversation_id == conversation.id)
        )
        if messages_count == 1:  # This is the first message
            title = content[:50] + ("..." if len(content) > 50 else "")
            conversation.title = title

    return message


async def get_message_count(
    db: AsyncSession,
    conversation_id: UUID,
) -> int:
    """Get the number of messages in a conversation."""
    result = await db.scalar(
        select(func.count()).where(Message.conversation_id == conversation_id)
    )
    return result or 0
