'use client';

import { useRouter } from 'next/navigation';
import { EditorForm } from '@/components/assistant-editor';
import { useAssistants } from '@/hooks/use-assistants';
import { Assistant } from '@/types';

export default function NewAssistantPage() {
  const router = useRouter();
  const { create } = useAssistants();

  const handleSave = (data: Omit<Assistant, 'id' | 'createdAt' | 'updatedAt' | 'usageCount'>) => {
    create(data);
    router.push('/');
  };

  return <EditorForm onSave={handleSave} />;
}
