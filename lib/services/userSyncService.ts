import { supabase } from '@/lib/supabase';
import { TokenStorage } from './apiClient';
import { decodeJwt } from '@/lib/utils/jwt';

export const UserSyncService = {
  /**
   * Sync custom_user_id to Supabase profile after login
   */
  async syncCustomUserId(): Promise<void> {
    try {
      console.log('[UserSync] 🔄 Starting custom_user_id sync...');
      
      // Get custom JWT from storage
      const customToken = await TokenStorage.getToken();
      if (!customToken) {
        console.log('[UserSync] ⚠️ No custom JWT found');
        return;
      }

      // Decode JWT using helper
      const decoded = decodeJwt(customToken);
      const customUserId = decoded.userId;
      
      console.log('[UserSync] 📦 Decoded custom_user_id:', customUserId);

      // Get current Supabase user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('[UserSync] ⚠️ No Supabase user found');
        return;
      }

      console.log('[UserSync] 👤 Supabase user ID:', user.id);

      // Update profiles table with custom_user_id
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          email: user.email,
          custom_user_id: customUserId,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'id'
        });

      if (error) {
        console.error('[UserSync] ❌ Failed to sync:', error);
        throw error;
      }

      console.log('[UserSync] ✅ Successfully synced custom_user_id');
    } catch (error) {
      console.error('[UserSync] ❌ Sync error:', error);
      // Don't throw - this shouldn't block login
    }
  },
};
