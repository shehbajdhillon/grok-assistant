"""Main API router that combines all route modules."""

from fastapi import APIRouter

from .assistants import router as assistants_router
from .conversations import router as conversations_router
from .messages import router as messages_router
from .users import router as users_router

# Main API router
api_router = APIRouter(prefix="/api")

# Include all route modules
api_router.include_router(users_router)
api_router.include_router(assistants_router)
api_router.include_router(conversations_router)
api_router.include_router(messages_router)
