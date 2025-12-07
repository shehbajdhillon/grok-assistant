'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { EditorForm } from '@/components/assistant-editor';
import { useAssistants } from '@/hooks/use-assistants';
import { Assistant } from '@/types';

export default function EditAssistantPage() {
  const params = useParams();
  const router = useRouter();
  const { getById, update, remove } = useAssistants();

  const assistantId = params.id as string;
  const [assistant, setAssistant] = useState<Assistant | null>(null);
  const [loading, setLoading] = useState(true);

  // Load assistant
  useEffect(() => {
    getById(assistantId)
      .then(data => {
        if (data) {
          setAssistant(data);
        } else {
          router.push('/home');
        }
      })
      .catch(err => {
        console.error('Failed to load assistant:', err);
        router.push('/home');
      })
      .finally(() => setLoading(false));
  }, [assistantId, getById, router]);

  const handleSave = async (data: Omit<Assistant, 'id' | 'createdAt' | 'updatedAt' | 'usageCount'>) => {
    try {
      await update(assistantId, data);
      router.push('/home');
    } catch (err) {
      console.error('Failed to update assistant:', err);
    }
  };

  const handleDelete = async () => {
    try {
      await remove(assistantId);
      router.push('/home');
    } catch (err) {
      console.error('Failed to delete assistant:', err);
    }
  };

  if (loading || !assistant) {
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
