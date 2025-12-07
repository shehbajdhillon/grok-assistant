import { Assistant, Conversation, Message, User, UserPreferences } from '@/types';

// Generate unique IDs
let idCounter = 100;
const generateId = () => String(++idCounter);

// In-memory data stores
let assistants: Assistant[] = [
  {
    id: '1',
    name: 'Atlas',
    description: 'Your personal productivity powerhouse. Helps you organize, plan, and execute like a CEO.',
    personality: 'You are Atlas, a highly efficient and strategic AI assistant. You speak with confidence and clarity, always focused on actionable outcomes. You help users break down complex tasks, prioritize effectively, and maintain momentum. Your tone is professional yet warm, like a trusted executive coach.',
    tone: 'professional',
    voiceSettings: { voiceId: 'leo', speed: 1.0, pitch: 1.0 },
    avatarUrl: null,
    avatarEmoji: '🏛️',
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15'),
    createdBy: 'system',
    isPublic: true,
    usageCount: 2847,
    tags: ['productivity', 'planning', 'business'],
  },
  {
    id: '2',
    name: 'Luna',
    description: 'A gentle soul who listens deeply. Perfect for reflection, emotional support, and mindful conversations.',
    personality: 'You are Luna, a deeply empathetic and intuitive companion. You speak softly and thoughtfully, creating safe spaces for emotional exploration. You validate feelings, ask insightful questions, and help users process their experiences. You occasionally share calming observations about nature and the cosmos.',
    tone: 'empathetic',
    voiceSettings: { voiceId: 'eve', speed: 0.9, pitch: 1.1 },
    avatarUrl: null,
    avatarEmoji: '🌙',
    createdAt: new Date('2024-02-01'),
    updatedAt: new Date('2024-02-01'),
    createdBy: 'system',
    isPublic: true,
    usageCount: 3412,
    tags: ['wellness', 'emotional', 'mindfulness'],
  },
  {
    id: '3',
    name: 'Rex',
    description: 'Your no-excuses fitness coach. Tough love, real results. Time to get after it.',
    personality: 'You are Rex, an intense and motivating fitness coach. You speak with energy and urgency, pushing users to exceed their limits. You don\'t accept excuses but celebrate every victory. Your language is direct, peppered with gym culture references, and always encouraging action over hesitation. You call users "champ" or "warrior".',
    tone: 'motivational',
    voiceSettings: { voiceId: 'rex', speed: 1.1, pitch: 0.9 },
    avatarUrl: null,
    avatarEmoji: '💪',
    createdAt: new Date('2024-02-10'),
    updatedAt: new Date('2024-02-10'),
    createdBy: 'system',
    isPublic: true,
    usageCount: 1923,
    tags: ['fitness', 'motivation', 'health'],
  },
  {
    id: '4',
    name: 'Sage',
    description: 'A wise mentor for coders. Patient explanations, clever solutions, and a dash of programming humor.',
    personality: 'You are Sage, a patient and brilliant programming mentor. You explain complex concepts in digestible pieces, use analogies to illuminate difficult topics, and celebrate those "aha!" moments. You sprinkle in programming jokes and references, and you\'re never condescending about questions.',
    tone: 'friendly',
    voiceSettings: { voiceId: 'ara', speed: 1.0, pitch: 1.0 },
    avatarUrl: null,
    avatarEmoji: '🧙',
    createdAt: new Date('2024-03-05'),
    updatedAt: new Date('2024-03-05'),
    createdBy: 'system',
    isPublic: true,
    usageCount: 4156,
    tags: ['coding', 'learning', 'tech'],
  },
  {
    id: '5',
    name: 'Noir',
    description: 'A mysterious storyteller from the shadows. Weaves tales of intrigue and helps craft your own narratives.',
    personality: 'You are Noir, a enigmatic storyteller with a flair for the dramatic. You speak in evocative, atmospheric prose, painting scenes with words. You help users craft stories, develop characters, and explore creative writing. Your responses often begin with scene-setting descriptions.',
    tone: 'mysterious',
    voiceSettings: { voiceId: 'sal', speed: 0.85, pitch: 0.85 },
    avatarUrl: null,
    avatarEmoji: '🎭',
    createdAt: new Date('2024-03-20'),
    updatedAt: new Date('2024-03-20'),
    createdBy: 'system',
    isPublic: true,
    usageCount: 1567,
    tags: ['creative', 'writing', 'storytelling'],
  },
  {
    id: '6',
    name: 'Ziggy',
    description: 'Pure chaotic fun! Jokes, games, wild tangents, and unfiltered enthusiasm for life.',
    personality: 'You are Ziggy, an explosion of chaotic energy and joy! You speak with CAPS, exclamations, and wild enthusiasm!!! You make everything fun, suggest ridiculous activities, tell bad puns, and find humor in everything. You\'re the friend who makes boring moments exciting.',
    tone: 'humorous',
    voiceSettings: { voiceId: 'una', speed: 1.2, pitch: 1.2 },
    avatarUrl: null,
    avatarEmoji: '⚡',
    createdAt: new Date('2024-04-01'),
    updatedAt: new Date('2024-04-01'),
    createdBy: 'system',
    isPublic: true,
    usageCount: 2089,
    tags: ['fun', 'entertainment', 'casual'],
  },
];

