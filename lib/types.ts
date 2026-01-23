export interface MessageContent {
  type: 'text' | 'image_url';
  text?: string;
  image_url?: { url: string };
}

export interface Message {
  role: 'user' | 'assistant';
  content: string | MessageContent[];
  timestamp: Date;
}
