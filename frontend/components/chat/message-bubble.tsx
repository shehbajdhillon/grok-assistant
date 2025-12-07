'use client';

import { motion } from 'framer-motion';
import { Volume2, VolumeX, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Message, Assistant } from '@/types';
import { cn } from '@/lib/utils';

interface MessageBubbleProps {
  message: Message;
  assistant?: Assistant;
  isPlaying?: boolean;
  onPlayAudio?: () => void;
  onStopAudio?: () => void;
  index?: number;
}

export function MessageBubble({
  message,
  assistant,
  isPlaying = false,
  onPlayAudio,
  onStopAudio,
  index = 0,
}: MessageBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        duration: 0.3,
        delay: index * 0.05,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
      className={cn('flex gap-3', isUser ? 'flex-row-reverse' : 'flex-row')}
    >
      {/* Avatar */}
      <Avatar className="h-8 w-8 shrink-0 rounded-lg shadow-sm">
        {isUser ? (
          <AvatarFallback className="rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white">
            <User className="h-4 w-4" />
          </AvatarFallback>
        ) : (
          <>
            {assistant?.avatarUrl && (
              <AvatarImage src={assistant.avatarUrl} alt={assistant.name} />
            )}
            <AvatarFallback className="rounded-lg bg-muted text-lg">
              {assistant?.avatarEmoji || '🤖'}
            </AvatarFallback>
          </>
        )}
      </Avatar>

      {/* Message Content */}
      <div
        className={cn(
          'group relative max-w-[80%] space-y-2 rounded-2xl px-4 py-3 shadow-sm md:max-w-[70%]',
          isUser
            ? 'rounded-tr-sm bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white'
            : 'rounded-tl-sm bg-muted/70'
        )}
      >
        <p className="whitespace-pre-wrap text-sm leading-relaxed">
          {message.content}
        </p>

        {/* Voice playback for assistant messages */}
        {!isUser && (onPlayAudio || onStopAudio) && (
          <div className="flex items-center justify-end">
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                'h-7 w-7 opacity-0 transition-opacity group-hover:opacity-100',
                isPlaying && 'opacity-100'
              )}
              onClick={isPlaying ? onStopAudio : onPlayAudio}
            >
              {isPlaying ? (
                <VolumeX className="h-4 w-4" />
              ) : (
                <Volume2 className="h-4 w-4" />
              )}
              <span className="sr-only">
                {isPlaying ? 'Stop playback' : 'Play message'}
              </span>
            </Button>
          </div>
        )}
      </div>
    </motion.div>
  );
}
