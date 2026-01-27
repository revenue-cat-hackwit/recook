import { AuthError } from '@supabase/supabase-js';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../supabase';
import { decode } from 'base64-arraybuffer';

interface UpdateUserProfileParams {
  username?: string;
  avatarBase64?: string;
  bio?: string;
}

export const UserService = {
  updateUserProfile: async (params: UpdateUserProfileParams) => {
    const userId = useAuthStore.getState().user?.id;
    if (!userId) {
      useAuthStore.getState().setCredentials(null, null);
      throw new AuthError('No authenticated user found');
    }

    const { username, avatarBase64, bio } = params;

    let avatar_url: string | undefined = undefined;

    if (avatarBase64) {
      const fileName = `${userId}`;
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, decode(avatarBase64), {
          contentType: 'image/png',
          upsert: true,
        });

      if (uploadError) {
        throw uploadError;
      }

      const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);

      avatar_url = data.publicUrl;
    }
    const updates: { [key: string]: string } = {};

    if (username) updates.username = username;
    if (avatar_url) updates.avatar_url = avatar_url;
    if (bio) updates.bio = bio;

    const { error: updateError } = await supabase.from('profiles').update(updates).eq('id', userId);

    if (updateError) throw updateError;

    const { error } = await supabase.auth.updateUser({
      data: updates,
    });

    if (error) {
      throw error;
    }
  },
};
