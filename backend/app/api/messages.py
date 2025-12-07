"""Message API endpoints."""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db_session
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.message import MessageCreate, MessageResponse, SendMessageResponse
from app.services import conversation_service
from app.services.letta_service import letta_service

router = APIRouter(prefix="/conversations", tags=["messages"])


@router.post("/{conversation_id}/messages", response_model=SendMessageResponse)
async def send_message(
    conversation_id: UUID,
    data: MessageCreate,
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> SendMessageResponse:
    """
    Send a message and get the AI response.

    This endpoint:
    1. Saves the user message to the database
    2. Sends the message to the Letta agent
    3. Gets the AI response
    4. Saves the assistant message to the database
    5. Returns both messages
    """
    # Get conversation with assistant
    conversation = await conversation_service.get_conversation_by_id(
        db, conversation_id, include_messages=False
    )
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    # Check ownership
    if conversation.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="You don't own this conversation")

    # Save user message
    user_message = await conversation_service.add_message(
        db, conversation, role="user", content=data.content
    )

    # Get AI response from Letta
    assistant_content = "I'm sorry, I'm having trouble connecting to my memory system right now. Please try again."

    if conversation.letta_agent_id:
        try:
            assistant_content = await letta_service.send_message(
                agent_id=conversation.letta_agent_id,
                user_message=data.content,
            )
        except Exception as e:
            import logging

            logging.error(f"Letta error: {e}")
            # Use fallback response based on assistant tone
            assistant = conversation.assistant
            if assistant:
                assistant_content = _get_fallback_response(assistant.tone, data.content)
    else:
        # No Letta agent - use mock response
        assistant = conversation.assistant
        if assistant:
            assistant_content = _get_fallback_response(assistant.tone, data.content)

    # Save assistant message
    assistant_message = await conversation_service.add_message(
        db, conversation, role="assistant", content=assistant_content
    )

    return SendMessageResponse(
        userMessage=MessageResponse.from_orm_with_mapping(user_message),
        assistantMessage=MessageResponse.from_orm_with_mapping(assistant_message),
    )


def _get_fallback_response(tone: str, user_message: str) -> str:
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
