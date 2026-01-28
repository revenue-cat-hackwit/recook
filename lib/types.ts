import { PurchasesOffering, PurchasesPackage, CustomerInfo } from 'react-native-purchases';

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
  imageUrl?: string;
  createdAt?: string;
}

export interface SubscriptionState {
  isPro: boolean;
  offerings: PurchasesOffering | null;
  currentCustomerInfo: CustomerInfo | null;
  loading: boolean;

  generatedToday: number;
  lastGeneratedDate: string | null;

  initialize: () => Promise<void>;
  purchasePackage: (pack: PurchasesPackage) => Promise<boolean>;
  restorePurchases: () => Promise<boolean>;
  checkCanGenerate: () => boolean;
  incrementUsage: () => void;
}

export interface FeedItem {
  id: string;
  title: string;
  image: string;
  user: {
    name: string;
    avatar: string;
  };
  likes: number;
  height: number;
}

export interface ShoppingItem {
  id: string;
  name: string;
  isChecked: boolean;
  fromRecipe?: string;
}

export interface UserPreferences {
  allergies: string[];
  equipment: string[];
  dietGoal: string;
}
