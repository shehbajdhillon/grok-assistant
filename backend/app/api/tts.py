"""TTS (Text-to-Speech) API endpoints."""

import logging

from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect
from fastapi.responses import Response
from pydantic import BaseModel

from app.auth.websocket import verify_websocket_token
from app.dependencies import get_current_user
from app.models.user import User
from app.services.tts_ws_service import tts_ws_service
from app.services.voice_cloning_service import voice_cloning_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/tts", tags=["tts"])


@router.websocket("/ws/stream")
async def websocket_tts_stream(
    websocket: WebSocket,
    token: str = Query(...),
):
    """
    WebSocket endpoint for streaming TTS.

    Protocol:
    1. Client connects with JWT token in query param
    2. Server validates token
    3. Client sends: {"text": "...", "voice_id": "ara"}
    4. Server streams: {"type": "audio_chunk", "audio": "<base64>", "is_last": bool}
    5. Connection closes after final chunk or on error

    Audio Format:
    - PCM linear16, 24kHz, mono
    - Base64 encoded chunks
    """
    # Validate JWT token before accepting connection
    try:
        token_data = await verify_websocket_token(token)
        logger.info(f"TTS WebSocket authenticated: {token_data.get('clerk_id')}")
    except ValueError as e:
        logger.warning(f"TTS WebSocket auth failed: {e}")
        await websocket.close(code=4001, reason=str(e))
        return

    await websocket.accept()
    logger.debug("TTS WebSocket connection accepted")

    try:
        # Wait for TTS request from client
        request_data = await websocket.receive_json()
        text = request_data.get("text", "")
        voice_id = request_data.get("voice_id", "ara")

        if not text:
            await websocket.send_json({
                "type": "error",
                "message": "Text is required",
            })
            return

        # Stream audio via proxy to xAI
        await tts_ws_service.stream_tts(
            text=text,
            voice_id=voice_id,
            client_ws=websocket,
        )

    except WebSocketDisconnect:
        logger.info("TTS WebSocket client disconnected")
    except Exception as e:
        logger.error(f"TTS WebSocket error: {e}")
        try:
            await websocket.send_json({
                "type": "error",
                "message": str(e),
            })
        except Exception:
            pass  # Client may have already disconnected
    finally:
        try:
            await websocket.close()
        except Exception:
            pass  # Already closed


class CustomTTSRequest(BaseModel):
    """Request body for custom voice TTS."""

    text: str
    custom_voice_url: str


@router.post("/generate")
async def generate_custom_tts(
    request: CustomTTSRequest,
    _: User = Depends(get_current_user),
) -> Response:
    """
    Generate TTS audio using voice cloning.

    Returns MP3 audio bytes for playback via HTML5 Audio element.
    """
    if not request.text.strip():
        raise HTTPException(status_code=400, detail="Text is required")

    if not request.custom_voice_url:
        raise HTTPException(status_code=400, detail="Custom voice URL is required")

    try:
        audio_bytes = await voice_cloning_service.generate_speech(
            text=request.text,
            voice_url=request.custom_voice_url,
        )
        return Response(
            content=audio_bytes,
            media_type="audio/mpeg",
            headers={"Content-Disposition": "inline; filename=speech.mp3"},
        )
    except Exception as e:
        logger.error(f"Custom TTS generation failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate speech")
