import { Session, User } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import { create } from 'zustand';
import { AuthService } from '../services/authService';

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
  signInWithGoogle: () => Promise<void>;
}

export const useAuthStore = create<AuthState & AuthActions>((set) => ({
  session: null,
  user: null,
  signIn: async (email: string, password: string) => {
    const data = await AuthService.signInWithEmail(email, password);
    set({ session: data.session, user: data.user });
  },

  signUp: async (username: string, email: string, password: string) => {
    const data = await AuthService.signUp(email, password, username);
    set({ session: data.session, user: data.user });
  },

  signInWithGoogle: async () => {
    const data = await AuthService.signInWithGoogle();
    if (data) {
      set({ session: data.session, user: data.user });
    }
  },

  signOut: async () => {
    await AuthService.signOut();
    set({ session: null, user: null });
  },

  setCredentials: (session: Session | null, user: User | null) => {
    set({ session, user });
  },

  sendResetPasswordForEmail: async (email: string) => {
    const redirectTo = Linking.createURL('reset-password');
    await AuthService.resetPasswordForEmail(email, redirectTo);
  },

  resetPassword: async (newPassword: string) => {
    const data = await AuthService.updateUserPassword(newPassword);
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
        const data = await AuthService.setSession(accessToken, refreshToken);
        if (data?.session) {
          console.log('setCredentialsFromUrl Success: ', data.session);
          // set({ session: session, user: session?.user });
        }
      }
    }
  },
}));
