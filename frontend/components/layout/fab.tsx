'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface FABProps {
  href?: string;
  onClick?: () => void;
  label?: string;
}

export function FAB({
  href = '/assistant/new',
  onClick,
  label = 'Create new assistant',
}: FABProps) {
  const content = (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{
        type: 'spring',
        stiffness: 260,
        damping: 20,
        delay: 0.2,
      }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className="fixed bottom-6 right-6 z-50 md:bottom-8 md:right-8"
    >
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              onClick={onClick}
              className="h-14 w-14 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 shadow-xl shadow-violet-500/30 transition-shadow hover:shadow-2xl hover:shadow-violet-500/40"
            >
              <Plus className="h-6 w-6 text-white" />
              <span className="sr-only">{label}</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left" sideOffset={12}>
            <p>{label}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </motion.div>
  );

  if (href && !onClick) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}
