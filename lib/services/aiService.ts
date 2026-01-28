import { supabase, supabaseUrl, supabaseAnonKey } from '@/lib/supabase';
import { Message } from '@/lib/types';

export const AIService = {
  /**
   * Send message to AI Edge Function
   */
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

  /**
   * Save a single message to Supabase DB (Chat History)
   */
  async saveMessage(role: 'user' | 'assistant', content: string | any[]): Promise<void> {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return; // Silent return if not logged in

      await supabase.from('chat_messages').insert({
        user_id: userData.user.id,
        role: role,
        content: content, // Supabase handles JSONB conv if passed as object/array
      });
    } catch (e) {
      console.log('Failed to save chat history:', e);
    }
  },

  /**
   * Fetch Chat History from Supabase
   */
  async getHistory(): Promise<Message[]> {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return [];

      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .order('created_at', { ascending: true }) // Oldest first for chat UI? Or newest first?
        // Usually DB returns rows. UI often wants newest at bottom.
        // Let's fetch strict cronological.
        .limit(50); // increased limit

      if (error) throw error;

      return data.map((row: any) => ({
        id: row.id,
        role: row.role,
        content: row.content, // JSONB comes back as object/string
        timestamp: new Date(row.created_at).getTime(),
      }));
    } catch (e) {
      console.error('Fetch History Error:', e);
      return [];
    }
  },
};
