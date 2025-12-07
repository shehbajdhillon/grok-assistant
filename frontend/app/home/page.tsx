'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { AssistantGrid } from '@/components/discovery';
import { Assistant } from '@/types';
import * as api from '@/lib/api-client';
import { useAuthReady } from '@/components/providers/api-provider';

export default function DiscoveryPage() {
  const [assistants, setAssistants] = useState<Assistant[]>([]);
  const [loading, setLoading] = useState(true);
  const authReady = useAuthReady();

  useEffect(() => {
    if (!authReady) return;

    // Load both public assistants and user's own assistants
    Promise.all([
      api.getPublicAssistants(),
      api.getAssistants()
    ])
      .then(([publicAssistants, userAssistants]) => {
        // Combine and deduplicate (in case user's assistant is also public)
        const allAssistants = [...publicAssistants];

        // Add user's assistants that aren't already in the list
        userAssistants.forEach(userAssistant => {
          if (!allAssistants.find(a => a.id === userAssistant.id)) {
            allAssistants.push(userAssistant);
          }
        });

        // Sort by usage count (most popular first)
        allAssistants.sort((a, b) => b.usageCount - a.usageCount);

        setAssistants(allAssistants);
      })
      .catch(err => console.error('Failed to load assistants:', err))
      .finally(() => setLoading(false));
  }, [authReady]);

  return (
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
  );
}
