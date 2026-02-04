import AuthBackButton from '@/components/auth/AuthBackButton';
import AuthHeader from '@/components/auth/AuthHeader';
import AuthPrimaryButton from '@/components/auth/AuthPrimaryButton';
import AuthTextField from '@/components/auth/AuthTextField';
import { useAuthStore } from '@/lib/store/authStore';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { showAlert } from '@/lib/utils/globalAlert';
import { Danger, Sms, Send2 } from 'iconsax-react-native';

export default function ForgotPasswordPage() {
  const [isSent, setIsSent] = useState(false);
  const [email, setEmail] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const forgotPassword = useAuthStore((state) => state.forgotPassword);

  useEffect(() => {
    if (errorMessage) {
      showAlert('Error', errorMessage, undefined, {
        icon: <Danger size={32} color="#EF4444" variant="Bold" />,
        type: 'destructive',
      });
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
            title="No worries! Enter your email and we'll send you a verification code to reset it."
            subtitle=""
            titleClassName="font-visby-demibold text-3xl font-medium text-black"
            subtitleClassName="font-visby text-sm text-gray-500"
          />

          <AuthTextField
            label="Email"
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            labelClassName="font-visby text-sm font-medium text-black"
            inputWrapperClassName="rounded-xl border border-black/15 px-4 py-3"
            inputClassName="font-visby text-sm text-black"
            value={email}
            onChangeText={setEmail}
            icon={<Sms size={20} color="#8BD65E" variant="Bold" />}
          />

          <AuthPrimaryButton
            title={isLoading ? 'Sending...' : 'Send OTP'}
            onPress={handleSendPress}
            disabled={isLoading}
            icon={!isLoading && <Send2 size={20} color="#FFFFFF" variant="Bold" />}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}
