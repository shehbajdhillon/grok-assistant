"""Letta AI service for managing conversational agents."""

import logging
from typing import Optional

from letta import create_client
from letta.schemas.embedding_config import EmbeddingConfig
from letta.schemas.llm_config import LLMConfig
from letta.schemas.memory import ChatMemory

from app.config import settings
from app.models.assistant import Assistant
from app.models.user import User

logger = logging.getLogger(__name__)


class LettaService:
    """Service for managing Letta agents per conversation."""

    def __init__(self):
        self._client = None

    @property
    def client(self):
        """Lazy initialization of Letta client."""
        if self._client is None:
            try:
                self._client = create_client(base_url=settings.LETTA_BASE_URL)
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
        # Build system prompt from assistant personality
        system_prompt = self._build_system_prompt(assistant)

        # Create memory blocks
        memory = ChatMemory(
            human=f"User: {user.name or user.email}",
            persona=f"You are {assistant.name}. {assistant.personality}",
        )

        # Create the agent
        try:
            agent_state = self.client.create_agent(
                name=f"assistant_{assistant.id}_{user.id}",
                memory=memory,
                system=system_prompt,
                llm_config=LLMConfig(
                    model="gpt-5-mini",
                    model_endpoint_type="openai",
                    model_endpoint="https://api.openai.com/v1",
                    context_window=200000,
                ),
                embedding_config=EmbeddingConfig(
                    embedding_model="text-embedding-3-small",
                    embedding_endpoint_type="openai",
                    embedding_endpoint="https://api.openai.com/v1",
                    embedding_dim=1536,
                ),
                include_base_tools=True,
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
            response = self.client.send_message(
                agent_id=agent_id,
                message=user_message,
                role="user",
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
            self.client.delete_agent(agent_id)
            logger.info(f"Deleted Letta agent {agent_id}")
        except Exception as e:
            logger.warning(f"Failed to delete Letta agent {agent_id}: {e}")

    def _build_system_prompt(self, assistant: Assistant) -> str:
        """Build system prompt incorporating assistant configuration."""
        tone_instructions = {
            "professional": "Respond in a professional, clear, and structured manner.",
            "casual": "Keep responses casual and conversational.",
            "friendly": "Be warm, approachable, and supportive.",
            "formal": "Use formal language and proper etiquette.",
            "humorous": "Incorporate humor and wit into responses.",
            "empathetic": "Show deep empathy and emotional understanding.",
            "motivational": "Be encouraging and push the user toward their goals.",
            "mysterious": "Add an air of mystery and intrigue to your responses.",
        }

        return f"""You are {assistant.name}, an AI companion.

{assistant.personality}

Tone guidance: {tone_instructions.get(assistant.tone, '')}

Important: You have long-term memory. You can remember previous conversations with this user.
Use your memory to provide personalized, contextual responses. Reference past discussions when relevant.
"""

    def _extract_assistant_response(self, response) -> str:
        """Extract the user-facing response from Letta's message structure."""
        # Letta returns a list of messages including internal thoughts
        # We want the 'assistant_message' type with 'send_message' function call
        try:
            for msg in response.messages:
                # Check for function call to send_message
                if hasattr(msg, "function_call") and msg.function_call:
                    if msg.function_call.name == "send_message":
                        # Extract message from function arguments
                        args = msg.function_call.arguments
                        if isinstance(args, dict):
                            return args.get("message", "")
                        elif isinstance(args, str):
                            import json

                            parsed = json.loads(args)
                            return parsed.get("message", "")

            # Fallback: look for assistant messages
            for msg in reversed(response.messages):
                if hasattr(msg, "text") and msg.text:
                    return msg.text

            return "I apologize, but I couldn't generate a response."

        except Exception as e:
            logger.error(f"Failed to extract response: {e}")
            return "I apologize, but I encountered an error processing the response."


# Singleton instance
letta_service = LettaService()
