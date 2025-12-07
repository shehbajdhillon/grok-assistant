'use client';

import { useRouter } from 'next/navigation';
import { GenerationWizard } from '@/components/assistant-editor/generation-wizard';
import { useAssistants } from '@/hooks/use-assistants';
import { Assistant } from '@/types';

export default function NewAssistantPage() {
  const router = useRouter();
  const { create } = useAssistants();

  const handleSave = async (data: Omit<Assistant, 'id' | 'createdAt' | 'updatedAt' | 'usageCount'>) => {
    await create(data);
    router.push('/home');
  };

  return <GenerationWizard onSave={handleSave} />;
}
