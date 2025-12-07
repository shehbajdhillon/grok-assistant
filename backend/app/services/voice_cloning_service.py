"""Voice cloning TTS service using xAI API."""

import logging

import httpx

from app.config import settings
from app.services.supabase_storage_service import supabase_storage_service

logger = logging.getLogger(__name__)


class VoiceCloningService:
    """Service for TTS with voice cloning via xAI HTTP API."""

    XAI_VOICE_CLONING_URL = (
        "https://us-east-4.api.x.ai/voice-staging/api/v1/text-to-speech/generate"
    )

    async def generate_speech(
        self,
        text: str,
        voice_url: str,
    ) -> bytes:
        """
        Generate speech using voice cloning.

        Args:
            text: Text to convert to speech
            voice_url: URL to the voice sample in Supabase Storage

        Returns:
            MP3 audio bytes

        Raises:
            httpx.HTTPError: If the xAI API request fails
        """
        # Download voice sample and convert to base64
        logger.info(f"Generating speech with voice cloning: {len(text)} chars")
        voice_base64 = await supabase_storage_service.get_file_as_base64(voice_url)

        headers = {
            "Authorization": f"Bearer {settings.XAI_API_KEY}",
            "Content-Type": "application/json",
        }

        payload = {
            "model": "grok-voice",
            "input": text[:4096],  # Max input length
            "voice": voice_base64,
            "instructions": "",  # No special instructions
            "response_format": "mp3",
            "sampling_params": {
                "max_new_tokens": 4096,
                "temperature": 1.0,
                "min_p": 0.01,
            },
        }

        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(
                self.XAI_VOICE_CLONING_URL,
                headers=headers,
                json=payload,
            )
            response.raise_for_status()

            logger.info(f"Voice cloning TTS complete: {len(response.content)} bytes")
            return response.content


# Singleton instance
voice_cloning_service = VoiceCloningService()
