import { supabase, supabaseUrl, supabaseAnonKey } from '@/lib/supabase';
import { Message } from '@/lib/types';

export const AIService = {
  /**
   * Send message to AI Edge Function
   */
  async sendMessage(messages: Message[]) {
    // 1. Get User Token
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token || supabaseAnonKey;

    // Filter messages
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
          apikey: supabaseAnonKey, // Critical for Gateway
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
  /**
   * Save a single message to Supabase DB (Chat History)
   */
  async saveMessage(
    role: 'user' | 'assistant',
    content: string | any[],
    sessionId?: string,
  ): Promise<void> {
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();

      if (userError) {
        console.error('[AIService] Error getting user:', userError);
        return;
      }

      if (!userData.user) {
        console.log('[AIService] No user logged in, skipping save');
        return;
      }

      console.log('[AIService] Saving message:', { role, userId: userData.user.id, sessionId });

      const { data, error } = await supabase.from('chat_messages').insert({
        user_id: userData.user.id,
        role: role,
        content: content,
        session_id: sessionId,
      });

      if (error) {
        console.error('[AIService] Failed to save chat message:', error);
      } else {
        console.log('[AIService] Message saved successfully');
      }
    } catch (e) {
      console.error('[AIService] Exception in saveMessage:', e);
    }
  },

  /**
   * Fetch Chat History from Supabase
   * Optional: Filter by sessionId
   */
  async getHistory(sessionId?: string): Promise<Message[]> {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return [];

      let query = supabase
        .from('chat_messages')
        .select('*')
        .order('created_at', { ascending: true })
        .limit(100);

      // If sessionId is provided, filter by it
      if (sessionId) {
        query = query.eq('session_id', sessionId);
      } else {
        // If NO sessionId provided, maybe we want only messages with NO session?
        // Or all messages? Current behavior was ALL messages.
        // Let's keep it generally ALL unless filtered, but user might want 'current' session logic.
        // For simplicity now: If no sessionId, fetch all (legacy behavior)
      }

      const { data, error } = await query;

      if (error) throw error;

      return data.map((row: any) => ({
        id: row.id,
        role: row.role,
        content: row.content,
        timestamp: new Date(row.created_at).getTime(),
      }));
    } catch (e) {
      console.error('Fetch History Error:', e);
      return [];
    }
  },

  /**
   * Get list of chat sessions for the drawer
   */
  async getSessions(): Promise<any[]> {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return [];

      // We want to group by session_id and get the last message + time
      // Since supabase JS client doesn't support easy 'SELECT DISTINCT ON',
      // we might need a stored procedure OR do client side grouping (not efficient for huge data but ok for MVP)

      // Let's fetch all messages with session_id, order by created_at desc
      const { data, error } = await supabase
        .from('chat_messages')
        .select('session_id, content, created_at')
        .not('session_id', 'is', null)
        .order('created_at', { ascending: false })
        .limit(500); // Fetch enough recent messages to construct sessions

      if (error) throw error;

      // Client side grouping
      const sessionsMap = new Map();

      data.forEach((msg: any) => {
        if (!sessionsMap.has(msg.session_id)) {
          let preview = '';
          if (typeof msg.content === 'string') {
            preview = msg.content;
          } else if (Array.isArray(msg.content)) {
            preview = 'Image/Media content';
            const textPart = msg.content.find((c: any) => c.type === 'text');
            if (textPart) preview = textPart.text;
          }

          sessionsMap.set(msg.session_id, {
            id: msg.session_id,
            title: preview.slice(0, 30) + (preview.length > 30 ? '...' : ''), // Simple title from last msg
            lastMessage: preview,
            timestamp: new Date(msg.created_at).getTime(),
            messageCount: 1, // We'll count locally or just show 1+
          });
        } else {
          const sess = sessionsMap.get(msg.session_id);
          sess.messageCount += 1;
          // If we want title to be the FIRST message, we need complex logic.
          // For now, let's keep title as last message or generic.
        }
      });

      return Array.from(sessionsMap.values());
    } catch (e) {
      console.error('Get Sessions Error:', e);
      return [];
    }
  },

  /**
   * Delete specific chat session
   */
  async deleteSession(sessionId: string): Promise<void> {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { error } = await supabase
        .from('chat_messages')
        .delete()
        .eq('user_id', userData.user.id)
        .eq('session_id', sessionId);

      if (error) throw error;
    } catch (e) {
      console.error('Delete Session Error:', e);
      throw e;
    }
  },

  /**
   * Clear all chat history for current user
   */
  async clearHistory(): Promise<void> {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { error } = await supabase
        .from('chat_messages')
        .delete()
        .eq('user_id', userData.user.id);

      if (error) throw error;
    } catch (e) {
      console.error('Clear History Error:', e);
      throw e;
    }
  },
};
