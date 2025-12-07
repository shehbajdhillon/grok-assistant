'use client';

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { AssistantCard } from './assistant-card';
import { AssistantCardSkeleton } from './assistant-card-skeleton';
import { Assistant } from '@/types';
import { useConversations } from '@/hooks/use-conversations';

interface AssistantGridProps {
  assistants: Assistant[];
  isLoading?: boolean;
}

export function AssistantGrid({ assistants, isLoading = false }: AssistantGridProps) {
  const router = useRouter();
  const { create: createConversation } = useConversations();

  const handleAssistantClick = (assistant: Assistant) => {
    // Create a new conversation and navigate to it
    const conversation = createConversation(assistant.id);
    router.push(`/chat/${conversation.id}`);
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <AssistantCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (assistants.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center justify-center py-20 text-center"
      >
        <div className="mb-4 text-6xl">🤖</div>
        <h3 className="mb-2 text-lg font-semibold">No assistants yet</h3>
        <p className="text-sm text-muted-foreground">
          Create your first AI companion to get started
        </p>
      </motion.div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
      {assistants.map((assistant, index) => (
        <AssistantCard
          key={assistant.id}
          assistant={assistant}
          onClick={() => handleAssistantClick(assistant)}
          index={index}
        />
      ))}
    </div>
  );
}
