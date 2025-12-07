"""Chat WebSocket service for message processing and TTS streaming."""

import asyncio
import json
import logging
from typing import Any

import websockets
from fastapi import WebSocket
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.message import Message
from app.services import conversation_service
from app.services.letta_service import letta_service

logger = logging.getLogger(__name__)

# xAI TTS settings
XAI_TTS_WS_URL = "wss://api.x.ai/v1/realtime/audio/speech"
VALID_VOICES = {"ara", "rex", "sal", "eve", "una", "leo"}


class ChatWebSocketService:
    """Service for handling chat WebSocket message processing."""

    async def process_message(
        self,
        db: AsyncSession,
        conversation: Any,
        content: str,
    ) -> tuple[Message, Message]:
        """
        Process a user message and get AI response.

        Args:
            db: Database session
            conversation: Conversation model instance
            content: User message content

        Returns:
            Tuple of (user_message, assistant_message)
        """
        # Save user message
        user_message = await conversation_service.add_message(
            db, conversation, role="user", content=content
        )

        # Get AI response from Letta
        assistant_content = (
            "I'm sorry, I'm having trouble connecting to my memory system right now. "
            "Please try again."
        )

        if conversation.letta_agent_id:
            try:
                assistant_content = await letta_service.send_message(
                    agent_id=conversation.letta_agent_id,
                    user_message=content,
                )
            except Exception as e:
                logger.error(f"Letta error: {e}")
                # Use fallback response based on assistant tone
                assistant = conversation.assistant
                if assistant:
                    assistant_content = self._get_fallback_response(assistant.tone, content)
        else:
            # No Letta agent - use mock response
            assistant = conversation.assistant
            if assistant:
                assistant_content = self._get_fallback_response(assistant.tone, content)

        # Save assistant message
        assistant_message = await conversation_service.add_message(
            db, conversation, role="assistant", content=assistant_content
        )

        return user_message, assistant_message

    async def stream_tts(
        self,
        websocket: WebSocket,
        text: str,
        voice_id: str,
    ) -> None:
        """
        Stream TTS audio chunks to a chat WebSocket.

        This is similar to TTSWebSocketService.stream_tts but designed
        to work within the chat WebSocket context.

        Args:
            websocket: The chat WebSocket connection
            text: Text to convert to speech
            voice_id: xAI voice ID
        """
        xai_voice = voice_id if voice_id in VALID_VOICES else "ara"

        logger.info(f"Starting chat TTS stream: {len(text)} chars, voice={xai_voice}")

        headers = {"Authorization": f"Bearer {settings.XAI_API_KEY}"}

        try:
            async with websockets.connect(
                XAI_TTS_WS_URL,
                additional_headers=headers,
            ) as xai_ws:
                logger.debug("Connected to xAI streaming TTS API")

                # Send config message
                config_message = {
                    "type": "config",
                    "data": {"voice_id": xai_voice},
                }
                await xai_ws.send(json.dumps(config_message))

                # Send text chunk
                text_message = {
                    "type": "text_chunk",
                    "data": {"text": text, "is_last": True},
                }
                await xai_ws.send(json.dumps(text_message))

                # Receive and forward audio chunks
                chunk_count = 0
                async for message in xai_ws:
                    # Check for cancellation
                    if asyncio.current_task().cancelled():
                        logger.info("TTS streaming cancelled")
                        break

                    data = json.loads(message)

                    # Extract audio data from xAI response
                    audio_data = data.get("data", {}).get("data", {})
                    audio_b64 = audio_data.get("audio", "")
                    is_last = audio_data.get("is_last", False)

                    if audio_b64:
                        chunk_count += 1
                        await websocket.send_json({
                            "type": "audio_chunk",
                            "audio": audio_b64,
                            "is_last": is_last,
                        })

                    if is_last:
                        logger.info(f"Chat TTS complete: {chunk_count} chunks sent")
                        break

        except asyncio.CancelledError:
            logger.info("TTS streaming task cancelled")
            raise
        except websockets.exceptions.ConnectionClosedError as e:
            logger.error(f"xAI WebSocket connection closed: {e}")
            try:
                await websocket.send_json({
                    "type": "error",
                    "message": "Connection to TTS service closed unexpectedly",
                })
            except Exception:
                pass
        except Exception as e:
            logger.error(f"Chat TTS streaming error: {e}")
            try:
                await websocket.send_json({
                    "type": "error",
                    "message": f"TTS error: {str(e)}",
                })
            except Exception:
                pass

    def _get_fallback_response(self, tone: str, user_message: str) -> str:
        """Generate a fallback response based on assistant tone."""
        fallbacks = {
            # Positive tones
            "professional": f"Thank you for your message. I understand you're asking about: {user_message[:50]}. Let me help you with that systematically.",
            "friendly": f"Thanks for sharing that with me! I'd love to help you with: {user_message[:30]}...",
            "humorous": f"Ooh, interesting question! You asked about {user_message[:30]}... *adjusts comedy glasses* Let me see what I can do!",
            "empathetic": f"I hear you, and I appreciate you sharing that with me. Let's explore this together: {user_message[:30]}...",
            "motivational": f"YES! Great question, champion! You're asking about {user_message[:30]} - let's crush this!",
            "cheerful": f"Oh how wonderful! I love that you're asking about {user_message[:30]}! This is going to be fun!",
            "playful": f"Ooh ooh! {user_message[:30]}... *bounces excitedly* Let me play with this idea!",
            "enthusiastic": f"WOW! What an exciting question about {user_message[:30]}! I'm so pumped to explore this with you!",
            "warm": f"I'm so glad you came to me with this. {user_message[:30]}... Let me wrap my thoughts around this for you.",
            "supportive": f"I'm here for you. You're asking about {user_message[:30]}, and we'll work through this together, one step at a time.",
            # Neutral tones
            "casual": f"Hey! Got your message about {user_message[:30]}... Let me think about that for a sec.",
            "formal": f"I acknowledge your inquiry regarding: {user_message[:50]}. Please allow me to provide a considered response.",
            "mysterious": f"Ah... an intriguing inquiry. {user_message[:30]}... The answer lies within the shadows of knowledge...",
            "calm": f"I see you're asking about {user_message[:30]}... Let's take a moment to consider this thoughtfully.",
            "analytical": f"Interesting. You've presented: {user_message[:40]}. Let me analyze the key components systematically.",
            "stoic": f"You ask about {user_message[:30]}. Very well. Let me offer what wisdom I can.",
            "philosophical": f"Ah, {user_message[:30]}... This raises deeper questions about the nature of understanding itself.",
            # Negative tones
            "sarcastic": f"Oh, how original. {user_message[:30]}... Let me pretend I haven't heard that before.",
            "blunt": f"You want to know about {user_message[:30]}. Fine. Here's the truth without the sugar coating.",
            "cynical": f"So you're asking about {user_message[:30]}. Of course you are. Everyone wants easy answers.",
            "melancholic": f"You ask about {user_message[:30]}... *sighs* Very well, though the answer may not bring the comfort you seek.",
            "stern": f"Listen carefully. You're asking about {user_message[:30]}. I'll tell you once, so pay attention.",
            "dramatic": f"BEHOLD! You dare ask about {user_message[:30]}! The very cosmos trembles at such a question!",
            "pessimistic": f"You're asking about {user_message[:30]}. I suppose I can try, though it probably won't help much.",
        }
        return fallbacks.get(tone, f"I received your message: {user_message[:50]}...")


# Singleton instance
chat_ws_service = ChatWebSocketService()
