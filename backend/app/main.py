"""FastAPI application entry point."""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.config import settings
from app.db.seed import seed_system_assistants
from app.db.session import async_session_maker

# Configure logging
logging.basicConfig(
    level=logging.DEBUG if settings.DEBUG else logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    # Startup
    logger.info("Starting AI Companion Backend...")

    # Seed system assistants
    try:
        async with async_session_maker() as session:
            count = await seed_system_assistants(session)
            if count > 0:
                logger.info(f"Seeded {count} system assistants")
            else:
                logger.info("System assistants already seeded")
    except Exception as e:
        logger.warning(f"Could not seed database (may not be initialized): {e}")

    yield

    # Shutdown
    logger.info("Shutting down AI Companion Backend...")


# Create FastAPI application
app = FastAPI(
    title="AI Companion API",
    description="Backend API for AI Companion - a Jarvis-style AI assistant platform",
    version="0.1.0",
    lifespan=lifespan,
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(api_router)


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "service": "ai-companion-backend"}


@app.get("/health/letta")
async def letta_health_check():
    """Check Letta connectivity."""
    from app.services.letta_service import letta_service
    try:
        # Try to list agents - this will fail if Letta is unreachable
        agents = letta_service.client.agents.list()
        return {
            "status": "healthy",
            "service": "letta",
            "agent_count": len(agents) if agents else 0,
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "service": "letta",
            "error": str(e),
        }


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "message": "AI Companion API",
        "docs": "/docs",
        "health": "/health",
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
    )
