'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Compass,
  MessageSquare,
  Settings,
  Sparkles,
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { ModeToggle } from '@/components/mode-toggle';
import { APP_NAME } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { Conversation } from '@/types';

interface SidebarProps {
  conversations: Conversation[];
  onConversationClick?: (id: string) => void;
}

export function Sidebar({ conversations, onConversationClick }: SidebarProps) {
  const pathname = usePathname();

  return (
    <motion.aside
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="fixed left-0 top-0 z-30 hidden h-screen w-72 flex-col border-r border-border/50 bg-sidebar md:flex"
    >
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 px-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 shadow-lg shadow-violet-500/25">
          <Sparkles className="h-5 w-5 text-white" />
        </div>
        <span className="text-lg font-semibold tracking-tight">{APP_NAME}</span>
      </div>

      <Separator className="opacity-50" />

      {/* Navigation */}
      <nav className="px-3 py-4">
        <Link
          href="/home"
          className={cn(
            'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
            pathname === '/home'
              ? 'bg-sidebar-accent text-sidebar-accent-foreground'
              : 'text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
          )}
        >
          <Compass className="h-4 w-4" />
          Discover
        </Link>
      </nav>

      <Separator className="mx-3 opacity-50" />

      {/* Recent Conversations */}
      <div className="flex-1 overflow-hidden px-3 py-4">
        <p className="mb-3 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground/70">
          Recent Chats
        </p>
        <ScrollArea className="h-[calc(100vh-320px)]">
          <div className="space-y-1">
            {conversations.length === 0 ? (
              <p className="px-3 py-8 text-center text-sm text-muted-foreground/60">
                No conversations yet
              </p>
            ) : (
              conversations.slice(0, 10).map((convo) => {
                const assistant = convo.assistant;
                const isActive = pathname === `/home/chat/${convo.id}`;

                if (!assistant) return null;

                return (
                  <Link
                    key={convo.id}
                    href={`/home/chat/${convo.id}`}
                    onClick={() => onConversationClick?.(convo.id)}
                    className={cn(
                      'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-200',
                      isActive
                        ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                        : 'text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                    )}
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-muted text-base">
                      {assistant?.avatarEmoji || '💬'}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{convo.title}</p>
                      <p className="truncate text-xs text-muted-foreground/70">
                        {assistant?.name || 'Assistant'}
                      </p>
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Bottom Section */}
      <div className="mt-auto border-t border-border/50 p-3">
        <Link
          href="/home/settings"
          className={cn(
            'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
            pathname === '/home/settings'
              ? 'bg-sidebar-accent text-sidebar-accent-foreground'
              : 'text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
          )}
        >
          <Settings className="h-4 w-4" />
          Settings
        </Link>
        <div className="mt-2 flex items-center justify-between px-3 py-2">
          <span className="text-xs text-muted-foreground">Theme</span>
          <ModeToggle />
        </div>
      </div>
    </motion.aside>
  );
}
