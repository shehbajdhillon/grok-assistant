'use client';

import { useEffect, useRef } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageBubble } from './message-bubble';
import { Message, Assistant } from '@/types';

interface MessageListProps {
  messages: Message[];
  assistant?: Assistant;
  playingMessageId?: string | null;
  onPlayAudio?: (messageId: string, content: string) => void;
  onStopAudio?: () => void;
}

export function MessageList({
  messages,
  assistant,
  playingMessageId,
  onPlayAudio,
  onStopAudio,
}: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <ScrollArea className="flex-1 px-4 py-6 md:px-6">
      <div className="mx-auto max-w-3xl space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-4 text-6xl">{assistant?.avatarEmoji || '👋'}</div>
            <h3 className="mb-2 text-lg font-semibold">
              Start chatting with {assistant?.name || 'your assistant'}
            </h3>
            <p className="max-w-sm text-sm text-muted-foreground">
              {assistant?.description || 'Send a message to begin the conversation'}
            </p>
          </div>
        ) : (
          messages.map((message, index) => (
            <MessageBubble
              key={message.id}
              message={message}
              assistant={assistant}
              isPlaying={playingMessageId === message.id}
              onPlayAudio={
                message.role === 'assistant'
                  ? () => onPlayAudio?.(message.id, message.content)
                  : undefined
              }
              onStopAudio={onStopAudio}
              index={index}
            />
          ))
        )}
        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  );
}
