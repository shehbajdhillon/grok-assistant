"""Assistant API endpoints."""

from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db_session
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.assistant import (
    AssistantCreate,
    AssistantGenerateRequest,
    AssistantGenerateResponse,
    AssistantListResponse,
    AssistantResponse,
    AssistantUpdate,
)
from app.services import assistant_service
from app.services.assistant_generation_service import assistant_generation_service

router = APIRouter(prefix="/assistants", tags=["assistants"])


@router.post("/generate", response_model=AssistantGenerateResponse)
async def generate_assistant(
    data: AssistantGenerateRequest,
    _: User = Depends(get_current_user),
) -> AssistantGenerateResponse:
    """
    Generate assistant configuration from natural language prompt.

    Uses xAI/Grok to create form values based on user description.
    Returns generated data for user to review and edit before saving.
    """
    try:
        generated = await assistant_generation_service.generate_assistant(data.prompt)
        return AssistantGenerateResponse(**generated)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to generate assistant")


@router.get("", response_model=AssistantListResponse)
async def list_public_assistants(
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    tag: Optional[str] = Query(default=None),
    db: AsyncSession = Depends(get_db_session),
    _: User = Depends(get_current_user),  # Require auth but don't use user
) -> AssistantListResponse:
    """List public assistants for discovery."""
    assistants, total = await assistant_service.get_public_assistants(
        db, limit=limit, offset=offset, tag=tag
    )
    return AssistantListResponse(
        items=[AssistantResponse.from_orm_with_mapping(a) for a in assistants],
        total=total,
        limit=limit,
        offset=offset,
    )


@router.get("/me", response_model=AssistantListResponse)
async def list_my_assistants(
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> AssistantListResponse:
    """List assistants created by the current user."""
    assistants = await assistant_service.get_user_assistants(db, current_user)
    return AssistantListResponse(
        items=[AssistantResponse.from_orm_with_mapping(a) for a in assistants],
        total=len(assistants),
        limit=len(assistants),
        offset=0,
    )


@router.get("/{assistant_id}", response_model=AssistantResponse)
async def get_assistant(
    assistant_id: UUID,
    db: AsyncSession = Depends(get_db_session),
    _: User = Depends(get_current_user),
) -> AssistantResponse:
    """Get a single assistant by ID."""
    assistant = await assistant_service.get_assistant_by_id(db, assistant_id)
    if not assistant:
        raise HTTPException(status_code=404, detail="Assistant not found")
    return AssistantResponse.from_orm_with_mapping(assistant)


@router.post("", response_model=AssistantResponse, status_code=201)
async def create_assistant(
    data: AssistantCreate,
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> AssistantResponse:
    """Create a new assistant."""
    assistant = await assistant_service.create_assistant(
        db,
        user=current_user,
        name=data.name,
        description=data.description,
        personality=data.personality,
        tone=data.tone,
        voice_settings=data.voiceSettings.model_dump(),
        avatar_emoji=data.avatarEmoji,
        avatar_url=data.avatarUrl,
        is_public=data.isPublic,
        tags=data.tags,
    )
    return AssistantResponse.from_orm_with_mapping(assistant)


@router.put("/{assistant_id}", response_model=AssistantResponse)
async def update_assistant(
    assistant_id: UUID,
    data: AssistantUpdate,
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> AssistantResponse:
    """Update an assistant (owner only)."""
    assistant = await assistant_service.get_assistant_by_id(db, assistant_id)
    if not assistant:
        raise HTTPException(status_code=404, detail="Assistant not found")

    # Check ownership (system assistants cannot be edited)
    if assistant.is_system:
        raise HTTPException(status_code=403, detail="Cannot modify system assistants")
    if assistant.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="You don't own this assistant")

    # Build updates dict with field name mapping
    updates = {}
    if data.name is not None:
        updates["name"] = data.name
    if data.description is not None:
        updates["description"] = data.description
    if data.personality is not None:
        updates["personality"] = data.personality
    if data.tone is not None:
        updates["tone"] = data.tone
    if data.voiceSettings is not None:
        updates["voice_settings"] = data.voiceSettings.model_dump()
    if data.avatarEmoji is not None:
        updates["avatar_emoji"] = data.avatarEmoji
    if data.avatarUrl is not None:
        updates["avatar_url"] = data.avatarUrl
    if data.isPublic is not None:
        updates["is_public"] = data.isPublic
    if data.tags is not None:
        updates["tags"] = data.tags

    assistant = await assistant_service.update_assistant(db, assistant, **updates)
    return AssistantResponse.from_orm_with_mapping(assistant)


@router.delete("/{assistant_id}", status_code=204)
async def delete_assistant(
    assistant_id: UUID,
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> None:
    """Delete an assistant (owner only)."""
    assistant = await assistant_service.get_assistant_by_id(db, assistant_id)
    if not assistant:
        raise HTTPException(status_code=404, detail="Assistant not found")

    # Check ownership (system assistants cannot be deleted)
    if assistant.is_system:
        raise HTTPException(status_code=403, detail="Cannot delete system assistants")
    if assistant.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="You don't own this assistant")

    await assistant_service.delete_assistant(db, assistant)
