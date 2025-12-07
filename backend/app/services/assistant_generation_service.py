"""Service for generating assistant configurations via xAI function calling."""

import json
import logging
from typing import Any, Literal

from openai import OpenAI
from pydantic import BaseModel, Field

from app.config import settings

logger = logging.getLogger(__name__)

# Valid values - must match frontend constants
VALID_TONES = Literal[
    "professional",
    "friendly",
    "humorous",
    "empathetic",
    "motivational",
    "cheerful",
    "playful",
    "enthusiastic",
    "warm",
    "supportive",
    "casual",
    "formal",
    "mysterious",
    "calm",
    "analytical",
    "stoic",
    "philosophical",
    "sarcastic",
    "blunt",
    "cynical",
    "melancholic",
    "stern",
    "dramatic",
    "pessimistic",
]

VALID_VOICE_IDS = Literal["ara", "rex", "eve", "leo", "una", "sal"]

VALID_EMOJIS = Literal[
    "\U0001f916",  # robot
    "\U0001f9d9",  # wizard
    "\U0001f4aa",  # muscle
    "\U0001f319",  # moon
    "\u26a1",      # zap
    "\U0001f3db\ufe0f",  # classical building
    "\U0001f3ad",  # performing arts
    "\U0001f98a",  # fox
    "\U0001f43a",  # wolf
    "\U0001f981",  # lion
    "\U0001f438",  # frog
    "\U0001f989",  # owl
    "\U0001f31f",  # star
    "\U0001f48e",  # gem
    "\U0001f525",  # fire
    "\U0001f30a",  # ocean
]


class GeneratedAssistantSchema(BaseModel):
    """Schema for LLM-generated assistant configuration."""

    name: str = Field(description="A short catchy name for the assistant (1-3 words)")
    description: str = Field(
        description="A brief description of what this assistant does (1-2 sentences, max 200 characters)"
    )
    personality: str = Field(
        description="Detailed personality prompt describing how this assistant behaves, speaks, their background, quirks, and unique traits (3-5 paragraphs)"
    )
    tone: VALID_TONES = Field(description="The communication tone/style of the assistant")
    voiceId: VALID_VOICE_IDS = Field(
        description="Voice selection: ara/eve/una are female voices, rex/leo are male voices, sal is neutral"
    )
    speed: float = Field(
        default=1.0, ge=0.5, le=2.0, description="Speech speed multiplier (0.5 to 2.0)"
    )
    pitch: float = Field(
        default=1.0, ge=0.5, le=2.0, description="Voice pitch multiplier (0.5 to 2.0)"
    )
    avatarEmoji: VALID_EMOJIS = Field(description="Emoji avatar that represents the assistant")
    isPublic: bool = Field(default=True, description="Whether the assistant is publicly discoverable")
    tags: list[str] = Field(
        default_factory=list,
        description="Up to 5 lowercase tags describing the assistant's purpose",
    )


# System prompt for the generation
SYSTEM_PROMPT = """You are an expert at creating AI companion personas. Your task is to generate a complete assistant configuration based on the user's description.

Guidelines:
- Create a unique, memorable name (1-3 words)
- Write a compelling description that captures the essence of the assistant
- Craft a detailed personality prompt that brings the character to life
- Choose a tone that matches the personality
- Select an appropriate voice (ara/eve/una for female, rex/leo for male, sal for neutral)
- Pick an emoji avatar that visually represents the character
- Generate 3-5 relevant tags

Be creative and make the assistant feel authentic and engaging!"""


class AssistantGenerationService:
    """Service for generating assistant configurations using xAI/Grok."""

    def __init__(self) -> None:
        self._client: OpenAI | None = None
        self._tool_schema = GeneratedAssistantSchema.model_json_schema()

    @property
    def client(self) -> OpenAI:
        """Lazy initialization of OpenAI client configured for xAI."""
        if self._client is None:
            self._client = OpenAI(
                base_url="https://api.x.ai/v1",
                api_key=settings.XAI_API_KEY,
            )
        return self._client

    async def generate_avatar_image(self, name: str, description: str, personality: str) -> str | None:
        """
        Generate an avatar image for the assistant using xAI Grok image generation.

        Args:
            name: The assistant's name
            description: Brief description of the assistant
            personality: Detailed personality prompt

        Returns:
            URL of the generated image, or None if generation fails
        """
        # Create a focused prompt for avatar generation
        avatar_prompt = f"""Create a stylized digital avatar portrait for an AI assistant character:
Name: {name}
Description: {description}
Personality: {personality[:500]}

Style: Modern, clean digital art avatar suitable for a chat interface. The image should be a portrait-style representation that captures the essence and personality of this AI character. Use vibrant colors and a distinctive visual style."""

        try:
            response = self.client.images.generate(
                model="grok-2-image-1212",
                prompt=avatar_prompt,
            )
            return response.data[0].url
        except Exception as e:
            logger.warning(f"Avatar image generation failed: {e}")
            return None

    async def generate_assistant(self, user_prompt: str) -> dict[str, Any]:
        """
        Generate assistant configuration from natural language prompt.

        Uses xAI function calling to get structured, validated output.

        Args:
            user_prompt: User's natural language description of desired assistant

        Returns:
            Dict matching AssistantGenerateResponse schema
        """
        tool_definitions = [
            {
                "type": "function",
                "function": {
                    "name": "create_assistant_config",
                    "description": "Generate a complete assistant configuration based on user description",
                    "parameters": self._tool_schema,
                },
            }
        ]

        try:
            response = self.client.chat.completions.create(
                model="grok-3-fast",
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": f"Create an AI assistant based on this description: {user_prompt}"},
                ],
                tools=tool_definitions,
                tool_choice={"type": "function", "function": {"name": "create_assistant_config"}},
            )

            # Extract the function call arguments
            tool_call = response.choices[0].message.tool_calls[0]
            generated = json.loads(tool_call.function.arguments)

            # Transform to match AssistantGenerateResponse format
            result = self._transform_response(generated)

            # Generate avatar image based on the assistant's characteristics
            avatar_url = await self.generate_avatar_image(
                name=result["name"],
                description=result["description"],
                personality=result["personality"],
            )
            result["avatarUrl"] = avatar_url

            return result

        except Exception as e:
            logger.error(f"Assistant generation failed: {e}")
            raise ValueError(f"Failed to generate assistant: {e}")

    def _transform_response(self, generated: dict[str, Any]) -> dict[str, Any]:
        """Transform LLM response to match AssistantGenerateResponse schema."""
        # Ensure tags are limited and lowercase
        tags = generated.get("tags", [])
        if isinstance(tags, list):
            tags = [str(t).lower().strip()[:20] for t in tags[:5]]
        else:
            tags = []

        return {
            "name": generated.get("name", "My Assistant")[:100],
            "description": generated.get("description", "A helpful AI companion")[:500],
            "personality": generated.get("personality", "I am a helpful AI assistant."),
            "tone": generated.get("tone", "friendly"),
            "voiceSettings": {
                "voiceId": generated.get("voiceId", "ara"),
                "speed": max(0.5, min(2.0, generated.get("speed", 1.0))),
                "pitch": max(0.5, min(2.0, generated.get("pitch", 1.0))),
            },
            "avatarEmoji": generated.get("avatarEmoji", "\U0001f916"),
            "avatarUrl": None,
            "isPublic": generated.get("isPublic", True),
            "tags": tags,
        }


# Singleton instance
assistant_generation_service = AssistantGenerationService()
