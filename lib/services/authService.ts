import { supabase } from '@/lib/supabase';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { Session, User } from '@supabase/supabase-js';

export const AuthService = {
  async signInWithEmail(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  },

  async signUp(email: string, password: string, username?: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username } },
    });
    if (error) throw error;
    return data;
  },

  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  async resetPasswordForEmail(email: string, redirectTo: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    if (error) throw error;
  },

  async updateUserPassword(password: string) {
    const { data, error } = await supabase.auth.updateUser({ password });
    if (error) throw error;
    return data;
  },

  async setSession(accessToken: string, refreshToken: string) {
    const { data, error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (error) throw error;
    return data;
  },

  // --- Google Sign In Logic ---
  async signInWithGoogle() {
    try {
      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();

      if (userInfo.data?.idToken) {
        const { data, error } = await supabase.auth.signInWithIdToken({
          provider: 'google',
          token: userInfo.data.idToken,
        });

        if (error) throw error;
        return data; // { session, user }
      } else {
        throw new Error('No Google ID Token found');
      }
    } catch (error: any) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        throw new Error('Sign in cancelled');
      } else if (error.code === statusCodes.IN_PROGRESS) {
        throw new Error('Sign in already in progress');
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        throw new Error('Play services not available');
      } else {
        throw error;
      }
    }
  },
};
