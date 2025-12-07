'use client';

import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { AppShell } from '@/components/layout';
import { AssistantGrid } from '@/components/discovery';
import { useAssistants } from '@/hooks/use-assistants';

export default function DiscoveryPage() {
  const { assistants } = useAssistants();

  return (
    <AppShell>
      <div className="px-4 py-6 md:px-8 md:py-10">
        {/* Page Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500/10 to-fuchsia-500/10">
              <Sparkles className="h-5 w-5 text-violet-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
                Discover
              </h1>
              <p className="text-sm text-muted-foreground">
                Find your perfect AI companion
              </p>
            </div>
          </div>
        </motion.div>

        {/* Assistant Grid */}
        <AssistantGrid assistants={assistants} />
      </div>
    </AppShell>
  );
}
