import AuthFooterLink from '@/components/auth/AuthFooterLink';
import AuthHeader from '@/components/auth/AuthHeader';
import AuthPasswordField from '@/components/auth/AuthPasswordField';
import AuthPrimaryButton from '@/components/auth/AuthPrimaryButton';
import AuthTextField from '@/components/auth/AuthTextField';
import { useAuthStore } from '@/lib/store/authStore';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SignInPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const signIn = useAuthStore((state) => state.signIn);

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
      // Explicit navigation after successful login
      router.replace('/(tabs)/feed');
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred. Please try again.');
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

        <AuthPrimaryButton
          title={loading ? "Logging in..." : "Login"}
          containerClassName="mt-6"
          onPress={handleSignIn}
          disabled={loading}
        />

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
