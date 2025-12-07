'use client';

import { useState, useCallback } from 'react';
import { Assistant } from '@/types';
import {
  getAssistants,
  getAssistant,
  getPublicAssistants,
  createAssistant,
  updateAssistant,
  deleteAssistant,
} from '@/lib/mock-data';

export function useAssistants() {
  const [assistants, setAssistants] = useState<Assistant[]>(() => getAssistants());

  const refresh = useCallback(() => {
    setAssistants(getAssistants());
  }, []);

  const getById = useCallback((id: string) => {
    return getAssistant(id);
  }, []);

  const getPublic = useCallback(() => {
    return getPublicAssistants();
  }, []);

  const create = useCallback(
    (data: Omit<Assistant, 'id' | 'createdAt' | 'updatedAt' | 'usageCount'>) => {
      const newAssistant = createAssistant(data);
      refresh();
      return newAssistant;
    },
    [refresh]
  );

  const update = useCallback(
    (id: string, data: Partial<Assistant>) => {
      const updated = updateAssistant(id, data);
      refresh();
      return updated;
    },
    [refresh]
  );

  const remove = useCallback(
    (id: string) => {
      const success = deleteAssistant(id);
      if (success) refresh();
      return success;
    },
    [refresh]
  );

  return {
    assistants,
    refresh,
    getById,
    getPublic,
    create,
    update,
    remove,
  };
}
