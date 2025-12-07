export type VoiceId = 'ara' | 'rex' | 'eve' | 'leo' | 'una' | 'sal';
export type VoiceType = 'preset' | 'custom';

export type TonePreset =
  // Positive tones
  | 'professional'
  | 'friendly'
  | 'humorous'
  | 'empathetic'
  | 'motivational'
  | 'cheerful'
  | 'playful'
  | 'enthusiastic'
  | 'warm'
  | 'supportive'
  // Neutral tones
  | 'casual'
  | 'formal'
  | 'mysterious'
  | 'calm'
  | 'analytical'
  | 'stoic'
  | 'philosophical'
  // Negative tones
  | 'sarcastic'
  | 'blunt'
  | 'cynical'
  | 'melancholic'
  | 'stern'
  | 'dramatic'
  | 'pessimistic';

export interface VoiceSettings {
  voiceType: VoiceType;
  voiceId: VoiceId;
  customVoiceUrl: string | null;
  customVoiceFileName: string | null;
  speed: number; // 0.5 - 2.0
  pitch: number; // 0.5 - 2.0
}

export interface Assistant {
  id: string;
  name: string;
  description: string;
  personality: string;
  tone: TonePreset;
  voiceSettings: VoiceSettings;
  avatarUrl: string | null;
  avatarEmoji: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  isPublic: boolean;
  usageCount: number;
  tags: string[];
}

export interface Message {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant';
  content: string;
  audioUrl?: string;
  createdAt: Date;
}

export interface ConversationAssistantInfo {
  id: string;
  name: string;
  avatarEmoji: string;
  tone: TonePreset;
  voiceSettings?: VoiceSettings;
}

export interface Conversation {
  id: string;
  assistantId: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
  userId: string;
  assistant?: ConversationAssistantInfo;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  preferences: UserPreferences;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  defaultVoiceEnabled: boolean;
  autoPlayVoice: boolean;
}
