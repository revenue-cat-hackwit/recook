import AuthBackButton from '@/components/auth/AuthBackButton';
import AuthHeader from '@/components/auth/AuthHeader';
import AuthPasswordField from '@/components/auth/AuthPasswordField';
import AuthPrimaryButton from '@/components/auth/AuthPrimaryButton';
import AuthTextField from '@/components/auth/AuthTextField';
import { useAuthStore } from '@/lib/store/authStore';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ResetPasswordPage() {
  const { email } = useLocalSearchParams<{ email: string }>();
  const [otp, setOtp] = useState('');
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

    if (!email) {
      setErrorMessage('Email is missing. Please try again from forgot password.');
      return;
    }

    if (!otp || otp.length !== 6) {
      setErrorMessage('Please enter the 6-digit OTP code.');
      return;
    }

    if (!newPassword || !confirmPassword) {
      setErrorMessage('Please fill in all fields.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    if (newPassword.length < 8) {
      setErrorMessage('Password must be at least 8 characters long.');
      return;
    }

    try {
      setIsLoading(true);
      await resetPassword(email, otp, newPassword);
      Alert.alert(
        'Success',
        'Your password has been reset successfully. Please log in with your new password.',
        [
          {
            text: 'OK',
            onPress: () => router.replace('/sign-in'),
          },
        ]
      );
    } catch (error: any) {
      setErrorMessage(error.message || 'An unexpected error occurred. Please try again.');
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
            subtitle={`Enter the OTP code sent to ${email} and create your new password.`}
            titleClassName="font-visby text-2xl font-semibold text-black"
            subtitleClassName="font-visby text-sm text-gray-500"
          />

          <View className="gap-4">
            <AuthTextField
              label="OTP Code"
              placeholder="Enter 6-digit code"
              keyboardType="number-pad"
              maxLength={6}
              labelClassName="font-visby text-sm font-medium text-black"
              inputWrapperClassName="rounded-xl border border-green-400 px-4 py-3"
              inputClassName="font-visby text-sm text-black"
              value={otp}
              onChangeText={setOtp}
            />
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

          <AuthPrimaryButton
            title={isLoading ? "Resetting..." : "Reset Password"}
            onPress={handleResetPress}
            disabled={isLoading}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}
