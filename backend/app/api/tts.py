"""TTS (Text-to-Speech) API endpoints."""

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel, Field

from app.dependencies import get_current_user
from app.models.user import User
from app.services.tts_service import tts_service

router = APIRouter(prefix="/tts", tags=["tts"])


class TTSRequest(BaseModel):
    """Request body for TTS synthesis."""

    text: str = Field(..., min_length=1, max_length=5000, description="Text to convert to speech")
    voice_id: str = Field(default="alloy", description="Voice ID (alloy, echo, fable, onyx, nova, shimmer)")
    format: str = Field(default="mp3", description="Audio format (mp3, wav, opus, flac)")


@router.post("/synthesize")
async def synthesize_speech(
    request: TTSRequest,
    current_user: User = Depends(get_current_user),
) -> Response:
    """
    Convert text to speech using xAI TTS.

    Returns audio bytes in the requested format.
    """
    try:
        audio_bytes = await tts_service.synthesize(
            text=request.text,
            voice_id=request.voice_id,
            response_format=request.format,
        )

        # Set content type based on format
        content_types = {
            "mp3": "audio/mpeg",
            "wav": "audio/wav",
            "opus": "audio/opus",
            "flac": "audio/flac",
            "pcm": "audio/pcm",
        }
        content_type = content_types.get(request.format, "audio/mpeg")

        return Response(
            content=audio_bytes,
            media_type=content_type,
            headers={
                "Content-Disposition": f"inline; filename=speech.{request.format}",
            },
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
