import AuthBackButton from '@/components/auth/AuthBackButton';
import AuthHeader from '@/components/auth/AuthHeader';
import AuthPasswordField from '@/components/auth/AuthPasswordField';
import AuthPrimaryButton from '@/components/auth/AuthPrimaryButton';
import { useAuthStore } from '@/lib/store/authStore';
import { AuthError } from '@supabase/supabase-js';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ResetPasswordPage() {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const resetPassword = useAuthStore((state) => state.resetPassword);

  useEffect(() => {
    if (errorMessage) {
      Alert.alert('Error', errorMessage);
      setErrorMessage(null);
    }
  }, [errorMessage]);

  const handleResetPress = async () => {
    if (isLoading) return;

    if (newPassword !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    try {
      setIsLoading(true);
      await resetPassword(newPassword);
      setErrorMessage('Your password has been reset. Please log in with your new password.');
    } catch (error) {
      if (error instanceof AuthError) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage('An unexpected error occurred. Please try again.');
      }
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
            title="Reset Password"
            subtitle="Create your new Password, Password must be different from any password you have used before."
            titleClassName="font-visby text-2xl font-semibold text-black"
            subtitleClassName="font-visby text-sm text-gray-500"
          />

          <View className="gap-4">
            <AuthPasswordField
              label="New Password"
              placeholder="••••••••"
              labelClassName="font-visby text-sm font-medium text-black"
              inputWrapperClassName="flex-row items-center justify-between rounded-xl border border-green-400 px-4 py-3"
              inputClassName="font-visby flex-1 text-sm text-black"
              onChangeText={setNewPassword}
              value={newPassword}
            />
            <AuthPasswordField
              label="Confirm Password"
              placeholder="••••••••"
              labelClassName="font-visby text-sm font-medium text-black"
              inputWrapperClassName="flex-row items-center justify-between rounded-xl border border-green-400 px-4 py-3"
              inputClassName="font-visby flex-1 text-sm text-black"
              onChangeText={setConfirmPassword}
              value={confirmPassword}
            />
          </View>

          <AuthPrimaryButton title="Reset Password" onPress={handleResetPress} />
        </View>
      </View>
    </SafeAreaView>
  );
}