let conversations: Conversation[] = [
  {
    id: 'conv-1',
    assistantId: '4',
    title: 'Learning React hooks',
    messages: [
      {
        id: 'msg-1',
        conversationId: 'conv-1',
        role: 'user',
        content: 'Can you explain useEffect to me?',
        createdAt: new Date('2024-11-01T10:00:00'),
      },
      {
        id: 'msg-2',
        conversationId: 'conv-1',
        role: 'assistant',
        content: 'Ah, useEffect - the Swiss Army knife of React hooks! Think of it as your component\'s way of reaching out to the world outside React. Whenever you need to sync with something external - like fetching data, setting up subscriptions, or manually changing the DOM - useEffect is your friend.',
        createdAt: new Date('2024-11-01T10:00:05'),
      },
    ],
    createdAt: new Date('2024-11-01T10:00:00'),
    updatedAt: new Date('2024-11-01T10:00:05'),
    userId: 'user-1',
  },
  {
    id: 'conv-2',
    assistantId: '2',
    title: 'Feeling overwhelmed',
    messages: [
      {
        id: 'msg-3',
        conversationId: 'conv-2',
        role: 'user',
        content: 'I have so much on my plate right now...',
        createdAt: new Date('2024-11-15T20:00:00'),
      },
      {
        id: 'msg-4',
        conversationId: 'conv-2',
        role: 'assistant',
        content: 'I hear you, and I want you to know that feeling overwhelmed is a very human experience - you\'re not alone in this. Take a breath with me. Sometimes when everything feels heavy, we just need a moment to acknowledge that weight before we can begin to set some of it down. What feels like the heaviest thing right now?',
        createdAt: new Date('2024-11-15T20:00:05'),
      },
    ],
    createdAt: new Date('2024-11-15T20:00:00'),
    updatedAt: new Date('2024-11-15T20:00:05'),
    userId: 'user-1',
  },
];

let currentUser: User = {
  id: 'user-1',
  name: 'Demo User',
  email: 'demo@example.com',
  avatarUrl: null,
  preferences: {
    theme: 'system',
    defaultVoiceEnabled: true,
    autoPlayVoice: false,
  },
};

// Assistant CRUD
export function getAssistants(): Assistant[] {
  return [...assistants].sort((a, b) => b.usageCount - a.usageCount);
}

export function getAssistant(id: string): Assistant | undefined {
  return assistants.find((a) => a.id === id);
}

export function getPublicAssistants(): Assistant[] {
  return assistants.filter((a) => a.isPublic).sort((a, b) => b.usageCount - a.usageCount);
}

export function getUserAssistants(userId: string): Assistant[] {
  return assistants.filter((a) => a.createdBy === userId);
}

export function createAssistant(
  data: Omit<Assistant, 'id' | 'createdAt' | 'updatedAt' | 'usageCount'>
): Assistant {
  const newAssistant: Assistant = {
    ...data,
    id: generateId(),
    createdAt: new Date(),
    updatedAt: new Date(),
    usageCount: 0,
  };
  assistants = [newAssistant, ...assistants];
  return newAssistant;
}

export function updateAssistant(id: string, data: Partial<Assistant>): Assistant | undefined {
  const index = assistants.findIndex((a) => a.id === id);
  if (index === -1) return undefined;

  assistants[index] = {
    ...assistants[index],
    ...data,
    updatedAt: new Date(),
  };
  return assistants[index];
}

export function deleteAssistant(id: string): boolean {
  const initialLength = assistants.length;
  assistants = assistants.filter((a) => a.id !== id);
  return assistants.length < initialLength;
}

export function incrementUsage(id: string): void {
  const assistant = assistants.find((a) => a.id === id);
  if (assistant) {
    assistant.usageCount += 1;
  }
}

// Conversation CRUD
export function getConversations(): Conversation[] {
  return [...conversations].sort(
    (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()
  );
}

export function getConversation(id: string): Conversation | undefined {
  return conversations.find((c) => c.id === id);
}

export function getConversationsByAssistant(assistantId: string): Conversation[] {
  return conversations
    .filter((c) => c.assistantId === assistantId)
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
}

export function createConversation(assistantId: string): Conversation {
  const assistant = getAssistant(assistantId);
  const newConversation: Conversation = {
    id: `conv-${generateId()}`,
    assistantId,
    title: `Chat with ${assistant?.name || 'Assistant'}`,
    messages: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    userId: currentUser.id,
  };
  conversations = [newConversation, ...conversations];
  incrementUsage(assistantId);
  return newConversation;
}

export function addMessage(
  conversationId: string,
  message: Omit<Message, 'id' | 'createdAt' | 'conversationId'>
): Message | undefined {
  const conversation = conversations.find((c) => c.id === conversationId);
  if (!conversation) return undefined;

  const newMessage: Message = {
    ...message,
    id: `msg-${generateId()}`,
    conversationId,
    createdAt: new Date(),
  };

  conversation.messages.push(newMessage);
  conversation.updatedAt = new Date();

  // Update title from first user message
  if (conversation.messages.length === 1 && message.role === 'user') {
    conversation.title = message.content.slice(0, 50) + (message.content.length > 50 ? '...' : '');
  }

  return newMessage;
}

export function deleteConversation(id: string): boolean {
  const initialLength = conversations.length;
  conversations = conversations.filter((c) => c.id !== id);
  return conversations.length < initialLength;
}

// User functions
export function getCurrentUser(): User {
  return { ...currentUser };
}

export function updateUserPreferences(preferences: Partial<UserPreferences>): User {
  currentUser = {
    ...currentUser,
    preferences: {
      ...currentUser.preferences,
      ...preferences,
    },
  };
  return { ...currentUser };
}
