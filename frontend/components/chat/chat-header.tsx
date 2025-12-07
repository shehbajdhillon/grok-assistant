'use client';

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, MoreVertical, Volume2, VolumeX, Wifi, WifiOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Assistant } from '@/types';
import { TONE_LABELS, TONE_COLORS } from '@/lib/constants';
import { cn } from '@/lib/utils';

interface ChatHeaderProps {
  assistant: Assistant;
  voiceEnabled?: boolean;
  onToggleVoice?: () => void;
  onDeleteChat?: () => void;
  isConnected?: boolean;
  isConnecting?: boolean;
  onReconnect?: () => void;
}

export function ChatHeader({
  assistant,
  voiceEnabled = true,
  onToggleVoice,
  onDeleteChat,
  isConnected = true,
  isConnecting = false,
  onReconnect,
}: ChatHeaderProps) {
  const router = useRouter();

  return (
    <motion.header
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex h-16 items-center justify-between border-b border-border/50 bg-background/80 px-4 backdrop-blur-xl md:px-6"
    >
      {/* Left: Back button + Assistant info */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push('/home')}
          className="h-9 w-9 shrink-0"
        >
          <ArrowLeft className="h-5 w-5" />
          <span className="sr-only">Back to discover</span>
        </Button>

        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10 rounded-xl border border-border/50 shadow-sm">
            {assistant.avatarUrl && (
              <AvatarImage src={assistant.avatarUrl} alt={assistant.name} />
            )}
            <AvatarFallback className="rounded-xl bg-muted text-xl">
              {assistant.avatarEmoji}
            </AvatarFallback>
          </Avatar>

          <div className="hidden sm:block">
            <h2 className="text-sm font-semibold">{assistant.name}</h2>
            <Badge
              variant="secondary"
              className={cn(
                'mt-0.5 border-0 px-1.5 py-0 text-[10px] font-medium',
                TONE_COLORS[assistant.tone]
              )}
            >
              {TONE_LABELS[assistant.tone]}
            </Badge>
          </div>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-1">
        {/* Connection status indicator */}
        {isConnecting ? (
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            disabled
          >
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            <span className="sr-only">Connecting...</span>
          </Button>
        ) : !isConnected ? (
          <Button
            variant="ghost"
            size="icon"
            onClick={onReconnect}
            className="h-9 w-9 text-destructive hover:text-destructive"
            title="Disconnected - click to reconnect"
          >
            <WifiOff className="h-4 w-4" />
            <span className="sr-only">Reconnect</span>
          </Button>
        ) : null}

        {onToggleVoice && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleVoice}
            className="h-9 w-9"
          >
            {voiceEnabled ? (
              <Volume2 className="h-5 w-5" />
            ) : (
              <VolumeX className="h-5 w-5" />
            )}
            <span className="sr-only">
              {voiceEnabled ? 'Disable voice' : 'Enable voice'}
            </span>
          </Button>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <MoreVertical className="h-5 w-5" />
              <span className="sr-only">More options</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem
              onClick={() => router.push(`/home/assistant/${assistant.id}/edit`)}
            >
              Edit assistant
            </DropdownMenuItem>
            {onDeleteChat && (
              <DropdownMenuItem
                onClick={onDeleteChat}
                className="text-destructive focus:text-destructive"
              >
                Delete chat
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </motion.header>
  );
}
