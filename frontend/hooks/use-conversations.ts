'use client';

import { useState, useCallback, useEffect } from 'react';
import { Conversation, Message } from '@/types';
import { apiClient } from '@/lib/api';

// Map persona keys to assistant IDs (temporary until we sync personas with assistants)
const PERSONA_TO_ASSISTANT: Record<string, string> = {
  personal_assistant: '1',
  dating_coach: '2',
  friend: '3',
};

// Convert API message to app message format
function apiMessageToMessage(apiMsg: any, conversationId: string): Message {
  return {
    id: apiMsg.id || `msg-${Date.now()}-${Math.random()}`,
    conversationId,
    role: apiMsg.role as 'user' | 'assistant',
    content: apiMsg.content || '',
    createdAt: apiMsg.created_at ? new Date(apiMsg.created_at) : new Date(),
  };
}

// Convert API conversation history to app conversation format
function historyToConversation(
  conversationId: string,
  assistantId: string,
  history: any
): Conversation {
  // API returns messages in desc order (newest first), reverse to show oldest first
  // Filter out system messages and memory metadata as a safety measure
  const messages = history.messages
    .filter((msg: any) => {
      // Filter out system messages
      if (msg.role === 'system' || msg.message_type === 'system_message') {
        return false;
      }
      // Filter out messages with memory metadata
      if (msg.content && (msg.content.includes('<memory_metadata>') || msg.content.toLowerCase().includes('memory_metadata'))) {
        return false;
      }
      return true;
    })
    .map((msg: any) => apiMessageToMessage(msg, conversationId))
    .reverse();

  return {
    id: conversationId,
    assistantId,
    title: messages.length > 0 ? messages[0].content.slice(0, 50) : 'New Conversation',
    messages,
    createdAt: messages.length > 0 ? messages[0].createdAt : new Date(),
    updatedAt: messages.length > 0 ? messages[messages.length - 1].createdAt : new Date(),
    userId: 'user-1', // TODO: Get from auth
  };
}

