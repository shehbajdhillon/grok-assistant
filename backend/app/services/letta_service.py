"""Letta AI service for managing conversational agents."""

import logging
from typing import Optional

from letta_client import Letta

from app.config import settings
from app.models.assistant import Assistant
from app.models.user import User

logger = logging.getLogger(__name__)


class LettaService:
    """Service for managing Letta agents per conversation."""

    def __init__(self):
        self._client = None

    @property
    def client(self) -> Letta:
        """Lazy initialization of Letta client."""
        if self._client is None:
            try:
                self._client = Letta(base_url=settings.LETTA_BASE_URL)
            except Exception as e:
                logger.error(f"Failed to create Letta client: {e}")
                raise
        return self._client

    async def create_agent_for_conversation(
        self,
        assistant: Assistant,
        user: User,
    ) -> str:
        """
        Create a new Letta agent for a conversation.

        Returns the agent_id to store in the conversation record.
        """
        # Build persona from assistant personality
        persona_value = self._build_persona(assistant)
        human_value = f"Name: {user.name or 'User'}. Email: {user.email}"

        # Create the agent using new SDK format
        try:
            agent_state = self.client.agents.create(
                name=f"assistant_{assistant.id}_{user.id}",
                model="xai/grok-4-1-fast-non-reasoning",
                embedding="openai/text-embedding-3-small",
                memory_blocks=[
                    {
                        "label": "human",
                        "value": human_value,
                    },
                    {
                        "label": "persona",
                        "value": persona_value,
                    },
                ],
            )

            logger.info(f"Created Letta agent {agent_state.id} for assistant {assistant.id}")
            return agent_state.id

        except Exception as e:
            logger.error(f"Failed to create Letta agent: {e}")
            raise

    async def send_message(
        self,
        agent_id: str,
        user_message: str,
    ) -> str:
        """
        Send a message to a Letta agent and get the response.

        Letta handles all memory management automatically:
        - Summarizes old context when needed
        - Stores important info in archival memory
        - Maintains persona/human blocks
        """
        try:
            response = self.client.agents.messages.create(
                agent_id=agent_id,
                input=user_message,
            )

            # Extract the assistant's text response from Letta's response
            assistant_content = self._extract_assistant_response(response)

            return assistant_content

        except Exception as e:
            logger.error(f"Failed to send message to Letta agent {agent_id}: {e}")
            raise

    async def delete_agent(self, agent_id: str) -> None:
        """Delete a Letta agent when conversation is deleted."""
        try:
            self.client.agents.delete(agent_id)
            logger.info(f"Deleted Letta agent {agent_id}")
        except Exception as e:
            logger.warning(f"Failed to delete Letta agent {agent_id}: {e}")

    def _build_persona(self, assistant: Assistant) -> str:
        """Build persona block value from assistant configuration."""
        tone_instructions = {
            "professional": "I respond in a professional, clear, and structured manner.",
            "casual": "I keep responses casual and conversational.",
            "friendly": "I am warm, approachable, and supportive.",
            "formal": "I use formal language and proper etiquette.",
            "humorous": "I incorporate humor and wit into my responses.",
            "empathetic": "I show deep empathy and emotional understanding.",
            "motivational": "I am encouraging and push users toward their goals.",
            "mysterious": "I add an air of mystery and intrigue to my responses.",
        }

        tone_desc = tone_instructions.get(assistant.tone, "")

        return f"""I am {assistant.name}, an AI companion.

{assistant.personality}

{tone_desc}

I have long-term memory and can remember previous conversations with this user. I use my memory to provide personalized, contextual responses and reference past discussions when relevant."""

    def _extract_assistant_response(self, response) -> str:
        """Extract the user-facing response from Letta's message structure."""
        # New SDK returns messages with message_type field
        # We want 'assistant_message' type
        try:
            for msg in response.messages:
                # Check for assistant_message type (new SDK format)
                if hasattr(msg, "message_type") and msg.message_type == "assistant_message":
                    if hasattr(msg, "content"):
                        return msg.content

                # Fallback: check for function_call to send_message (older format)
                if hasattr(msg, "function_call") and msg.function_call:
                    if msg.function_call.name == "send_message":
                        args = msg.function_call.arguments
                        if isinstance(args, dict):
                            return args.get("message", "")
                        elif isinstance(args, str):
                            import json
                            parsed = json.loads(args)
                            return parsed.get("message", "")

            # Fallback: look for any text content
            for msg in reversed(response.messages):
                if hasattr(msg, "content") and msg.content:
                    return msg.content
                if hasattr(msg, "text") and msg.text:
                    return msg.text

            return "I apologize, but I couldn't generate a response."

        except Exception as e:
            logger.error(f"Failed to extract response: {e}")
            return "I apologize, but I encountered an error processing the response."


# Singleton instance
letta_service = LettaService()
