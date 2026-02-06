import { AuthError } from '@supabase/supabase-js';
import { AuthApiService } from './authApiService';
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

    // Update profile via Backend API
    const response = await AuthApiService.updateProfile({
      fullName: username,
      bio: bio,
      avatar: avatar_url,
    });

    // Update local AuthStore to reflect changes globally
    if (response.success && response.data.user) {
        const currentToken = useAuthStore.getState().token;
        const currentUser = useAuthStore.getState().user;
        
        if (currentToken && currentUser) {
            // Merge existing auth user with updated profile fields
            useAuthStore.getState().setCredentials(currentToken, {
                ...currentUser,
                username: response.data.user.username,
                fullName: response.data.user.fullName,
                avatar: response.data.user.avatar,
                bio: response.data.user.bio,
            } as any); 
        }
    }
  },
};
