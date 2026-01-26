export interface MessageContent {
  type: 'text' | 'image_url' | 'video_url';
  text?: string;
  image_url?: { url: string };
  video_url?: { url: string };
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  text?: string;
  content?: string | MessageContent[];
  timestamp?: number;
}

export interface VoiceConfig {
  voiceId?: string;
  speed?: number;
  emotion?: string;
  language?: string;
  targetLanguage?: string;
}

export interface VoiceResponse {
  transcript: string;
  reply: string;
  audio: string | null;
  silent?: boolean;
  is_stt_only?: boolean;
}

export interface RecipeStep {
  step: string;
  instruction: string;
}

export interface Recipe {
  id?: string;
  title: string;
  description: string;
  ingredients: string[];
  steps: RecipeStep[];
  time_minutes: string;
  difficulty: string;
  servings: string;
  calories_per_serving: string;
  tips?: string;
  sourceUrl?: string;
  createdAt?: string;
}
