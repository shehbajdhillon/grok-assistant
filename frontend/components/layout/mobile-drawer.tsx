'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Compass,
  MessageSquare,
  Settings,
  Sparkles,
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { ModeToggle } from '@/components/mode-toggle';
import { APP_NAME } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { Conversation } from '@/types';

interface MobileDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversations: Conversation[];
}

export function MobileDrawer({
  open,
  onOpenChange,
  conversations,
}: MobileDrawerProps) {
  const pathname = usePathname();

  const handleLinkClick = () => {
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-72 p-0">
        <SheetHeader className="flex h-14 flex-row items-center gap-3 border-b border-border/50 px-6">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 shadow-lg shadow-violet-500/25">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <SheetTitle className="text-lg font-semibold tracking-tight">
            {APP_NAME}
          </SheetTitle>
        </SheetHeader>

        {/* Navigation */}
        <nav className="px-3 py-4">
          <Link
            href="/home"
            onClick={handleLinkClick}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
              pathname === '/home'
                ? 'bg-accent text-accent-foreground'
                : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
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
                      onClick={handleLinkClick}
                      className={cn(
                        'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-200',
                        isActive
                          ? 'bg-accent text-accent-foreground'
                          : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
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
        <div className="absolute bottom-0 left-0 right-0 border-t border-border/50 bg-background p-3">
          <Link
            href="/home/settings"
            onClick={handleLinkClick}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
              pathname === '/home/settings'
                ? 'bg-accent text-accent-foreground'
                : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
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
      </SheetContent>
    </Sheet>
  );
}
