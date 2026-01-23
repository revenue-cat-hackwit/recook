import { Session, User } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import { create } from 'zustand';
import { supabase } from '../supabase';

interface AuthState {
  session: Session | null;
  user: User | null;
}

interface AuthActions {
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (username: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  setCredentials: (session: Session | null, user: User | null) => void;
  setCredentialsFromUrl: (url: string) => Promise<void>;
  sendResetPasswordForEmail: (email: string) => Promise<void>;
  resetPassword: (newPassword: string) => Promise<void>;
}

export const useAuthStore = create<AuthState & AuthActions>((set) => ({
  session: null,
  user: null,
  signIn: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      throw error;
    }
    set({ session: data.session, user: data.user });
  },

  signUp: async (username: string, email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username } },
    });
    if (error) {
      throw error;
    }
    set({ session: data.session, user: data.user });
  },

  signOut: async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw error;
    }
    set({ session: null, user: null });
  },

  setCredentials: (session: Session | null, user: User | null) => {
    set({ session, user });
  },

  sendResetPasswordForEmail: async (email: string) => {
    const redirectTo = Linking.createURL('reset-password');

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });
    if (error) {
      throw error;
    }
  },

  resetPassword: async (newPassword: string) => {
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    if (error) {
      throw error;
    }
    set({ user: data.user });
  },

  setCredentialsFromUrl: async (url: string) => {
    //NOTE - Example URL: pirinku://reset-password?token=....#access_token=....&expires_at=....&expires_in=....&refresh_token=....&token_type=bearer&type=recovery
    const hashPart = url.split('#')[1];
    if (hashPart) {
      const params = new URLSearchParams(hashPart);
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');
      const type = params.get('type');

      if (type === 'recovery' && accessToken && refreshToken) {
        const {
          data: { session },
        } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (session) {
          console.log('setCredentialsFromUrl Success: ', session);
          // set({ session: session, user: session?.user });
        }
      }
    }
  },
}));
