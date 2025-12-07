'use client';

import { useState, useCallback } from 'react';
import { Conversation, Message } from '@/types';
import {
  getConversations,
  getConversation,
  getConversationsByAssistant,
  createConversation,
  addMessage,
  deleteConversation,
} from '@/lib/mock-data';

export function useConversations() {
  const [conversations, setConversations] = useState<Conversation[]>(() =>
    getConversations()
  );

  const refresh = useCallback(() => {
    setConversations(getConversations());
  }, []);

  const getById = useCallback((id: string) => {
    return getConversation(id);
  }, []);

  const getByAssistant = useCallback((assistantId: string) => {
    return getConversationsByAssistant(assistantId);
  }, []);

  const create = useCallback(
    (assistantId: string) => {
      const newConversation = createConversation(assistantId);
      refresh();
      return newConversation;
    },
    [refresh]
  );

  const sendMessage = useCallback(
    (conversationId: string, content: string, role: 'user' | 'assistant') => {
      const message = addMessage(conversationId, { content, role });
      refresh();
      return message;
    },
    [refresh]
  );

  const remove = useCallback(
    (id: string) => {
      const success = deleteConversation(id);
      if (success) refresh();
      return success;
    },
    [refresh]
  );

  return {
    conversations,
    refresh,
    getById,
    getByAssistant,
    create,
    sendMessage,
    remove,
  };
}

export function useConversation(conversationId: string | null) {
  const [conversation, setConversation] = useState<Conversation | null>(() =>
    conversationId ? getConversation(conversationId) || null : null
  );

  const refresh = useCallback(() => {
    if (conversationId) {
      setConversation(getConversation(conversationId) || null);
    }
  }, [conversationId]);

  const sendMessage = useCallback(
    (content: string, role: 'user' | 'assistant') => {
      if (!conversationId) return undefined;
      const message = addMessage(conversationId, { content, role });
      refresh();
      return message;
    },
    [conversationId, refresh]
  );

  return {
    conversation,
    messages: conversation?.messages || [],
    refresh,
    sendMessage,
  };
}
