"""Conversation API endpoints."""

from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db_session
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.assistant import VoiceSettings, migrate_voice_settings
from app.schemas.conversation import (
    ConversationAssistantInfo,
    ConversationCreate,
    ConversationListItem,
    ConversationListResponse,
    ConversationResponse,
)
from app.services import assistant_service, conversation_service
from app.services.letta_service import letta_service

router = APIRouter(prefix="/conversations", tags=["conversations"])


@router.get("", response_model=ConversationListResponse)
async def list_conversations(
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    assistant_id: Optional[UUID] = Query(default=None),
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> ConversationListResponse:
    """List the current user's conversations."""
    conversations, total = await conversation_service.get_user_conversations(
        db, current_user, limit=limit, offset=offset, assistant_id=assistant_id
    )

    items = []
    for conv in conversations:
        message_count = await conversation_service.get_message_count(db, conv.id)
        assistant = conv.assistant
        items.append(
            ConversationListItem(
                id=conv.id,
                assistantId=conv.assistant_id,
                title=conv.title,
                createdAt=conv.created_at,
                updatedAt=conv.updated_at,
                messageCount=message_count,
                assistant=ConversationAssistantInfo(
                    id=assistant.id,
                    name=assistant.name,
                    avatarEmoji=assistant.avatar_emoji,
                    tone=assistant.tone,
                    voiceSettings=VoiceSettings(**migrate_voice_settings(assistant.voice_settings)),
                ),
            )
        )

    return ConversationListResponse(items=items, total=total)


@router.get("/{conversation_id}", response_model=ConversationResponse)
async def get_conversation(
    conversation_id: UUID,
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> ConversationResponse:
    """Get a conversation with all messages."""
    conversation = await conversation_service.get_conversation_by_id(
        db, conversation_id, include_messages=True
    )
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    # Check ownership
    if conversation.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="You don't own this conversation")

    return ConversationResponse.from_orm_with_mapping(
        conversation, include_messages=True, include_assistant=True
    )


@router.post("", response_model=ConversationResponse, status_code=201)
async def create_conversation(
    data: ConversationCreate,
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> ConversationResponse:
    """
    Create a new conversation.

    This also creates a Letta agent for long-term memory.
    """
    # Get the assistant
    assistant = await assistant_service.get_assistant_by_id(db, data.assistantId)
    if not assistant:
        raise HTTPException(status_code=404, detail="Assistant not found")

    # Create default title
    title = f"Chat with {assistant.name}"

    # Create Letta agent for this conversation
    letta_agent_id = None
    try:
        letta_agent_id = await letta_service.create_agent_for_conversation(
            assistant=assistant,
            user=current_user,
        )
    except Exception as e:
        # Log but don't fail - conversation can work without Letta
        import logging

        logging.warning(f"Failed to create Letta agent: {e}")

    # Create conversation
    conversation = await conversation_service.create_conversation(
        db,
        user=current_user,
        assistant=assistant,
        title=title,
        letta_agent_id=letta_agent_id,
    )

    # Increment assistant usage
    await assistant_service.increment_usage(db, assistant)

    # Reload to get relationships
    conversation = await conversation_service.get_conversation_by_id(
        db, conversation.id, include_messages=True
    )

    return ConversationResponse.from_orm_with_mapping(
        conversation, include_messages=True, include_assistant=True
    )


@router.delete("/{conversation_id}", status_code=204)
async def delete_conversation(
    conversation_id: UUID,
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> None:
    """
    Delete a conversation.

    This also deletes the associated Letta agent.
    """
    conversation = await conversation_service.get_conversation_by_id(db, conversation_id)
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    # Check ownership
    if conversation.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="You don't own this conversation")

    # Delete Letta agent if exists
    if conversation.letta_agent_id:
        try:
            await letta_service.delete_agent(conversation.letta_agent_id)
        except Exception as e:
            import logging

            logging.warning(f"Failed to delete Letta agent: {e}")

    # Delete conversation (cascades to messages)
    await conversation_service.delete_conversation(db, conversation)
