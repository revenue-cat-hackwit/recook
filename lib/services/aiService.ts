import { supabase, supabaseUrl, supabaseAnonKey } from '@/lib/supabase';
import { Message } from '@/lib/types';

export const AIService = {
  async sendMessage(messages: Message[], token = supabaseAnonKey) {
    // Filter messages to only send role and content (clean payload)
    const apiMessages = messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));

    try {
      const response = await fetch(`${supabaseUrl}/functions/v1/ai-assistant`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          messages: apiMessages,
          max_tokens: 1000,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`AI Service Error: ${errorText}`);
      }

      const data = await response.json();

      // Return the content string directly for convenience
      return data?.data?.message || data?.message || 'Maaf, terjadi kesalahan pada respon AI.';
    } catch (error) {
      console.error('AIService Error:', error);
      throw error;
    }
  },
};
