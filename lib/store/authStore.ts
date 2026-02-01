import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthApiService } from '../services/authApiService';
import { AuthUser } from '@/lib/types/auth';

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  isLoading: boolean;
}

interface AuthActions {
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (username: string, fullName: string, email: string, password: string) => Promise<{ userId: string; email: string }>;
  verifyOTP: (email: string, otp: string) => Promise<void>;
  resendOTP: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  setCredentials: (token: string | null, user: AuthUser | null) => void;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (email: string, otp: string, newPassword: string) => Promise<void>;
  initializeAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState & AuthActions>((set) => ({
  token: null,
  user: null,
  isLoading: false,

  /**
   * Initialize auth state from stored token on app launch
   */
  initializeAuth: async () => {
    set({ isLoading: true });
    try {
      const hasToken = await AuthApiService.hasValidToken();
      if (hasToken) {
        const token = await AuthApiService.getToken();
        // Note: We don't have user data yet, will be loaded when needed
        // For now, just set the token to indicate authenticated state
        set({ token, user: null });
      }
    } catch (error) {
      console.error('Failed to initialize auth:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  /**
   * Sign in with email and password
   */
  signIn: async (email: string, password: string) => {
    set({ isLoading: true });
    try {
      const response = await AuthApiService.login(email, password);
      set({
        token: response.data.token,
        user: response.data.user
      });
    } catch (error) {
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  /**
   * Sign up - Create new account (returns userId and email for OTP verification)
   */
  signUp: async (username: string, fullName: string, email: string, password: string) => {
    set({ isLoading: true });
    try {
      const response = await AuthApiService.createAccount(username, fullName, email, password);
      return response.data; // Return userId and email for navigation to OTP screen
    } finally {
      set({ isLoading: false });
    }
  },

  /**
   * Verify OTP after sign up
   */
  verifyOTP: async (email: string, otp: string) => {
    set({ isLoading: true });
    try {
      const response = await AuthApiService.verifyOTP(email, otp);
      set({
        token: response.data.token,
        user: response.data.user
      });
    } finally {
      set({ isLoading: false });
    }
  },

  /**
   * Resend OTP to email
   */
  resendOTP: async (email: string) => {
    await AuthApiService.resendOTP(email);
  },

  /**
   * Sign out - Clear token and user data
   */
  signOut: async () => {
    await AuthApiService.logout();

    // Clear persisted caches
    const RECIPES_STORAGE_KEY = 'pirinku_local_recipes_v1';
    await AsyncStorage.removeItem(RECIPES_STORAGE_KEY);

    set({ token: null, user: null });
  },

  /**
   * Set credentials manually (for token refresh, etc.)
   */
  setCredentials: (token: string | null, user: AuthUser | null) => {
    set({ token, user });
  },

  /**
   * Request password reset OTP
   */
  forgotPassword: async (email: string) => {
    await AuthApiService.forgotPassword(email);
  },

  /**
   * Reset password with OTP
   */
  resetPassword: async (email: string, otp: string, newPassword: string) => {
    await AuthApiService.resetPassword(email, otp, newPassword);
  },
}));
