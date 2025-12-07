'use client';

import { useState, useCallback, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ChatHeader, MessageList, ChatInput } from '@/components/chat';
import { useConversation } from '@/hooks/use-conversations';
import { useTTS } from '@/hooks/use-tts';
import { Assistant } from '@/types';
import * as api from '@/lib/api-client';

export default function ChatPage() {
  const params = useParams();
  const router = useRouter();
  const conversationId = params.conversationId as string;

  const { conversation, messages, sendMessage, loading } = useConversation(conversationId);
  const { speak, stop, isPlaying } = useTTS();

  const [assistant, setAssistant] = useState<Assistant | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);

  // Load assistant data
  useEffect(() => {
    if (conversation?.assistantId) {
      api.getAssistant(conversation.assistantId)
        .then(setAssistant)
        .catch(err => console.error('Failed to load assistant:', err));
    }
  }, [conversation?.assistantId]);

  // Redirect if conversation not found
  useEffect(() => {
    if (!loading && !conversation) {
      router.push('/home');
    }
  }, [loading, conversation, router]);

  const handleSendMessage = useCallback(async (content: string) => {
    if (!assistant || !conversation) return;

    setIsLoading(true);

    try {
      // Send message to backend - it will return the assistant's response
      const assistantMessage = await sendMessage(content);

      // Auto-play voice if enabled
      if (voiceEnabled && assistantMessage) {
        setPlayingMessageId(assistantMessage.id);
        speak(assistantMessage.content, assistant.voiceSettings);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsLoading(false);
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

  const handleDeleteChat = useCallback(async () => {
    if (conversation) {
      try {
        await api.deleteConversation(conversation.id);
        router.push('/home');
      } catch (error) {
        console.error('Failed to delete conversation:', error);
      }
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