export function useConversations() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const refresh = useCallback(async () => {
    // Note: Backend doesn't have a list conversations endpoint yet
    // For now, we'll maintain local state
    // TODO: Add GET /api/conversations endpoint to backend
  }, []);

  const getById = useCallback(async (id: string) => {
    try {
      const history = await apiClient.getConversationHistory(id);
      // We need assistantId - for now use current persona
      const currentPersona = await apiClient.getCurrentPersona();
      return historyToConversation(id, currentPersona.key, history);
    } catch (error) {
      console.error('Error fetching conversation:', error);
      return null;
    }
  }, []);

  const getByAssistant = useCallback(async (assistantId: string) => {
    // TODO: Implement when backend supports filtering by assistant/persona
    return [];
  }, []);

  const create = useCallback(
    async (assistantId: string) => {
      // Generate a unique conversation ID
      const conversationId = `conv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Set persona based on assistant (map assistant to persona)
      // For now, we'll set the persona based on assistant ID
      const assistantToPersona: Record<string, string> = {
        '1': 'personal_assistant',
        '2': 'dating_coach',
        '3': 'friend',
      };
      const personaKey = assistantToPersona[assistantId] || 'personal_assistant';
      
      try {
        // Set the persona for this conversation
        await apiClient.setPersona(personaKey);
      } catch (err) {
        console.warn('Could not set persona, continuing anyway:', err);
      }
      
      const newConversation: Conversation = {
        id: conversationId,
        assistantId,
        title: 'New Conversation',
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        userId: 'user-1',
      };
      setConversations((prev) => [...prev, newConversation]);
      return newConversation;
    },
    []
  );

  const sendMessage = useCallback(
    async (conversationId: string, content: string, role: 'user' | 'assistant') => {
      if (role === 'user') {
        // Send to API
        try {
          const response = await apiClient.sendMessage(content, conversationId);
          const userMsg = apiMessageToMessage(
            { ...response, role: 'user', content },
            conversationId
          );
          const assistantMsg = apiMessageToMessage(response, conversationId);
          return assistantMsg;
        } catch (error) {
          console.error('Error sending message:', error);
          throw error;
        }
      } else {
        // Assistant message (already received from API)
        const message: Message = {
          id: `msg-${Date.now()}`,
          conversationId,
          role: 'assistant',
          content,
          createdAt: new Date(),
        };
        return message;
      }
    },
    []
  );

  const remove = useCallback(
    async (id: string) => {
      setConversations((prev) => prev.filter((c) => c.id !== id));
      return true;
    },
    []
  );

  return {
    conversations,
    refresh,
    getById,
    getByAssistant,
    create,
    sendMessage,
    remove,
    isLoading,
  };
}

export function useConversation(conversationId: string | null) {
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (showLoading: boolean = true) => {
    if (!conversationId) {
      setConversation(null);
      setIsLoading(false);
      return;
    }

    if (showLoading) {
      setIsLoading(true);
    }
    setError(null);
    try {
      const history = await apiClient.getConversationHistory(conversationId);
      // Get current persona for assistantId (with fallback)
      let personaKey = 'personal_assistant'; // Default
      try {
        const currentPersona = await apiClient.getCurrentPersona();
        personaKey = currentPersona.key;
      } catch (err) {
        console.warn('Could not get current persona, using default:', err);
      }
      const conv = historyToConversation(conversationId, personaKey, history);
      setConversation(conv);
    } catch (err: any) {
      setError(err.message || 'Failed to load conversation');
      console.error('Error refreshing conversation:', err);
      // Don't set conversation to null on error - keep existing state
    } finally {
      // Always clear loading state, regardless of showLoading flag
      setIsLoading(false);
    }
  }, [conversationId]);

  useEffect(() => {
    // Initial load - show loading
    refresh(true).catch((err) => {
      console.error('Initial conversation load failed:', err);
      // Ensure loading is cleared even if refresh fails
      setIsLoading(false);
    });
  }, [refresh]);

  const sendMessage = useCallback(
    async (content: string, role: 'user' | 'assistant') => {
      if (!conversationId) return undefined;

      if (role === 'user') {
        // Don't set isLoading here - that's for loading the conversation, not sending messages
        setError(null); // Clear any previous errors
        try {
          // Send user message and get assistant response
          const response = await apiClient.sendMessage(content, conversationId);
          
          // Optimistically update conversation with new messages
          setConversation((prev) => {
            if (!prev) {
              // Create conversation if it doesn't exist
              const currentPersona = { key: 'personal_assistant' }; // Default
              return {
                id: conversationId,
                assistantId: PERSONA_TO_ASSISTANT[currentPersona.key] || '1',
                title: content.slice(0, 50),
                messages: [
                  apiMessageToMessage({ ...response, role: 'user', content }, conversationId),
                  apiMessageToMessage(response, conversationId),
                ],
                createdAt: new Date(),
                updatedAt: new Date(),
                userId: 'user-1',
              };
            }
            
            // Add new messages to existing conversation
            const userMsg = apiMessageToMessage({ ...response, role: 'user', content }, conversationId);
            const assistantMsg = apiMessageToMessage(response, conversationId);
            
            return {
              ...prev,
              messages: [...prev.messages, userMsg, assistantMsg],
              updatedAt: new Date(),
            };
          });
          
          // Refresh conversation from API in background (without showing loading)
          // This ensures we have the latest state but doesn't block the UI
          refresh(false).catch((err) => {
            console.warn('Background refresh failed:', err);
            // If refresh fails, we still have the optimistic update
          });
          
          return apiMessageToMessage(response, conversationId);
        } catch (err: any) {
          // Set error but don't block the UI - just log it
          const errorMessage = err.message || 'Failed to send message';
          console.error('Error sending message:', errorMessage);
          setError(errorMessage);
          // Don't throw - let the UI continue showing the conversation
          return undefined;
        }
      } else {
        // Assistant message (shouldn't be called directly)
        const message: Message = {
          id: `msg-${Date.now()}`,
          conversationId,
          role: 'assistant',
          content,
          createdAt: new Date(),
        };
        return message;
      }
    },
    [conversationId, refresh]
  );

  return {
    conversation,
    messages: conversation?.messages || [],
    refresh,
    sendMessage,
    isLoading,
    error,
  };
}
