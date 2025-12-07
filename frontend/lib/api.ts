/**
 * API client for connecting to the FastAPI backend
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface Persona {
  key: string;
  name: string;
  description: string;
  is_current: boolean;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  conversation_id?: string;
  created_at: string;
}

export interface ConversationHistory {
  messages: ChatMessage[];
  total: number;
  agent_id?: string;
  group_id?: string;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      const isJson = contentType && contentType.includes('application/json');

      if (!response.ok) {
        let errorMessage = `HTTP error! status: ${response.status}`;
        
        if (isJson) {
          try {
            const error = await response.json();
            errorMessage = error.detail || error.message || errorMessage;
          } catch {
            // If JSON parsing fails, use status text
            errorMessage = response.statusText || errorMessage;
          }
        } else {
          // If not JSON, it's probably an HTML error page
          const text = await response.text();
          errorMessage = `Server error (${response.status}): ${text.slice(0, 100)}`;
        }
        
        throw new Error(errorMessage);
      }

      // Parse JSON response
      if (isJson) {
        try {
          return await response.json();
        } catch (parseError) {
          // Response claims to be JSON but isn't (might be HTML error page)
          const text = await response.text();
          throw new Error(`Failed to parse JSON response: ${text.slice(0, 200)}`);
        }
      } else {
        // If not JSON, return text as string (shouldn't happen for our API)
        const text = await response.text();
        throw new Error(`Expected JSON but got: ${text.slice(0, 100)}`);
      }
    } catch (error: any) {
      // Network errors or other fetch errors
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error(`Cannot connect to backend at ${this.baseUrl}. Is the server running?`);
      }
      throw error;
    }
  }

  // Health check
  async health() {
    return this.request<{ status: string; model?: string; current_persona?: string }>('/health');
  }

  // Personas
  async getPersonas(): Promise<Persona[]> {
    return this.request<Persona[]>('/api/personas');
  }

  async getCurrentPersona(): Promise<Persona> {
    return this.request<Persona>('/api/personas/current');
  }

  async setPersona(personaKey: string): Promise<{ success: boolean; persona: Persona; message: string }> {
    return this.request('/api/personas/set', {
      method: 'POST',
      body: JSON.stringify({ persona_key: personaKey }),
    });
  }

  async getConversationPersona(conversationId: string): Promise<Persona> {
    return this.request<Persona>(`/api/conversations/${conversationId}/persona`, {
      method: 'GET',
    });
  }

  async setConversationPersona(conversationId: string, personaKey: string): Promise<{ success: boolean; persona: Persona; message: string }> {
    return this.request(`/api/conversations/${conversationId}/persona`, {
      method: 'POST',
      body: JSON.stringify({ persona_key: personaKey }),
    });
  }

  // Chat
  async sendMessage(message: string, conversationId?: string): Promise<ChatMessage> {
    return this.request<ChatMessage>('/api/chat', {
      method: 'POST',
      body: JSON.stringify({
        message,
        conversation_id: conversationId,
      }),
    });
  }

  // Conversation History
  async getConversationHistory(
    conversationId: string, // Made required - conversation_id is required by backend
    limit?: number,
    order: 'asc' | 'desc' = 'asc' // Request oldest first for chat UI
  ): Promise<ConversationHistory> {
    if (!conversationId) {
      throw new Error('conversationId is required');
    }
    
    const params = new URLSearchParams();
    params.append('conversation_id', conversationId);
    if (limit) params.append('limit', limit.toString());
    params.append('order', order);

    return this.request<ConversationHistory>(`/api/conversation/history?${params.toString()}`);
  }

  // Agent Info
  async getAgentId(): Promise<{ agent_id: string; current_persona: string }> {
    return this.request('/api/agent/id');
  }
}

export const apiClient = new ApiClient();

