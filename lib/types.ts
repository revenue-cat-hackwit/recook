export interface MessageContent {
  type: 'text' | 'image_url' | 'video_url';
  text?: string;
  image_url?: { url: string };
  video_url?: { url: string };
}

export interface Message {
  role: 'user' | 'assistant';
  content: string | MessageContent[];
  timestamp: Date;
}

export interface Recipe {
  id?: string; // Local ID for saved items
  title: string;
  description: string;
  time_minutes: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  servings: number;
  calories_per_serving: number;
  ingredients: string[];
  tools: string[];
  steps: { step: number; instruction: string }[];
  tips: string;
  sourceUrl?: string; // To link back to video
  createdAt?: string;
}
