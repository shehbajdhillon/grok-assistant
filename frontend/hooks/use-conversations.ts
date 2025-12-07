'use client';

import { useState, useCallback, useEffect } from 'react';
import { Conversation, Message } from '@/types';
import * as api from '@/lib/api-client';

export function useConversations() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getConversations();
      setConversations(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load conversations');
      console.error('Failed to load conversations:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const getById = useCallback(async (id: string) => {
    try {
      return await api.getConversation(id);
    } catch (err) {
      console.error('Failed to get conversation:', err);
      throw err;
    }
  }, []);

  const getByAssistant = useCallback((assistantId: string) => {
    return conversations.filter(c => c.assistantId === assistantId);
  }, [conversations]);

  const create = useCallback(
    async (assistantId: string) => {
      try {
        const newConversation = await api.createConversation(assistantId);
        await refresh();
        return newConversation;
      } catch (err) {
        console.error('Failed to create conversation:', err);
        throw err;
      }
    },
    [refresh]
  );

  const sendMessageToConversation = useCallback(
    async (conversationId: string, content: string) => {
      try {
        const message = await api.sendMessage(conversationId, content);
        await refresh();
        return message;
      } catch (err) {
        console.error('Failed to send message:', err);
        throw err;
      }
    },
    [refresh]
  );

  const remove = useCallback(
    async (id: string) => {
      try {
        await api.deleteConversation(id);
        await refresh();
        return true;
      } catch (err) {
        console.error('Failed to delete conversation:', err);
        return false;
      }
    },
    [refresh]
  );

  return {
    conversations,
    loading,
    error,
    refresh,
    getById,
    getByAssistant,
    create,
    sendMessage: sendMessageToConversation,
    remove,
  };
}

export function useConversation(conversationId: string | null) {
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!conversationId) {
      setConversation(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await api.getConversation(conversationId);
      setConversation(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load conversation');
      console.error('Failed to load conversation:', err);
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!conversationId) return undefined;

      try {
        const message = await api.sendMessage(conversationId, content);
        await refresh();
        return message;
      } catch (err) {
        console.error('Failed to send message:', err);
        throw err;
      }
    },
    [conversationId, refresh]
  );

  return {
    conversation,
    messages: conversation?.messages || [],
    loading,
    error,
    refresh,
    sendMessage,
  };
}
