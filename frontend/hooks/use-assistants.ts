'use client';

import { useState, useCallback, useEffect } from 'react';
import { Assistant } from '@/types';
import * as api from '@/lib/api-client';
import { useAuthReady } from '@/components/providers/api-provider';

export function useAssistants() {
  const [assistants, setAssistants] = useState<Assistant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const authReady = useAuthReady();

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getAssistants();
      setAssistants(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load assistants');
      console.error('Failed to load assistants:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authReady) {
      refresh();
    }
  }, [authReady, refresh]);

  const getById = useCallback(async (id: string) => {
    try {
      return await api.getAssistant(id);
    } catch (err) {
      console.error('Failed to get assistant:', err);
      throw err;
    }
  }, []);

  const getPublic = useCallback(async () => {
    try {
      return await api.getPublicAssistants();
    } catch (err) {
      console.error('Failed to get public assistants:', err);
      throw err;
    }
  }, []);

  const create = useCallback(
    async (data: Omit<Assistant, 'id' | 'createdAt' | 'updatedAt' | 'usageCount'>) => {
      try {
        const newAssistant = await api.createAssistant(data);
        await refresh();
        return newAssistant;
      } catch (err) {
        console.error('Failed to create assistant:', err);
        throw err;
      }
    },
    [refresh]
  );

  const update = useCallback(
    async (id: string, data: Partial<Assistant>) => {
      try {
        const updated = await api.updateAssistant(id, data);
        await refresh();
        return updated;
      } catch (err) {
        console.error('Failed to update assistant:', err);
        throw err;
      }
    },
    [refresh]
  );

  const remove = useCallback(
    async (id: string) => {
      try {
        await api.deleteAssistant(id);
        await refresh();
        return true;
      } catch (err) {
        console.error('Failed to delete assistant:', err);
        return false;
      }
    },
    [refresh]
  );

  return {
    assistants,
    loading,
    error,
    refresh,
    getById,
    getPublic,
    create,
    update,
    remove,
  };
}
