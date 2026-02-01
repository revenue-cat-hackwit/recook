import AuthFooterLink from '@/components/auth/AuthFooterLink';
import AuthHeader from '@/components/auth/AuthHeader';
import AuthPasswordField from '@/components/auth/AuthPasswordField';
import AuthPrimaryButton from '@/components/auth/AuthPrimaryButton';
import AuthSocialButton from '@/components/auth/AuthSocialButton';
import AuthTextField from '@/components/auth/AuthTextField';
import { useAuthStore } from '@/lib/store/authStore';
import { Ionicons } from '@expo/vector-icons';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
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
      await useAuthStore.getState().signIn(email, password);
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
    try {
      setLoading(true);
      await useAuthStore.getState().signInWithGoogle();
    } catch (error: any) {
      setErrorMessage(error.message || 'Google Sign-In failed');
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
              linkClassName="font-visby-medium text-base text-primary"
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
