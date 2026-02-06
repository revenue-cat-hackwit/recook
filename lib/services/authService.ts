import { supabase } from '@/lib/supabase';
import {
  GoogleSignin,
  isErrorWithCode,
  isSuccessResponse,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import { AuthApiService } from './authApiService';
import { GoogleSignInRequest } from '@/lib/types/auth';

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

  async signInWithGoogle() {
    console.log('🔵 [Google Sign-In] Starting Google Sign-In process');
    const startTime = Date.now();
    
    try {
      console.log('🔵 [Google Sign-In] Checking Play Services availability...');
      await GoogleSignin.hasPlayServices();
      console.log('✅ [Google Sign-In] Play Services available');
      
      console.log('🔵 [Google Sign-In] Initiating Google Sign-In flow...');
      const userInfo = await GoogleSignin.signIn();
      console.log('✅ [Google Sign-In] User info received:', {
        hasIdToken: !!userInfo?.data?.idToken,
        email: userInfo?.data?.user?.email,
        name: userInfo?.data?.user?.name,
      });

        if (isSuccessResponse(userInfo)) {
        console.log('🔵 [Google Sign-In] Signing in to Supabase with Google ID token...');
        const { data, error } = await supabase.auth.signInWithIdToken({
          provider: 'google',
          token: userInfo.data.idToken || '',
        });

        if (error) {
          console.error('❌ [Google Sign-In] Supabase auth error:', {
            message: error.message,
            status: error.status,
            name: error.name,
          });
          throw error;
        }
        
        console.log('✅ [Google Sign-In] Supabase auth successful:', {
          userId: data?.user?.id,
          email: data?.user?.email,
        });

        // Prepare data for backend API
        const backendRequest: GoogleSignInRequest = {
          user: {
            id: data.user.id,
            email: data.user.email || '',
            user_metadata: {
              full_name: data.user.user_metadata?.full_name || userInfo.data.user.name || '',
              avatar_url: data.user.user_metadata?.avatar_url || userInfo.data.user.photo || '',
            },
          },
        };

        console.log('🔵 [Google Sign-In] Calling backend API with user data...');
        const backendResponse = await AuthApiService.googleSignIn(backendRequest);
        
        if (!backendResponse.success) {
          console.error('❌ [Google Sign-In] Backend API error:', backendResponse.message);
          throw new Error(backendResponse.message || 'Backend authentication failed');
        }
        
        const duration = Date.now() - startTime;
        console.log('✅ [Google Sign-In] Successfully signed in!', {
          userId: backendResponse.data.user.id,
          email: backendResponse.data.user.email,
          username: backendResponse.data.user.username,
          duration: `${duration}ms`,
        });
        
        // Return backend response with token and user data
        return backendResponse;
      } else {
        console.error('❌ [Google Sign-In] Invalid response from GoogleSignin:', userInfo);
        throw new Error('Invalid response from Google Sign-In');
      }
    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.error('❌ [Google Sign-In] Error occurred:', {
        duration: `${duration}ms`,
        errorType: error?.constructor?.name,
        message: error?.message,
      });
      
      if (error.name === 'AuthApiError' || error.message?.includes('Database error')) {
        throw error;
      }

      if (isErrorWithCode(error)) {
        console.error('❌ [Google Sign-In] Error code:', error.code);
        switch (error.code) {
          case statusCodes.SIGN_IN_CANCELLED:
            console.log('⚠️  [Google Sign-In] User cancelled the login flow');
            throw new Error('User cancelled the login flow');
          case statusCodes.IN_PROGRESS:
            console.log('⚠️  [Google Sign-In] Sign in already in progress');
            throw new Error('Sign in is in progress already');
          case statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
            console.log('⚠️  [Google Sign-In] Play services not available');
            throw new Error('Play services not available or outdated');
          default:
            console.error('❌ [Google Sign-In] Unknown error code:', error.code);
            throw new Error('An unknown error occurred during Google Sign-In');
        }
      }
      console.error('❌ [Google Sign-In] Unhandled error:', error);
      throw error;
    } finally {
      console.log('🔵 [Google Sign-In] Signing out from Google (cleanup)...');
      await GoogleSignin.signOut();
      console.log('✅ [Google Sign-In] Cleanup completed');
    }
  },
};
