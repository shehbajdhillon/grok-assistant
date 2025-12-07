'use client';

import { useState, useCallback, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ChatHeader, MessageList, ChatInput } from '@/components/chat';
import { useConversation } from '@/hooks/use-conversations';
import { useTTS } from '@/hooks/use-tts';
import { getAssistant, deleteConversation } from '@/lib/mock-data';

// Simulated AI responses based on assistant personality
const generateResponse = (personality: string, userMessage: string): string => {
  // This is a mock - in production, this would call your AI API
  const responses: Record<string, string[]> = {
    professional: [
      "I understand your point. Let me provide a structured approach to this...",
      "That's an excellent question. Here's what I'd recommend...",
      "Based on what you've shared, I think the best course of action would be...",
    ],
    empathetic: [
      "I hear you, and I want you to know that your feelings are valid...",
      "Thank you for sharing that with me. It takes courage to open up...",
      "I'm here for you. Let's explore this together at your own pace...",
    ],
    motivational: [
      "THAT'S what I'm talking about, champ! Let's get after it!",
      "No excuses, warrior! You've got this - time to push through!",
      "Remember why you started! Every rep counts, every step matters!",
    ],
    friendly: [
      "Oh, that's interesting! Here's what I think might help...",
      "Great question! Let me break this down in a simple way...",
      "I love your curiosity! Here's the fun part about this...",
    ],
    mysterious: [
      "Ah, your question drifts through the shadows of understanding...",
      "In the dim corridors of knowledge, a truth awaits...",
      "The answer, like smoke, curls through the darkness...",
    ],
    humorous: [
      "OH BOY, you've come to the right AI for this one! *cracks virtual knuckles*",
      "Buckle up buttercup, because this is gonna be FUN!!!",
      "Okay okay okay, let me channel my inner genius here... *dramatic pause*",
    ],
    casual: [
      "Yeah totally! So here's the deal...",
      "Oh for sure, let me break it down real quick...",
      "Gotcha! Here's what I'm thinking...",
    ],
    formal: [
      "I appreciate your inquiry. Please allow me to elaborate...",
      "Your question merits careful consideration. I shall address it thusly...",
      "Indeed, this is a matter worthy of detailed examination...",
    ],
  };

  const toneResponses = responses[personality] || responses.friendly;
  const randomResponse = toneResponses[Math.floor(Math.random() * toneResponses.length)];

  return `${randomResponse}\n\nRegarding "${userMessage.slice(0, 50)}${userMessage.length > 50 ? '...' : ''}" - I'm here to help you explore this further. What specific aspect would you like to dive deeper into?`;
};

export default function ChatPage() {
  const params = useParams();
  const router = useRouter();
  const conversationId = params.conversationId as string;

  const { conversation, messages, sendMessage, refresh } = useConversation(conversationId);
  const { speak, stop, isPlaying } = useTTS();

  const [isLoading, setIsLoading] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);

  const assistant = conversation ? getAssistant(conversation.assistantId) : null;

  // Redirect if conversation not found
  useEffect(() => {
    if (!conversation) {
      router.push('/');
    }
  }, [conversation, router]);

  const handleSendMessage = useCallback(async (content: string) => {
    if (!assistant || !conversation) return;

    // Add user message
    sendMessage(content, 'user');
    setIsLoading(true);

    // Simulate AI response delay
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1500));

    // Generate and add AI response
    const response = generateResponse(assistant.tone, content);
    const assistantMessage = sendMessage(response, 'assistant');

    setIsLoading(false);

    // Auto-play voice if enabled
    if (voiceEnabled && assistantMessage) {
      setPlayingMessageId(assistantMessage.id);
      speak(response, assistant.voiceSettings);
    }
  }, [assistant, conversation, sendMessage, voiceEnabled, speak]);

  const handlePlayAudio = useCallback((messageId: string, content: string) => {
    if (!assistant) return;
    setPlayingMessageId(messageId);
    speak(content, assistant.voiceSettings);
  }, [assistant, speak]);

  const handleStopAudio = useCallback(() => {
    stop();
    setPlayingMessageId(null);
  }, [stop]);

  // Clear playing state when speech ends
  useEffect(() => {
    if (!isPlaying) {
      setPlayingMessageId(null);
    }
  }, [isPlaying]);

  const handleDeleteChat = useCallback(() => {
    if (conversation) {
      deleteConversation(conversation.id);
      router.push('/');
    }
  }, [conversation, router]);

  if (!conversation || !assistant) {
    return null;
  }

  return (
    <div className="flex h-screen flex-col bg-background">
      <ChatHeader
        assistant={assistant}
        voiceEnabled={voiceEnabled}
        onToggleVoice={() => setVoiceEnabled(!voiceEnabled)}
        onDeleteChat={handleDeleteChat}
      />

      <MessageList
        messages={messages}
        assistant={assistant}
        playingMessageId={playingMessageId}
        onPlayAudio={handlePlayAudio}
        onStopAudio={handleStopAudio}
      />

      <ChatInput
        onSend={handleSendMessage}
        disabled={isLoading}
        placeholder={`Message ${assistant.name}...`}
      />
    </div>
  );
}
