'use client';

import { useState, useCallback, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ChatHeader, MessageList, ChatInput } from '@/components/chat';
import { useConversation } from '@/hooks/use-conversations';
import { useTTS } from '@/hooks/use-tts';
import { apiClient } from '@/lib/api';
import { getAssistant } from '@/lib/mock-data';

// Map persona keys to assistant IDs (matches frontend/lib/mock-data.ts)
const PERSONA_TO_ASSISTANT: Record<string, string> = {
  atlas: '1',
  luna: '2',
  rex: '3',
  sage: '4',
  noir: '5',
  ziggy: '6',
  // Legacy mappings for backward compatibility
  personal_assistant: '1', // Maps to Atlas
  dating_coach: '2', // Maps to Luna
  friend: '6', // Maps to Ziggy
};

export default function ChatPage() {
  const params = useParams();
  const router = useRouter();
  const conversationId = params.conversationId as string;

  // Redirect if conversationId is undefined or invalid
  useEffect(() => {
    if (!conversationId || conversationId === 'undefined') {
      console.error('Invalid conversationId:', conversationId);
      router.push('/');
    }
  }, [conversationId, router]);

  const { conversation, messages, sendMessage, refresh, isLoading: conversationLoading, error } = useConversation(
    conversationId && conversationId !== 'undefined' ? conversationId : null
  );
  const { speak, stop, isPlaying } = useTTS();

  const [isLoading, setIsLoading] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);
  // Determine assistant ID from conversation's assistantId
  // The conversation stores the assistantId when created, so use that directly
  const assistantId = conversation?.assistantId || '1'; // Default to '1' (atlas) if no conversation yet
  const assistant = getAssistant(assistantId);
  
  // Ensure we always have an assistant (use default if needed)
  const finalAssistant = assistant || getAssistant('1');

  // Redirect if conversation not found after loading
  useEffect(() => {
    if (!conversationLoading && !conversation && conversationId) {
      // Conversation doesn't exist, but we can still chat - create it implicitly
      // Or redirect to home
      // router.push('/');
    }
  }, [conversation, conversationLoading, conversationId, router]);

  const handleSendMessage = useCallback(async (content: string) => {
    if (!conversationId) return;

    setIsLoading(true);
    try {
      // Send message via API (this handles both user and assistant messages)
      const assistantMessage = await sendMessage(content, 'user');
      
      // Auto-play voice if enabled
      if (voiceEnabled && assistantMessage && finalAssistant) {
        setPlayingMessageId(assistantMessage.id);
        speak(assistantMessage.content, finalAssistant.voiceSettings);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      // TODO: Show error toast/notification
    } finally {
      setIsLoading(false);
    }
  }, [conversationId, sendMessage, voiceEnabled, finalAssistant, speak]);

  const handlePlayAudio = useCallback((messageId: string, content: string) => {
    if (!finalAssistant) return;
    setPlayingMessageId(messageId);
    speak(content, finalAssistant.voiceSettings);
  }, [finalAssistant, speak]);

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
    // TODO: Implement delete conversation endpoint in backend
    router.push('/');
  }, [router]);

  // Show loading state
  if (conversationLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="text-lg">Loading conversation...</div>
        </div>
      </div>
    );
  }

  // Show error state only if conversation failed to load initially
  // Don't show full-screen error for send message errors - show conversation with error message
  if (error && !conversation && conversationLoading === false) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="text-lg text-red-500">Error: {error}</div>
          <button
            onClick={() => refresh()}
            className="mt-4 rounded bg-blue-500 px-4 py-2 text-white"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!finalAssistant) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="text-lg text-red-500">Error: Could not load assistant</div>
          <button
            onClick={() => router.push('/')}
            className="mt-4 rounded bg-blue-500 px-4 py-2 text-white"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-background">
      <ChatHeader
        assistant={finalAssistant}
        voiceEnabled={voiceEnabled}
        onToggleVoice={() => setVoiceEnabled(!voiceEnabled)}
        onDeleteChat={handleDeleteChat}
      />

      {/* Show error banner if there's an error but conversation exists */}
      {error && conversation && (
        <div className="bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800 px-4 py-2 text-sm text-red-600 dark:text-red-400">
          Error: {error} <button onClick={() => refresh()} className="underline ml-2">Retry</button>
        </div>
      )}

      <MessageList
        messages={messages}
        assistant={finalAssistant}
        playingMessageId={playingMessageId}
        onPlayAudio={handlePlayAudio}
        onStopAudio={handleStopAudio}
      />

      <ChatInput
        onSend={handleSendMessage}
        disabled={isLoading}
        placeholder="Type a message..."
      />
    </div>
  );
}
