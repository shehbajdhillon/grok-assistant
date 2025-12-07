'use client';

import { useRouter } from 'next/navigation';
import { GenerationWizard } from '@/components/assistant-editor/generation-wizard';
import { useAssistants } from '@/hooks/use-assistants';
import { Assistant } from '@/types';
import * as api from '@/lib/api-client';

export default function NewAssistantPage() {
  const router = useRouter();
  const { create } = useAssistants();

  const handleSave = async (
    data: Omit<Assistant, 'id' | 'createdAt' | 'updatedAt' | 'usageCount'>,
    pendingVoiceFile?: File
  ) => {
    // Create the assistant first
    const newAssistant = await create(data);

    // If there's a pending voice file, upload it now
    if (pendingVoiceFile && newAssistant?.id) {
      try {
        await api.uploadVoiceSample(newAssistant.id, pendingVoiceFile);
      } catch (err) {
        console.error('Failed to upload voice sample:', err);
        // Continue anyway - assistant was created, just without voice
      }
    }

    router.push('/home');
  };

  return <GenerationWizard onSave={handleSave} />;
}
