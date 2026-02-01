import AuthBackButton from '@/components/auth/AuthBackButton';
import AuthHeader from '@/components/auth/AuthHeader';
import AuthPrimaryButton from '@/components/auth/AuthPrimaryButton';
import AuthTextField from '@/components/auth/AuthTextField';
import { useAuthStore } from '@/lib/store/authStore';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ForgotPasswordPage() {
  const [isSent, setIsSent] = useState(false);
  const [email, setEmail] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const forgotPassword = useAuthStore((state) => state.forgotPassword);

  useEffect(() => {
    if (errorMessage) {
      Alert.alert('Error', errorMessage);
      setErrorMessage(null);
    }
  }, [errorMessage]);

  const handleSendPress = async () => {
    if (isLoading) return;

    if (!email) {
      setErrorMessage('Please enter your email address.');
      return;
    }

    try {
      setIsLoading(true);
      await forgotPassword(email);
      setIsSent(true);
      // Navigate to reset password screen with email
      router.push({
        pathname: '/reset-password',
        params: { email },
      });
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 px-6 pt-4">
        <AuthBackButton onPress={() => router.back()} />

        <View className="gap-6">
          <AuthHeader
            title="Forgot Password"
            subtitle="Enter your email address and we'll send you an OTP code to reset your password."
            titleClassName="font-visby text-2xl font-semibold text-black"
            subtitleClassName="font-visby text-sm text-gray-500"
          />

          <AuthTextField
            label="Email"
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            labelClassName="font-visby text-sm font-medium text-black"
            inputWrapperClassName="rounded-xl border border-green-400 px-4 py-3"
            inputClassName="font-visby text-sm text-black"
            value={email}
            onChangeText={setEmail}
          />

          <AuthPrimaryButton
            title={isLoading ? "Sending..." : "Send OTP"}
            onPress={handleSendPress}
            disabled={isLoading}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}
