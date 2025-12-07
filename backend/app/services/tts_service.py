"""Text-to-speech service using xAI API."""

import logging
from typing import Literal

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

# xAI TTS voices
XAIVoice = Literal["ara", "rex", "sal", "eve", "una", "leo"]


class TTSService:
    """Service for text-to-speech conversion using xAI."""

    BASE_URL = "https://api.x.ai/v1"

    def __init__(self):
        self._client: httpx.AsyncClient | None = None

    @property
    def client(self) -> httpx.AsyncClient:
        """Lazy initialization of HTTP client."""
        if self._client is None:
            self._client = httpx.AsyncClient(
                base_url=self.BASE_URL,
                headers={
                    "Authorization": f"Bearer {settings.XAI_API_KEY}",
                    "Content-Type": "application/json",
                },
                timeout=30.0,
            )
        return self._client

    async def synthesize(
        self,
        text: str,
        voice_id: str = "ara",
        response_format: str = "mp3",
    ) -> bytes:
        """
        Convert text to speech using xAI API.

        Args:
            text: The text to convert to speech
            voice_id: xAI voice ID (ara, rex, eve, leo, una, sal)
            response_format: Audio format (mp3, wav, opus, flac, pcm)

        Returns:
            Audio bytes
        """
        # Validate voice ID, default to ara
        valid_voices = {"ara", "rex", "sal", "eve", "una", "leo"}
        xai_voice = voice_id if voice_id in valid_voices else "ara"

        logger.info(f"Synthesizing speech: {len(text)} chars, voice={xai_voice}, format={response_format}")

        try:
            response = await self.client.post(
                "/audio/speech",
                json={
                    "input": text,
                    "voice": xai_voice,
                    "response_format": response_format,
                },
            )
            response.raise_for_status()

            audio_bytes = response.content
            logger.info(f"TTS complete: {len(audio_bytes)} bytes")

            return audio_bytes

        except httpx.HTTPStatusError as e:
            logger.error(f"TTS API error: {e.response.status_code} - {e.response.text}")
            raise Exception(f"TTS failed: {e.response.text}")
        except Exception as e:
            logger.error(f"TTS failed: {e}")
            raise Exception(f"Failed to synthesize speech: {str(e)}")

    async def close(self):
        """Close the HTTP client."""
        if self._client:
            await self._client.aclose()
            self._client = None


# Singleton instance
tts_service = TTSService()
