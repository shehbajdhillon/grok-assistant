'use client';

import { useState } from 'react';
import { Sidebar } from './sidebar';
import { MobileHeader } from './mobile-header';
import { MobileDrawer } from './mobile-drawer';
import { FAB } from './fab';
import { useConversations } from '@/hooks/use-conversations';

interface AppShellProps {
  children: React.ReactNode;
  showFab?: boolean;
}

export function AppShell({ children, showFab = true }: AppShellProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { conversations } = useConversations();

  return (
    <div className="relative min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <Sidebar conversations={conversations} />

      {/* Mobile Header */}
      <MobileHeader onMenuClick={() => setDrawerOpen(true)} />

      {/* Mobile Drawer */}
      <MobileDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        conversations={conversations}
      />

      {/* Main Content */}
      <main className="min-h-screen pt-14 md:pl-72 md:pt-0">
        <div className="mx-auto max-w-7xl">{children}</div>
      </main>

      {/* Floating Action Button */}
      {showFab && <FAB />}
    </div>
  );
}
