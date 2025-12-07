'use client';

import { useState, useCallback, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ChatHeader, MessageList, ChatInput } from '@/components/chat';
import { useConversation } from '@/hooks/use-conversations';
import { useChatWebSocket } from '@/hooks/use-chat-websocket';
import { useTTS } from '@/hooks/use-tts';
import { Assistant, Message } from '@/types';
import * as api from '@/lib/api-client';

export default function ChatPage() {
  const params = useParams();
  const router = useRouter();
  const conversationId = params.conversationId as string;

  // Load initial conversation data
  const { conversation, messages: initialMessages, refresh, loading } = useConversation(conversationId);

  // TTS hook for replaying past messages (click to play)
  const { speak, stop, isPlaying: isTTSPlaying } = useTTS();

  const [assistant, setAssistant] = useState<Assistant | null>(null);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);
  const [localMessages, setLocalMessages] = useState<Message[]>([]);
  const [isWaitingForResponse, setIsWaitingForResponse] = useState(false);

  // WebSocket for real-time chat
  const {
    isConnected,
    isConnecting,
    isPlaying: isStreamingAudio,
    sendMessage: wsSendMessage,
    stopAudio,
    reconnect,
  } = useChatWebSocket({
    conversationId,
    voiceEnabled,
    onUserMessage: useCallback((message: Message) => {
      setLocalMessages((prev) => [...prev, message]);
    }, []),
    onAssistantMessage: useCallback((message: Message) => {
      setLocalMessages((prev) => [...prev, message]);
      setPlayingMessageId(message.id);
      setIsWaitingForResponse(false);
    }, []),
    onError: useCallback((error: string) => {
      console.error('Chat WebSocket error:', error);
      setIsWaitingForResponse(false);
    }, []),
  });

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

  // Reset local messages when conversation changes
  useEffect(() => {
    setLocalMessages([]);
  }, [conversationId]);

  // Merge initial messages with local messages (from WebSocket)
  const allMessages = useCallback(() => {
    const messageMap = new Map<string, Message>();

    // Add initial messages
    for (const msg of initialMessages) {
      messageMap.set(msg.id, msg);
    }

    // Add/update with local messages (prefer local as they're more recent)
    for (const msg of localMessages) {
      messageMap.set(msg.id, msg);
    }

    // Sort by createdAt
    return Array.from(messageMap.values()).sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  }, [initialMessages, localMessages])();

  const handleSendMessage = useCallback((content: string) => {
    if (!assistant || !conversation || !isConnected) return;

    setIsWaitingForResponse(true);

    // Stop any playing audio
    stopAudio();
    stop();
    setPlayingMessageId(null);

    // Send via WebSocket
    wsSendMessage(content);
  }, [assistant, conversation, isConnected, wsSendMessage, stopAudio, stop]);

  const handleSendAudio = useCallback(async (audioBlob: Blob) => {
    if (!assistant || !conversation) return;

    setIsWaitingForResponse(true);

    try {
      // For now, audio messages still use HTTP (transcription happens server-side)
      // TODO: Could extend WebSocket to support audio messages
      const assistantMessage = await api.sendAudioMessage(conversationId, audioBlob);

      // Refresh to get both messages
      await refresh();

      // Auto-play voice if enabled (using TTS hook for replay)
      if (voiceEnabled && assistantMessage) {
        setPlayingMessageId(assistantMessage.id);
        speak(assistantMessage.content, assistant.voiceSettings);
      }
    } catch (error) {
      console.error('Failed to send audio message:', error);
    } finally {
      setIsWaitingForResponse(false);
    }
  }, [assistant, conversation, conversationId, voiceEnabled, speak, refresh]);

  // Play audio for a past message (using TTS hook, not streaming)
  const handlePlayAudio = useCallback((messageId: string, content: string) => {
    if (!assistant) return;

    // Stop any streaming audio first
    stopAudio();

    setPlayingMessageId(messageId);
    speak(content, assistant.voiceSettings);
  }, [assistant, speak, stopAudio]);

  const handleStopAudio = useCallback(() => {
    // Stop both streaming audio and TTS playback
    stopAudio();
    stop();
    setPlayingMessageId(null);
  }, [stopAudio, stop]);

  // Clear playing state when audio ends
  useEffect(() => {
    if (!isTTSPlaying && !isStreamingAudio) {
      setPlayingMessageId(null);
    }
  }, [isTTSPlaying, isStreamingAudio]);

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
        isConnected={isConnected}
        isConnecting={isConnecting}
        onReconnect={reconnect}
      />

      <MessageList
        messages={allMessages}
        assistant={assistant}
        playingMessageId={playingMessageId}
        onPlayAudio={handlePlayAudio}
        onStopAudio={handleStopAudio}
        isLoading={isWaitingForResponse || loading}
      />

      <ChatInput
        onSend={handleSendMessage}
        onSendAudio={handleSendAudio}
        disabled={isWaitingForResponse || !isConnected}
        placeholder={
          isConnecting
            ? 'Connecting...'
            : !isConnected
            ? 'Disconnected - click to reconnect'
            : `Message ${assistant.name}...`
        }
      />
    </div>
  );
}
