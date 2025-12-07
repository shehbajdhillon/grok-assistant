'use client';

import { motion } from 'framer-motion';
import { Assistant } from '@/types';
import { Avatar } from '@/components/ui/avatar';

interface TypingIndicatorProps {
  assistant?: Assistant;
}

export function TypingIndicator({ assistant }: TypingIndicatorProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
      className="flex items-start gap-3"
    >
      <Avatar className="h-8 w-8 shrink-0 border-2 border-border/50 bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20">
        <div className="flex h-full w-full items-center justify-center text-lg">
          {assistant?.avatarEmoji || '🤖'}
        </div>
      </Avatar>

      <div className="flex items-center gap-3 rounded-2xl rounded-tl-sm bg-muted/80 px-4 py-3 backdrop-blur-sm">
        <div className="flex gap-1">
          <motion.div
            className="h-2 w-2 rounded-full bg-violet-500"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.5, 1, 0.5],
            }}
            transition={{
              duration: 1.2,
              repeat: Infinity,
              delay: 0,
            }}
          />
          <motion.div
            className="h-2 w-2 rounded-full bg-violet-500"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.5, 1, 0.5],
            }}
            transition={{
              duration: 1.2,
              repeat: Infinity,
              delay: 0.2,
            }}
          />
          <motion.div
            className="h-2 w-2 rounded-full bg-violet-500"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.5, 1, 0.5],
            }}
            transition={{
              duration: 1.2,
              repeat: Infinity,
              delay: 0.4,
            }}
          />
        </div>
        <span className="text-xs text-muted-foreground">
          {assistant?.name || 'AI'} is thinking...
        </span>
      </div>
    </motion.div>
  );
}
