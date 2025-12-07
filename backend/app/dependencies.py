"""FastAPI dependencies for dependency injection."""

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.clerk import verify_clerk_token
from app.db.session import get_db_session
from app.models.user import User
from app.services.user_service import get_or_create_user


async def get_current_user(
    db: AsyncSession = Depends(get_db_session),
    token_data: dict = Depends(verify_clerk_token),
) -> User:
    """
    Get the current authenticated user.

    Creates a new user record if this is their first API access.
    Uses the email from the Clerk JWT token.
    """
    user = await get_or_create_user(db, email=token_data["email"])
    return user
