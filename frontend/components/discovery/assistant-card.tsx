'use client';

import { motion } from 'framer-motion';
import { Users } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Assistant } from '@/types';
import { TONE_LABELS, TONE_COLORS } from '@/lib/constants';
import { cn } from '@/lib/utils';

interface AssistantCardProps {
  assistant: Assistant;
  onClick?: () => void;
  index?: number;
}

export function AssistantCard({ assistant, onClick, index = 0 }: AssistantCardProps) {
  const formatUsageCount = (count: number) => {
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}k`;
    }
    return count.toString();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.4,
        delay: index * 0.05,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.98 }}
    >
      <Card
        onClick={onClick}
        className={cn(
          'group relative cursor-pointer overflow-hidden border-border/50 bg-card/50 p-5 backdrop-blur-sm transition-all duration-300',
          'hover:border-violet-500/30 hover:bg-card hover:shadow-xl hover:shadow-violet-500/5'
        )}
      >
        {/* Gradient overlay on hover */}
        <div className="absolute inset-0 bg-gradient-to-br from-violet-500/0 to-fuchsia-500/0 opacity-0 transition-opacity duration-300 group-hover:opacity-5" />

        {/* Content */}
        <div className="relative space-y-4">
          {/* Header: Avatar + Badge */}
          <div className="flex items-start justify-between">
            <Avatar className="h-14 w-14 rounded-xl border-2 border-border/50 shadow-lg transition-transform duration-300 group-hover:scale-105">
              {assistant.avatarUrl && (
                <AvatarImage src={assistant.avatarUrl} alt={assistant.name} />
              )}
              <AvatarFallback className="rounded-xl bg-gradient-to-br from-muted to-muted/50 text-2xl">
                {assistant.avatarEmoji}
              </AvatarFallback>
            </Avatar>

            <Badge
              variant="secondary"
              className={cn(
                'border-0 text-xs font-medium',
                TONE_COLORS[assistant.tone]
              )}
            >
              {TONE_LABELS[assistant.tone]}
            </Badge>
          </div>

          {/* Name */}
          <div>
            <h3 className="text-lg font-semibold tracking-tight transition-colors group-hover:text-violet-500 dark:group-hover:text-violet-400">
              {assistant.name}
            </h3>
          </div>

          {/* Description */}
          <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
            {assistant.description}
          </p>

          {/* Footer: Tags + Usage */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex flex-wrap gap-1.5">
              {assistant.tags.slice(0, 2).map((tag) => (
                <span
                  key={tag}
                  className="rounded-md bg-muted/50 px-2 py-0.5 text-xs text-muted-foreground"
                >
                  {tag}
                </span>
              ))}
            </div>

            <div className="flex items-center gap-1 text-xs text-muted-foreground/70">
              <Users className="h-3.5 w-3.5" />
              <span>{formatUsageCount(assistant.usageCount)}</span>
            </div>
          </div>
        </div>

        {/* Bottom accent line */}
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-violet-500/0 via-violet-500/50 to-fuchsia-500/0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      </Card>
    </motion.div>
  );
}
