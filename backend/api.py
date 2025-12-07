"""
FastAPI backend for the chat application.
Provides REST API endpoints for frontend communication.
"""

import os
import uuid
from datetime import datetime
from typing import Optional, List, Dict, Any
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, status, Query
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
    import time
    
    # Initialize the chat application
    chat_app = ChatApplication()
    
    # Wait for Letta server to be ready (with retries)
    max_retries = 10
    retry_delay = 2
    for attempt in range(max_retries):
        try:
            # Try to set default persona (this will test Letta connection)
            if chat_app.set_persona("atlas"):
                print("✓ Chat application initialized")
                print(f"  Model: {chat_app.model}")
                print(f"  Default persona: {chat_app.current_persona}")
                break
            else:
                raise Exception("Failed to set persona")
        except Exception as e:
            if attempt < max_retries - 1:
                print(f"⏳ Waiting for Letta server to be ready (attempt {attempt + 1}/{max_retries})...")
                time.sleep(retry_delay)
            else:
                print(f"✗ Error initializing chat application after {max_retries} attempts: {e}")
                print("  The app will start but may not work until Letta server is ready.")
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
    persona_key: Optional[str] = Field(None, description="Optional persona key to set for this conversation if not already set")


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


class ConversationMessage(BaseModel):
    """A single message in the conversation history."""
    id: Optional[str] = Field(None, description="Message ID")
    role: str = Field(..., description="Message role (user, assistant, etc.)")
    content: str = Field(..., description="Message content")
    created_at: Optional[str] = Field(None, description="Message creation timestamp")
    message_type: Optional[str] = Field(None, description="Type of message")


class ConversationHistoryResponse(BaseModel):
    """Response model for conversation history."""
    messages: List[ConversationMessage] = Field(..., description="List of messages")
    total: int = Field(..., description="Total number of messages")
    agent_id: Optional[str] = Field(None, description="Agent ID used for this conversation")
    group_id: Optional[str] = Field(None, description="Group/conversation ID if filtered")


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


@app.get("/api/agent/id", tags=["Agent"])
async def get_agent_id():
    """Get the current agent ID.
    
    The agent_id is the main identifier for fetching conversation history.
    Each agent maintains its own conversation history.
    """
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
    
    return {
        "agent_id": chat_app.agent_id,
        "current_persona": chat_app.current_persona
    }


@app.post("/api/chat", response_model=ChatMessageResponse, tags=["Chat"])
async def send_message(request: ChatMessageRequest):
    """Send a chat message and get a response.
    
    The conversation_id is the main identifier for conversations.
    If provided, it will be used to maintain conversation context.
    Letta uses group_id internally, which is returned in the response.
    """
    if not chat_app:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Chat application not initialized"
        )
    
    # Check if conversation has a persona set, if not, try to set it from request or use default
    if request.conversation_id:
        # Check if persona is set for this conversation
        if request.conversation_id not in chat_app._conversation_personas:
            # No persona set - try to set it from request or use default
            if request.persona_key:
                # Set persona from request
                chat_app.set_persona_for_conversation(request.conversation_id, request.persona_key)
            elif chat_app.agent_id:
                # Use default persona (backward compatibility)
                       chat_app.set_persona_for_conversation(request.conversation_id, chat_app.current_persona or "atlas")
            else:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="No persona set for this conversation. Please provide persona_key in request or set a default persona."
                )
    elif not chat_app.agent_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No persona set. Please set a persona first."
        )
    
    try:
        # Send message to chat application
        # conversation_id can be used as group_id for Letta
        response_content, group_id = chat_app.chat(
            request.message,
            conversation_id=request.conversation_id,
            group_id=request.conversation_id  # Use conversation_id as group_id
        )
        
        # Use group_id as conversation_id if returned, otherwise use request's conversation_id
        final_conversation_id = group_id or request.conversation_id
        
        # Create response message
        response = ChatMessageResponse(
            id=str(uuid.uuid4()),
            role="assistant",
            content=response_content,
            conversation_id=final_conversation_id,
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


class SetConversationPersonaRequest(BaseModel):
    """Request to set persona for a conversation."""
    persona_key: str = Field(..., description="The persona key to use for this conversation")


@app.get("/api/conversations/{conversation_id}/persona", response_model=PersonaInfo, tags=["Conversations"])
async def get_conversation_persona(conversation_id: str):
    """Get the persona for a specific conversation."""
    if not chat_app:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Chat application not initialized"
        )
    
    # Get persona key for this conversation
    persona_key = chat_app._conversation_personas.get(conversation_id)
    
    if not persona_key:
        # Fallback to global persona if conversation doesn't have one set
        persona_key = chat_app.current_persona or "atlas"
    
    persona = get_persona(persona_key)
    if not persona:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Persona '{persona_key}' not found"
        )
    
    return PersonaInfo(
        key=persona_key,
        name=persona["name"],
        description=persona["description"],
        is_current=True
    )


