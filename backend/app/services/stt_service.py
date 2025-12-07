"""Speech-to-text service using OpenAI Whisper API."""

import logging
from openai import OpenAI

from app.config import settings

logger = logging.getLogger(__name__)


class STTService:
    """Service for speech-to-text conversion using OpenAI Whisper."""

    def __init__(self):
        self._client = None

    @property
    def client(self) -> OpenAI:
        """Lazy initialization of OpenAI client."""
        if self._client is None:
            self._client = OpenAI(api_key=settings.OPENAI_API_KEY)
        return self._client

    async def transcribe(self, audio_data: bytes, filename: str) -> str:
        """
        Transcribe audio to text using OpenAI Whisper.

        Args:
            audio_data: Raw audio bytes (webm, mp3, wav, etc.)
            filename: Original filename with extension

        Returns:
            Transcribed text
        """
        try:
            logger.info(f"Transcribing audio file: {filename} ({len(audio_data)} bytes)")

            transcription = self.client.audio.transcriptions.create(
                model="gpt-4o-transcribe",
                file=(filename, audio_data),
            )

            text = transcription.text
            logger.info(f"Transcription complete: {len(text)} characters")

            return text

        except Exception as e:
            logger.error(f"Transcription failed: {e}")
            raise Exception(f"Failed to transcribe audio: {str(e)}")


# Singleton instance
stt_service = STTService()
