'use client';

import { useState, useCallback } from 'react';
import * as api from '@/lib/api-client';
import type { GeneratedAssistant } from '@/lib/api-client';

export function useGenerateAssistant() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedData, setGeneratedData] = useState<GeneratedAssistant | null>(null);

  const generate = useCallback(async (prompt: string): Promise<GeneratedAssistant> => {
    setIsGenerating(true);
    setError(null);
    try {
      const data = await api.generateAssistant(prompt);
      setGeneratedData(data);
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate assistant';
      setError(message);
      throw err;
    } finally {
      setIsGenerating(false);
    }
  }, []);

  const reset = useCallback(() => {
    setGeneratedData(null);
    setError(null);
  }, []);

  return {
    generate,
    reset,
    isGenerating,
    error,
    generatedData,
  };
}
