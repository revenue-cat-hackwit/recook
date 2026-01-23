import AuthFooterLink from '@/components/auth/AuthFooterLink';
import AuthHeader from '@/components/auth/AuthHeader';
import AuthPasswordField from '@/components/auth/AuthPasswordField';
import AuthPrimaryButton from '@/components/auth/AuthPrimaryButton';
import AuthSocialButton from '@/components/auth/AuthSocialButton';
import AuthTextField from '@/components/auth/AuthTextField';
import { useAuthStore } from '@/lib/store/authStore';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { AuthError } from '@supabase/supabase-js';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Platform, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SignInPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const signIn = useAuthStore((state) => state.signIn);

  useEffect(() => {
    if (Platform.OS !== 'web') {
      GoogleSignin.configure({
        scopes: ['profile', 'email'],
        webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
      });
    }
  }, []);

  useEffect(() => {
    if (errorMessage) {
      Alert.alert('Error', errorMessage);
      setErrorMessage(null);
    }
  }, [errorMessage]);

  const handleSignIn = async () => {
    if (loading) return;

    if (!email || !password) {
      setErrorMessage('Please enter both email and password.');
      return;
    }

    try {
      setLoading(true);
      await signIn(email, password);
    } catch (err) {
      if (err instanceof AuthError) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('An unexpected error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    console.log('[GoogleSignin] Starting sign in flow...');
    try {
      setLoading(true);
      await GoogleSignin.hasPlayServices();
      console.log('[GoogleSignin] Play Services available.');

      // For debugging only - remove in production or ensure no sensitive data leaks if possible
      // The configure is called in useEffect, assume it's done.

      const userInfo = await GoogleSignin.signIn();
      console.log('[GoogleSignin] Sign in success. User Info retrieved.', userInfo);

      if (userInfo.data?.idToken) {
        console.log('[GoogleSignin] ID Token found. Authenticating with Supabase...');

        const { data, error } = await supabase.auth.signInWithIdToken({
          provider: 'google',
          token: userInfo.data.idToken,
        });

        if (error) {
          console.error('[Supabase Auth] Error signing in with ID Token:', error);
          throw error;
        }

        console.log('[Supabase Auth] Success:', data);
        // Navigation handled by auth listener in _layout
      } else {
        console.error('[GoogleSignin] No ID Token in response:', userInfo);
        throw new Error('No ID token present!');
      }
    } catch (error: any) {
      console.error('[GoogleSignin] Error Catch Block:', error);
      console.error('[GoogleSignin] Error Code:', error.code);
      console.error('[GoogleSignin] Error Message:', error.message);

      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        // user cancelled the login flow
        console.log('[GoogleSignin] User cancelled.');
      } else if (error.code === statusCodes.IN_PROGRESS) {
        // operation (e.g. sign in) is in progress already
        console.log('[GoogleSignin] In progress.');
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        // play services not available or outdated
        console.log('[GoogleSignin] Play services not available.');
        setErrorMessage('Google Play Services not available.');
      } else {
        setErrorMessage(error.message || 'Google Sign-In failed');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 px-6 pt-10">
        <AuthHeader
          title="Welcome Back!"
          subtitle="Enter your details to get back in the kitchen."
          subtitleClassName="font-visby-medium text-base text-slate-700"
        />

        <View className="mt-8 gap-5">
          <AuthTextField
            label="Email"
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />

          <View className="gap-2">
            <AuthPasswordField
              label="Password"
              placeholder="••••••••"
              value={password}
              onChangeText={setPassword}
            />
            <AuthFooterLink
              linkText="Forgot Password?"
              onPress={() => router.push('/forgot-password')}
              containerClassName="self-start"
              linkClassName="font-visby-medium text-base text-green-500"
            />
          </View>
        </View>

        <AuthPrimaryButton title="Login" containerClassName="mt-6" onPress={handleSignIn} />

        <View className="mt-6 flex-row items-center gap-3">
          <View className="h-[1px] flex-1 bg-gray-200" />
          <Text className="font-visby text-sm text-gray-500">Or continue with</Text>
          <View className="h-[1px] flex-1 bg-gray-200" />
        </View>

        <View className="mt-6 gap-4">
          <AuthSocialButton
            title="Sign in with Google"
            icon={<Ionicons name="logo-google" size={20} color="black" />}
            onPress={handleGoogleSignIn}
          />
        </View>

        <AuthFooterLink
          text="Don't have an account? "
          linkText="Sign up"
          onPress={() => router.dismissTo('/sign-up')}
          containerClassName="mt-auto flex-row items-center justify-center pb-6"
        />
      </View>
    </SafeAreaView>
  );
}
