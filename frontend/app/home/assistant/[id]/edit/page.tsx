'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { EditorForm } from '@/components/assistant-editor';
import { useAssistants } from '@/hooks/use-assistants';
import { Assistant, User } from '@/types';
import * as api from '@/lib/api-client';
import { useAuthReady } from '@/components/providers/api-provider';

export default function EditAssistantPage() {
  const params = useParams();
  const router = useRouter();
  const { getById, update, remove } = useAssistants();
  const authReady = useAuthReady();

  const assistantId = params.id as string;
  const [assistant, setAssistant] = useState<Assistant | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Load current user and assistant
  useEffect(() => {
    if (!authReady) return;

    Promise.all([
      api.getCurrentUser(),
      getById(assistantId)
    ])
      .then(([user, data]) => {
        setCurrentUser(user);

        if (!data) {
          router.push('/home');
          return;
        }

        // Check if user owns this assistant
        if (data.createdBy !== user.id && data.createdBy !== 'system') {
          console.warn('User does not own this assistant');
          router.push('/home');
          return;
        }

        // Don't allow editing system assistants
        if (data.createdBy === 'system') {
          console.warn('Cannot edit system assistants');
          router.push('/home');
          return;
        }

        setAssistant(data);
      })
      .catch(err => {
        console.error('Failed to load data:', err);
        router.push('/home');
      })
      .finally(() => setLoading(false));
  }, [assistantId, getById, router, authReady]);

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
