import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { showAlert } from '@/lib/utils/globalAlert';
import { Danger, TickCircle, ShieldTick } from 'iconsax-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useAuthStore } from '@/lib/store/authStore';
import AuthHeader from '@/components/auth/AuthHeader';
import AuthPrimaryButton from '@/components/auth/AuthPrimaryButton';

export default function VerifyOTPPage() {
  const { email } = useLocalSearchParams<{ email: string }>();
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(60);
  const inputRefs = useRef<(TextInput | null)[]>([]);

  const { verifyOTP, resendOTP } = useAuthStore();

  // Countdown timer for resend OTP
  useEffect(() => {
    if (resendCountdown > 0) {
      const timer = setTimeout(() => setResendCountdown(resendCountdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCountdown]);

  const handleOtpChange = (value: string, index: number) => {
    // Only allow numbers
    if (value && !/^\d+$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all 6 digits are entered
    if (index === 5 && value) {
      const fullOtp = newOtp.join('');
      if (fullOtp.length === 6) {
        handleVerify(fullOtp);
      }
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    // Handle backspace
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async (otpCode?: string) => {
    const code = otpCode || otp.join('');

    if (code.length !== 6) {
      showAlert('Error', 'Please enter the complete 6-digit OTP code', undefined, {
        icon: <Danger size={32} color="#EF4444" variant="Bold" />,
        type: 'destructive',
      });
      return;
    }

    if (!email) {
      showAlert('Error', 'Email is missing. Please try again.', undefined, {
        icon: <Danger size={32} color="#EF4444" variant="Bold" />,
        type: 'destructive',
      });
      return;
    }

    try {
      setLoading(true);
      await verifyOTP(email, code);
      // Success - navigate to onboarding
      router.replace('/onboarding');
    } catch (error: any) {
      showAlert(
        'Verification Failed',
        error.message || 'Invalid OTP code. Please try again.',
        undefined,
        {
          icon: <Danger size={32} color="#EF4444" variant="Bold" />,
          type: 'destructive',
        },
      );
      // Clear OTP inputs
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (resendCountdown > 0) return;

    if (!email) {
      showAlert('Error', 'Email is missing. Please try again.', undefined, {
        icon: <Danger size={32} color="#EF4444" variant="Bold" />,
        type: 'destructive',
      });
      return;
    }

    try {
      await resendOTP(email);
      showAlert('Success', 'A new OTP code has been sent to your email', undefined, {
        icon: <TickCircle size={32} color="#10B981" variant="Bold" />,
      });
      setResendCountdown(60); // Reset countdown
      setOtp(['', '', '', '', '', '']); // Clear inputs
      inputRefs.current[0]?.focus();
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to resend OTP. Please try again.', undefined, {
        icon: <Danger size={32} color="#EF4444" variant="Bold" />,
        type: 'destructive',
      });
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 px-6 pt-10">
        <AuthHeader
          title={`We've sent a 6-digit verification code to\n${email}`}
          subtitle=""
          titleClassName="font-visby-demibold text-3xl font-medium text-black text-center"
          subtitleClassName="font-visby-medium text-base text-slate-700 text-center"
        />

        {/* OTP Input Boxes */}
        <View className="mt-12 flex-row justify-center gap-3">
          {otp.map((digit, index) => (
            <TextInput
              key={index}
              ref={(ref) => {
                inputRefs.current[index] = ref;
              }}
              value={digit}
              onChangeText={(value) => handleOtpChange(value, index)}
              onKeyPress={(e) => handleKeyPress(e, index)}
              keyboardType="number-pad"
              maxLength={1}
              className="h-14 w-12 rounded-xl border-2 border-gray-200 bg-gray-50 text-center font-visby-bold text-2xl text-gray-900 focus:border-primary"
              autoFocus={index === 0}
            />
          ))}
        </View>

        {/* Verify Button */}
        <AuthPrimaryButton
          title={loading ? 'Verifying...' : 'Verify Email'}
          containerClassName="mt-8"
          onPress={() => handleVerify()}
          disabled={loading || otp.join('').length !== 6}
          icon={!loading && <ShieldTick size={20} color="#FFFFFF" variant="Bold" />}
        />

        {/* Resend OTP */}
        <View className="mt-6 items-center">
          <Text className="font-visby text-sm text-gray-500">Didn&apos;t receive the code?</Text>
          <TouchableOpacity
            onPress={handleResendOTP}
            disabled={resendCountdown > 0}
            className="mt-2"
          >
            <Text
              className={`font-visby-medium text-base ${
                resendCountdown > 0 ? 'text-gray-400' : 'text-primary'
              }`}
            >
              {resendCountdown > 0 ? `Resend in ${resendCountdown}s` : 'Resend Code'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Back to Sign In */}
        <TouchableOpacity onPress={() => router.back()} className="mt-auto items-center pb-6">
          <Text className="font-visby text-sm text-gray-500">
            Wrong email? <Text className="font-visby-medium text-primary">Change it</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
