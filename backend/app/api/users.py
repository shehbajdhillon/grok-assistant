"""User API endpoints."""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db_session
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.user import UserPreferencesUpdate, UserResponse
from app.services.user_service import update_user_preferences

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=UserResponse)
async def get_me(
    current_user: User = Depends(get_current_user),
) -> UserResponse:
    """
    Get the current user's profile.

    Creates a new user record if this is their first API access.
    """
    return UserResponse.from_orm_with_mapping(current_user)


@router.put("/me/preferences", response_model=UserResponse)
async def update_preferences(
    preferences: UserPreferencesUpdate,
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> UserResponse:
    """Update the current user's preferences."""
    # Convert to dict, excluding None values
    prefs_dict = preferences.model_dump(exclude_none=True)

    user = await update_user_preferences(db, current_user, prefs_dict)
    return UserResponse.from_orm_with_mapping(user)