@app.post("/api/conversations/{conversation_id}/persona", response_model=SetPersonaResponse, tags=["Conversations"])
async def set_conversation_persona(conversation_id: str, request: SetConversationPersonaRequest):
    """Set the persona for a specific conversation.
    
    This allows each conversation to have its own persona, enabling
    multiple conversations with different personas simultaneously.
    """
    if not chat_app:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Chat application not initialized"
        )
    
    success = chat_app.set_persona_for_conversation(conversation_id, request.persona_key)
    
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
        message=f"Persona set to: {persona['name']} for conversation {conversation_id}"
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
@app.get("/api/conversation/history", response_model=ConversationHistoryResponse, tags=["Conversation"])
async def get_conversation_history(conversation_id: Optional[str] = None, limit: Optional[int] = None, order: str = "desc", group_id: Optional[str] = None):
    """Get conversation history for a specific conversation.
    
    Args:
        conversation_id: Conversation ID (primary identifier for the conversation)
        limit: Maximum number of messages to retrieve (default: all)
        order: Order of messages ('asc' for oldest first, 'desc' for newest first)
        group_id: Optional group ID (Letta's internal conversation identifier, takes precedence over conversation_id)
    
    Note:
        - conversation_id is the main identifier you should use
        - Letta uses group_id internally, which maps to conversation_id
        - If conversation_id is provided, it will be used to fetch that specific conversation
    """
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
    
    if order not in ["asc", "desc"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Order must be 'asc' or 'desc'"
        )
    
    try:
        messages = chat_app.get_conversation_history(
            conversation_id=conversation_id,
            limit=limit,
            order=order,
            group_id=group_id
        )
        
        # Convert Letta message objects to our response format
        result_messages = []
        for msg in messages:
            # Try to get message data as dict
            try:
                if hasattr(msg, 'model_dump'):
                    msg_dict = msg.model_dump()
                elif hasattr(msg, 'dict'):
                    msg_dict = msg.dict()
                else:
                    msg_dict = {}
            except Exception:
                msg_dict = {}
            
            # Determine role from message_type or class name
            msg_class_name = type(msg).__name__.lower()
            message_type = msg_dict.get('message_type', '')
            if not message_type:
                message_type = getattr(msg, 'message_type', None) or ''
            
            role = "user"
            if 'user' in message_type.lower() or 'user' in msg_class_name or 'input' in msg_class_name:
                role = "user"
            elif 'assistant' in message_type.lower() or 'assistant' in msg_class_name:
                role = "assistant"
            elif 'system' in message_type.lower() or 'system' in msg_class_name:
                role = "system"
            elif 'reasoning' in message_type.lower() or 'reasoning' in msg_class_name:
                # Skip reasoning messages - they're internal to the agent
                continue
            
            # Skip system messages - they're internal metadata and shouldn't be shown to users
            if role == "system" or 'system' in message_type.lower() or 'system' in msg_class_name:
                continue
            
            # Extract content - try dict first, then attributes
            content = ""
            if 'content' in msg_dict and msg_dict['content']:
                content = str(msg_dict['content'])
            elif hasattr(msg, 'content'):
                content_val = getattr(msg, 'content', None)
                if content_val:
                    content = str(content_val)
            elif 'text' in msg_dict and msg_dict['text']:
                content = str(msg_dict['text'])
            elif hasattr(msg, 'text'):
                content_val = getattr(msg, 'text', None)
                if content_val:
                    content = str(content_val)
            elif 'input' in msg_dict and msg_dict['input']:
                content = str(msg_dict['input'])
            elif hasattr(msg, 'input'):
                content_val = getattr(msg, 'input', None)
                if content_val:
                    content = str(content_val)
            
            # Skip messages without content
            if not content:
                continue
            
            # Skip messages that contain memory metadata (internal Letta information)
            if '<memory_metadata>' in content or 'memory_metadata' in content.lower():
                continue
            
            # Extract timestamp
            created_at = None
            if 'date' in msg_dict and msg_dict['date']:
                created_at = str(msg_dict['date'])
            elif hasattr(msg, 'date'):
                date_val = getattr(msg, 'date', None)
                if date_val:
                    created_at = str(date_val)
            elif 'created_at' in msg_dict and msg_dict['created_at']:
                created_at = str(msg_dict['created_at'])
            elif hasattr(msg, 'created_at'):
                created_at_val = getattr(msg, 'created_at', None)
                if created_at_val:
                    created_at = str(created_at_val)
            
            # Extract message ID
            msg_id = msg_dict.get('id') or getattr(msg, 'id', None)
            
            # Use message_type from dict or class name
            final_message_type = message_type or msg_class_name
            
            result_messages.append(ConversationMessage(
                id=str(msg_id) if msg_id else None,
                role=role,
                content=content,
                created_at=created_at,
                message_type=final_message_type
            ))
        
        # Ensure messages are sorted by created_at in the requested order
        from datetime import datetime
        if order == "asc":
            result_messages.sort(key=lambda x: x.created_at if x.created_at else datetime.min)
        else:
            result_messages.sort(key=lambda x: x.created_at if x.created_at else datetime.max, reverse=True)
        
        return ConversationHistoryResponse(
            messages=result_messages,
            total=len(result_messages),
            agent_id=chat_app.agent_id,
            group_id=group_id or conversation_id
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving conversation history: {str(e)}"
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

