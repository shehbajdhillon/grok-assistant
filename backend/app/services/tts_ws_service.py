"""WebSocket-based Text-to-Speech service using xAI streaming API."""

import json
import logging
from typing import Literal

import websockets
from fastapi import WebSocket

from app.config import settings

logger = logging.getLogger(__name__)

# xAI TTS voices
XAIVoice = Literal["ara", "rex", "sal", "eve", "una", "leo"]
VALID_VOICES = {"ara", "rex", "sal", "eve", "una", "leo"}


class TTSWebSocketService:
    """Service for streaming text-to-speech via WebSocket proxy to xAI."""

    XAI_WS_URL = "wss://api.x.ai/v1/realtime/audio/speech"

    async def stream_tts(
        self,
        text: str,
        voice_id: str,
        client_ws: WebSocket,
    ) -> None:
        """
        Stream TTS audio from xAI to the client via WebSocket proxy.

        Args:
            text: The text to convert to speech
            voice_id: xAI voice ID (ara, rex, eve, leo, una, sal)
            client_ws: FastAPI WebSocket connection to the frontend client

        Protocol:
            1. Connect to xAI WebSocket with auth headers
            2. Send config message with voice_id
            3. Send text_chunk message with full text
            4. Forward audio chunks to client
            5. Handle completion and cleanup
        """
        # Validate voice ID, default to ara
        xai_voice = voice_id if voice_id in VALID_VOICES else "ara"

        logger.info(f"Starting streaming TTS: {len(text)} chars, voice={xai_voice}")

        headers = {"Authorization": f"Bearer {settings.XAI_API_KEY}"}

        try:
            async with websockets.connect(
                self.XAI_WS_URL,
                additional_headers=headers,
            ) as xai_ws:
                logger.debug("Connected to xAI streaming TTS API")

                # Send config message
                config_message = {
                    "type": "config",
                    "data": {"voice_id": xai_voice},
                }
                await xai_ws.send(json.dumps(config_message))
                logger.debug(f"Sent config: {config_message}")

                # Send text chunk
                text_message = {
                    "type": "text_chunk",
                    "data": {"text": text, "is_last": True},
                }
                await xai_ws.send(json.dumps(text_message))
                logger.debug("Sent text chunk")

                # Receive and forward audio chunks
                chunk_count = 0
                async for message in xai_ws:
                    data = json.loads(message)

                    # Extract audio data from xAI response
                    # Response format: {"data": {"data": {"audio": "<base64>", "is_last": bool}}}
                    audio_data = data.get("data", {}).get("data", {})
                    audio_b64 = audio_data.get("audio", "")
                    is_last = audio_data.get("is_last", False)

                    if audio_b64:
                        chunk_count += 1
                        # Forward to client in simplified format
                        await client_ws.send_json({
                            "type": "audio_chunk",
                            "audio": audio_b64,
                            "is_last": is_last,
                        })

                    if is_last:
                        logger.info(f"Streaming TTS complete: {chunk_count} chunks sent")
                        break

        except websockets.exceptions.ConnectionClosedError as e:
            logger.error(f"xAI WebSocket connection closed: {e}")
            await client_ws.send_json({
                "type": "error",
                "message": "Connection to TTS service closed unexpectedly",
            })
        except Exception as e:
            logger.error(f"Streaming TTS error: {e}")
            await client_ws.send_json({
                "type": "error",
                "message": str(e),
            })


# Singleton instance
tts_ws_service = TTSWebSocketService()
