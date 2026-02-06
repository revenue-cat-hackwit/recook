import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthApiService } from '../services/authApiService';
import { AuthService } from '../services/authService';
import { PersonalizationService } from '../services/personalizationService';
import { TokenStorage } from '../services/apiClient';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { AuthUser } from '@/lib/types/auth';
import { useSubscriptionStore } from './subscriptionStore';

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
  signInWithGoogle: () => Promise<void>;
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
      GoogleSignin.configure({
        webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
      });

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
      
      // Identify to RevenueCat
      if (response.data.user?.id) {
          useSubscriptionStore.getState().identifyUser(response.data.user.id).catch(err => console.warn("RC Ident error", err));
      }

      // Check personalization status after successful login
      try {
        await PersonalizationService.checkPersonalization();
      } catch (error: any) {
        console.warn('⚠️ Failed to check personalization (non-blocking):', {
          message: error.message,
          error: error.toString(),
        });
        // Don't block login if personalization check fails
        // User will be prompted for onboarding if hasOnboarded is false
      }
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

      // Identify to RevenueCat
      if (response.data.user?.id) {
          useSubscriptionStore.getState().identifyUser(response.data.user.id).catch(err => console.warn("RC Ident error", err));
      }

      // Check personalization status after successful verification
      try {
        await PersonalizationService.checkPersonalization();
      } catch (error: any) {
        console.warn('⚠️ Failed to check personalization (non-blocking):', {
          message: error.message,
          error: error.toString(),
        });
        // Don't block verification if personalization check fails
        // User will be prompted for onboarding if hasOnboarded is false
      }
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
    try {
      await AuthService.signOut(); // Clear Supabase session
    } catch (e) {
      console.warn('Supabase logout failed', e);
    }
    await AuthApiService.logout(); // Clear Backend token

    // Clear persisted caches
    const RECIPES_STORAGE_KEY = 'pirinku_local_recipes_v1';
    await AsyncStorage.removeItem(RECIPES_STORAGE_KEY);
    await AsyncStorage.removeItem('pirinku_user_id');

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

  /**
   * Sign in with Google
   */
  signInWithGoogle: async () => {
    set({ isLoading: true });
    try {
      console.log('🟢 [AuthStore] Starting Google Sign-In...');
      const response = await AuthService.signInWithGoogle();

      if (response?.success && response.data) {
        console.log('✅ [AuthStore] Google Sign-In successful, setting user state:', {
          userId: response.data.user.id,
          email: response.data.user.email,
          username: response.data.user.username,
        });

        const token = response.data.token;
        const user = response.data.user;

        set({ token, user });
        console.log('✅ [AuthStore] User state updated successfully');

        // Identify to RevenueCat
        if (user?.id) {
             useSubscriptionStore.getState().identifyUser(user.id).catch(err => console.warn("RC Ident error", err));
        }

        // Check personalization status after successful Google sign-in
        try {
          await PersonalizationService.checkPersonalization();
        } catch (error: any) {
          console.warn('⚠️ Failed to check personalization (non-blocking):', {
            message: error.message,
            error: error.toString(),
          });
          // Don't block sign-in if personalization check fails
          // User will be prompted for onboarding if hasOnboarded is false
        }
      } else {
        console.error('❌ [AuthStore] Invalid response from signInWithGoogle');
        throw new Error('Invalid response from Google Sign-In');
      }
    } catch (error) {
      console.error('❌ [AuthStore] Google Sign-In Error:', error);
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },
}));
