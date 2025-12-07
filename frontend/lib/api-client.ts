'use client';

import type { Assistant, Conversation, Message, User, UserPreferences } from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://grok-assistant-production.up.railway.app';

// Create a singleton to store the auth hook
let getTokenFn: (() => Promise<string | null>) | null = null;

export function setAuthProvider(getToken: () => Promise<string | null>) {
  getTokenFn = getToken;
}

async function fetchAPI(endpoint: string, options: RequestInit = {}) {
  let token: string | null = null;

  if (getTokenFn) {
    token = await getTokenFn();
    console.log('Token retrieved:', token ? `${token.substring(0, 20)}...` : 'null');
  } else {
    console.warn('getTokenFn not initialized');
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  } else {
    console.warn('No token available for API request');
  }

  // Merge with any existing headers
  if (options.headers) {
    Object.assign(headers, options.headers);
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(error.detail || `API error: ${response.status}`);
  }

  return response.json();
}

// Assistant API calls
export async function getAssistants(): Promise<Assistant[]> {
  const response = await fetchAPI('/api/assistants/me');
  return response.items.map((a: any) => ({
    ...a,
    createdAt: new Date(a.createdAt),
    updatedAt: new Date(a.updatedAt),
  }));
}

export async function getPublicAssistants(): Promise<Assistant[]> {
  const response = await fetchAPI('/api/assistants');
  return response.items.map((a: any) => ({
    ...a,
    createdAt: new Date(a.createdAt),
    updatedAt: new Date(a.updatedAt),
  }));
}

export async function getAssistant(id: string): Promise<Assistant> {
  const data = await fetchAPI(`/api/assistants/${id}`);
  return {
    ...data,
    createdAt: new Date(data.createdAt),
    updatedAt: new Date(data.updatedAt),
  };
}

export async function createAssistant(
  assistant: Omit<Assistant, 'id' | 'createdAt' | 'updatedAt' | 'usageCount'>
): Promise<Assistant> {
  const data = await fetchAPI('/api/assistants', {
    method: 'POST',
    body: JSON.stringify(assistant),
  });

  return {
    ...data,
    createdAt: new Date(data.createdAt),
    updatedAt: new Date(data.updatedAt),
  };
}

export async function updateAssistant(
  id: string,
  updates: Partial<Assistant>
): Promise<Assistant> {
  const data = await fetchAPI(`/api/assistants/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });

  return {
    ...data,
    createdAt: new Date(data.createdAt),
    updatedAt: new Date(data.updatedAt),
  };
}

export async function deleteAssistant(id: string): Promise<void> {
  await fetchAPI(`/api/assistants/${id}`, {
    method: 'DELETE',
  });
}

// Conversation API calls
export async function getConversations(): Promise<Conversation[]> {
  const response = await fetchAPI('/api/conversations');
  return response.items.map((c: any) => ({
    id: c.id,
    assistantId: c.assistantId,
    title: c.title,
    createdAt: new Date(c.createdAt),
    updatedAt: new Date(c.updatedAt),
    userId: '', // Not included in list response
    messages: [],
    assistant: c.assistant ? {
      id: c.assistant.id,
      name: c.assistant.name,
      avatarEmoji: c.assistant.avatarEmoji,
      tone: c.assistant.tone,
      voiceSettings: c.assistant.voiceSettings,
    } : undefined,
  }));
}

export async function getConversation(id: string): Promise<Conversation> {
  const data = await fetchAPI(`/api/conversations/${id}`);
  return {
    id: data.id,
    assistantId: data.assistantId,
    title: data.title,
    createdAt: new Date(data.createdAt),
    updatedAt: new Date(data.updatedAt),
    userId: '', // Not used
    messages: data.messages?.map((m: any) => ({
      id: m.id,
      conversationId: m.conversationId,
      role: m.role,
      content: m.content,
      audioUrl: m.audioUrl,
      createdAt: new Date(m.createdAt),
    })) || [],
    assistant: data.assistant ? {
      id: data.assistant.id,
      name: data.assistant.name,
      avatarEmoji: data.assistant.avatarEmoji,
      tone: data.assistant.tone,
      voiceSettings: data.assistant.voiceSettings,
    } : undefined,
  };
}

export async function createConversation(assistantId: string): Promise<Conversation> {
  const data = await fetchAPI('/api/conversations', {
    method: 'POST',
    body: JSON.stringify({
      assistant_id: assistantId,
    }),
  });

  return {
    ...data,
    assistantId: data.assistant_id,
    userId: data.user_id,
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at),
    messages: data.messages?.map((m: any) => ({
      id: m.id,
      conversationId: m.conversation_id,
      role: m.role,
      content: m.content,
      audioUrl: m.audio_url,
      createdAt: new Date(m.created_at),
    })) || [],
  };
}

export async function sendMessage(
  conversationId: string,
  content: string
): Promise<Message> {
  const data = await fetchAPI(`/api/conversations/${conversationId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ content }),
  });

  return {
    id: data.id,
    conversationId: data.conversation_id,
    role: data.role,
    content: data.content,
    audioUrl: data.audio_url,
    createdAt: new Date(data.created_at),
  };
}

export async function deleteConversation(id: string): Promise<void> {
  await fetchAPI(`/api/conversations/${id}`, {
    method: 'DELETE',
  });
}

// User API calls
export async function getCurrentUser(): Promise<User> {
  const data = await fetchAPI('/api/users/me');
  return {
    id: data.id,
    name: data.name,
    email: data.email,
    avatarUrl: data.avatar_url,
    preferences: data.preferences,
  };
}

export async function updateUserPreferences(
  preferences: Partial<UserPreferences>
): Promise<User> {
  const data = await fetchAPI('/api/users/me/preferences', {
    method: 'PUT',
    body: JSON.stringify(preferences),
  });

  return {
    id: data.id,
    name: data.name,
    email: data.email,
    avatarUrl: data.avatar_url,
    preferences: data.preferences,
  };
}
