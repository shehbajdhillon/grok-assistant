'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { EditorForm } from '@/components/assistant-editor';
import { useAssistants } from '@/hooks/use-assistants';
import { Assistant } from '@/types';

export default function EditAssistantPage() {
  const params = useParams();
  const router = useRouter();
  const { getById, update, remove } = useAssistants();

  const assistantId = params.id as string;
  const assistant = getById(assistantId);

  // Redirect if assistant not found
  useEffect(() => {
    if (!assistant) {
      router.push('/home');
    }
  }, [assistant, router]);

  const handleSave = (data: Omit<Assistant, 'id' | 'createdAt' | 'updatedAt' | 'usageCount'>) => {
    update(assistantId, data);
    router.push('/home');
  };

  const handleDelete = () => {
    remove(assistantId);
    router.push('/home');
  };

  if (!assistant) {
    return null;
  }

  return (
    <EditorForm
      assistant={assistant}
      onSave={handleSave}
      onDelete={handleDelete}
      isEditing
    />
  );
}
