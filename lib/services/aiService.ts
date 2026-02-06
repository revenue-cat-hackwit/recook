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
    sessionId?: string | null,
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
  /**
   * Get list of chat sessions for the drawer
   * Uses optimized RPC call 'get_user_chat_sessions'
   */
  async getSessions(): Promise<any[]> {
    try {
      const { data, error } = await supabase.rpc('get_user_chat_sessions');

      if (error) {
        console.error('RPC Error:', error);
        throw error;
      }

      // Map snake_case from DB to camelCase for frontend
      return (data || []).map((session: any) => ({
        id: session.id,
        title: session.title || 'New Chat',
        lastMessage: session.last_message,
        timestamp: new Date(session.created_at).getTime(),
        messageCount: session.message_count
      }));
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
   * Create a new chat session
   */
  async createSession(title: string = 'New Chat'): Promise<string | null> {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return null;

      const { data, error } = await supabase
        .from('chat_sessions')
        .insert({
          user_id: userData.user.id,
          title: title,
        })
        .select('id')
        .single();

      if (error) {
        console.error('Create Session Error:', error);
        return null;
      }
      return data.id;
    } catch (e) {
      console.error('Create Session Exception:', e);
      return null;
    }
  },

  /**
   * Update session title
   */
  async updateSessionTitle(sessionId: string, title: string): Promise<boolean> {
     try {
       const { error } = await supabase
         .from('chat_sessions')
         .update({ title })
         .eq('id', sessionId);
       return !error;
     } catch (e) {
       return false;
     }
  },
  
  // Existing clearHistory...
  async clearHistory(): Promise<void> {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      // Delete sessions (cascade deletes messages)
      const { error } = await supabase
        .from('chat_sessions')
        .delete()
        .eq('user_id', userData.user.id);

      if (error) throw error;
    } catch (e) {
      console.error('Clear History Error:', e);
      throw e;
    }
  },
};
