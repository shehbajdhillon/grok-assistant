"""Chat WebSocket endpoint for persistent chat sessions."""

import asyncio
import logging
from uuid import UUID

from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.websocket import verify_websocket_token
from app.db.session import async_session_maker
from app.schemas.message import MessageResponse
from app.services import conversation_service
from app.services.chat_ws_manager import chat_ws_manager
from app.services.chat_ws_service import chat_ws_service
from app.services.user_service import get_or_create_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/chat", tags=["chat"])


@router.websocket("/{conversation_id}/ws")
async def chat_websocket(
    websocket: WebSocket,
    conversation_id: UUID,
    token: str = Query(...),
):
    """
    Persistent WebSocket endpoint for chat sessions.

    Protocol:
    1. Client connects with JWT token in query param
    2. Server validates token and conversation ownership
    3. Client sends messages: {"type": "message", "content": "Hello"}
    4. Server responds with:
       - {"type": "user_message", "message": {...}}
       - {"type": "assistant_message", "message": {...}}
       - {"type": "audio_chunk", "audio": "<base64>", "is_last": bool}
    5. Client can send {"type": "stop_audio"} to cancel TTS
    6. Client can send {"type": "ping"} for keep-alive

    Audio Format:
    - PCM linear16, 24kHz, mono
    - Base64 encoded chunks
    """
    user_id: str | None = None
    db: AsyncSession | None = None

    # Validate JWT token before accepting connection
    try:
        token_data = await verify_websocket_token(token)
        logger.info(f"Chat WebSocket authenticated: {token_data.get('clerk_id')}")
    except ValueError as e:
        logger.warning(f"Chat WebSocket auth failed: {e}")
        await websocket.close(code=4001, reason=str(e))
        return

    try:
        # Get database session
        db = async_session_maker()

        # Get or create user
        user = await get_or_create_user(db, email=token_data["email"])
        user_id = str(user.id)

        # Verify conversation exists and user owns it
        conversation = await conversation_service.get_conversation_by_id(
            db, conversation_id, include_messages=False
        )
        if not conversation:
            await websocket.close(code=4004, reason="Conversation not found")
            return

        if conversation.user_id != user.id:
            await websocket.close(code=4003, reason="Access denied")
            return

        # Get assistant for voice settings
        assistant = conversation.assistant
        voice_id = "ara"
        if assistant and assistant.voice_settings:
            voice_id = assistant.voice_settings.get("voiceId", "ara")

        # Accept connection and join room
        await websocket.accept()
        room = await chat_ws_manager.connect(conversation_id, user_id, websocket)
        logger.info(f"User {user_id} joined chat {conversation_id}")

        # Send connection confirmation
        await websocket.send_json({
            "type": "connected",
            "conversation_id": str(conversation_id),
            "voice_id": voice_id,
        })

        # Message loop
        while True:
            try:
                data = await websocket.receive_json()
                message_type = data.get("type")

                if message_type == "ping":
                    await websocket.send_json({"type": "pong"})

                elif message_type == "stop_audio":
                    # Cancel any active TTS streaming
                    room.cancel_tts(user_id)
                    logger.debug(f"Audio stopped for user {user_id}")

                elif message_type == "message":
                    content = data.get("content", "").strip()
                    if not content:
                        await websocket.send_json({
                            "type": "error",
                            "message": "Message content is required",
                        })
                        continue

                    # Process message
                    user_message, assistant_message = await chat_ws_service.process_message(
                        db, conversation, content
                    )
                    await db.commit()

                    # Send user message confirmation
                    await websocket.send_json({
                        "type": "user_message",
                        "message": _message_to_dict(user_message),
                    })

                    # Send assistant message
                    await websocket.send_json({
                        "type": "assistant_message",
                        "message": _message_to_dict(assistant_message),
                    })

                    # Start TTS streaming (if voice is enabled)
                    # The client indicates voice preference, but we always stream
                    # and let the client decide whether to play it
                    tts_task = asyncio.create_task(
                        chat_ws_service.stream_tts(
                            websocket,
                            assistant_message.content,
                            voice_id,
                        )
                    )
                    room.set_tts_task(user_id, tts_task)

                else:
                    await websocket.send_json({
                        "type": "error",
                        "message": f"Unknown message type: {message_type}",
                    })

            except WebSocketDisconnect:
                logger.info(f"User {user_id} disconnected from chat {conversation_id}")
                break

    except Exception as e:
        logger.error(f"Chat WebSocket error: {e}")
        try:
            await websocket.send_json({
                "type": "error",
                "message": str(e),
            })
        except Exception:
            pass

    finally:
        # Cleanup
        if user_id:
            await chat_ws_manager.disconnect(conversation_id, user_id)

        if db:
            await db.close()

        try:
            await websocket.close()
        except Exception:
            pass


def _message_to_dict(message) -> dict:
    """Convert a Message model to a dictionary for JSON serialization."""
    return {
        "id": str(message.id),
        "conversationId": str(message.conversation_id),
        "role": message.role,
        "content": message.content,
        "audioUrl": message.audio_url,
        "createdAt": message.created_at.isoformat(),
    }
