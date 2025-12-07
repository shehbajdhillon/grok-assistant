"""Speech-to-text service using xAI API."""

import logging
import requests

from app.config import settings

logger = logging.getLogger(__name__)

XAI_API_URL = "https://api.x.ai/v1/audio/transcriptions"


class STTService:
    """Service for speech-to-text conversion using xAI."""

    async def transcribe(self, audio_data: bytes, filename: str) -> str:
        """
        Transcribe audio to text using xAI API.

        Args:
            audio_data: Raw audio bytes (wav or mp3)
            filename: Original filename with extension

        Returns:
            Transcribed text
        """
        try:
            logger.info(f"Transcribing audio file: {filename} ({len(audio_data)} bytes)")

            headers = {
                "Authorization": f"Bearer {settings.XAI_API_KEY}",
            }

            # Determine content type from filename
            content_type = "audio/mpeg" if filename.endswith(".mp3") else "audio/wav"

            files = {
                "file": (filename, audio_data, content_type)
            }

            response = requests.post(XAI_API_URL, headers=headers, files=files)
            response.raise_for_status()

            result = response.json()
            text = result.get("text", "")

            logger.info(f"Transcription complete: {len(text)} characters")

            return text

        except requests.exceptions.RequestException as e:
            logger.error(f"Transcription failed: {e}")
            if hasattr(e, 'response') and e.response is not None:
                logger.error(f"Response: {e.response.text}")
            raise Exception(f"Failed to transcribe audio: {str(e)}")


# Singleton instance
stt_service = STTService()
