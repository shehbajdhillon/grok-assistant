"""
FastAPI backend for the chat application.
Provides REST API endpoints for frontend communication.
"""

import os
import uuid
from datetime import datetime
from typing import Optional, List, Dict, Any
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from .chat_app import ChatApplication
from .personas import PERSONAS, get_persona, list_personas

# Global chat application instance
chat_app: Optional[ChatApplication] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for FastAPI app initialization."""
    global chat_app
    try:
        # Initialize the chat application
        chat_app = ChatApplication()
        # Set default persona
        chat_app.set_persona("personal_assistant")
        print("✓ Chat application initialized")
        print(f"  Model: {chat_app.model}")
        print(f"  Default persona: {chat_app.current_persona}")
    except Exception as e:
        print(f"✗ Error initializing chat application: {e}")
        print("  Make sure your Letta server is running and configured correctly.")
        # Don't raise - allow the app to start but endpoints will return 503
    yield
    # Cleanup (if needed)
    chat_app = None


# Create FastAPI app
app = FastAPI(
    title="Grok Assistant API",
    description="Backend API for the Grok Assistant chat application",
    version="0.1.0",
    lifespan=lifespan,
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # Next.js default port
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Pydantic models for request/response
class ChatMessageRequest(BaseModel):
    """Request model for sending a chat message."""
    message: str = Field(..., description="The user's message")
    conversation_id: Optional[str] = Field(None, description="Optional conversation ID for context")


class ChatMessageResponse(BaseModel):
    """Response model for chat messages."""
    id: str = Field(..., description="Message ID")
    role: str = Field(..., description="Message role (user or assistant)")
    content: str = Field(..., description="Message content")
    conversation_id: Optional[str] = Field(None, description="Conversation ID")
    created_at: datetime = Field(default_factory=datetime.now)


class PersonaInfo(BaseModel):
    """Persona information model."""
    key: str = Field(..., description="Persona key/identifier")
    name: str = Field(..., description="Persona display name")
    description: str = Field(..., description="Persona description")
    is_current: bool = Field(False, description="Whether this is the current active persona")


class SetPersonaRequest(BaseModel):
    """Request model for setting a persona."""
    persona_key: str = Field(..., description="The persona key to set")


class SetPersonaResponse(BaseModel):
    """Response model for setting a persona."""
    success: bool = Field(..., description="Whether the persona was set successfully")
    persona: Optional[PersonaInfo] = Field(None, description="The persona that was set")
    message: str = Field(..., description="Response message")


class MemoryBlock(BaseModel):
    """Memory block information."""
    id: Optional[str] = None
    label: str = Field(..., description="Memory block label")
    value: str = Field(..., description="Memory block value")


class HealthResponse(BaseModel):
    """Health check response."""
    status: str = Field(..., description="Service status")
    model: Optional[str] = Field(None, description="Current model")
    current_persona: Optional[str] = Field(None, description="Current persona")


# API Endpoints

@app.get("/", tags=["Root"])
async def root():
    """Root endpoint."""
    return {
        "message": "Grok Assistant API",
        "version": "0.1.0",
        "docs": "/docs"
    }


@app.get("/health", response_model=HealthResponse, tags=["Health"])
async def health_check():
    """Health check endpoint."""
    if not chat_app:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Chat application not initialized"
        )
    
    return HealthResponse(
        status="healthy",
        model=chat_app.model,
        current_persona=chat_app.current_persona
    )


@app.post("/api/chat", response_model=ChatMessageResponse, tags=["Chat"])
async def send_message(request: ChatMessageRequest):
    """Send a chat message and get a response."""
    if not chat_app:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Chat application not initialized"
        )
    
    if not chat_app.agent_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No persona set. Please set a persona first."
        )
    
    try:
        # Send message to chat application
        response_content = chat_app.chat(request.message)
        
        # Create response message
        response = ChatMessageResponse(
            id=str(uuid.uuid4()),
            role="assistant",
            content=response_content,
            conversation_id=request.conversation_id,
        )
        
        return response
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing message: {str(e)}"
        )


@app.get("/api/personas", response_model=List[PersonaInfo], tags=["Personas"])
async def get_personas():
    """Get all available personas."""
    if not chat_app:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Chat application not initialized"
        )
    
    personas = []
    for key in list_personas():
        persona = get_persona(key)
        if persona:
            personas.append(PersonaInfo(
                key=key,
                name=persona["name"],
                description=persona["description"],
                is_current=(chat_app.current_persona == key)
            ))
    
    return personas


@app.get("/api/personas/current", response_model=PersonaInfo, tags=["Personas"])
async def get_current_persona():
    """Get the current active persona."""
    if not chat_app:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Chat application not initialized"
        )
    
    if not chat_app.current_persona:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No persona currently set"
        )
    
    persona = get_persona(chat_app.current_persona)
    if not persona:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Current persona not found"
        )
    
    return PersonaInfo(
        key=chat_app.current_persona,
        name=persona["name"],
        description=persona["description"],
        is_current=True
    )


@app.post("/api/personas/set", response_model=SetPersonaResponse, tags=["Personas"])
async def set_persona(request: SetPersonaRequest):
    """Set the active persona."""
    if not chat_app:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Chat application not initialized"
        )
    
    success = chat_app.set_persona(request.persona_key)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Persona '{request.persona_key}' not found. Available personas: {', '.join(list_personas())}"
        )
    
    persona = get_persona(request.persona_key)
    return SetPersonaResponse(
        success=True,
        persona=PersonaInfo(
            key=request.persona_key,
            name=persona["name"],
            description=persona["description"],
            is_current=True
        ),
        message=f"Persona switched to: {persona['name']}"
    )


@app.get("/api/memory", response_model=List[MemoryBlock], tags=["Memory"])
async def get_memory():
    """Get the agent's memory blocks."""
    if not chat_app:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Chat application not initialized"
        )
    
    if not chat_app.agent_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No agent initialized. Please set a persona first."
        )
    
    try:
        memory_blocks = chat_app.get_memory_blocks()
        result = []
        for block in memory_blocks:
            result.append(MemoryBlock(
                id=getattr(block, 'id', None),
                label=getattr(block, 'label', 'unknown'),
                value=str(getattr(block, 'value', ''))
            ))
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving memory: {str(e)}"
        )


if __name__ == "__main__":
    import uvicorn
    
    port = int(os.getenv("API_PORT", "8000"))
    uvicorn.run(
        "api:app",
        host="0.0.0.0",
        port=port,
        reload=True
    )

