import AuthFooterLink from '@/components/auth/AuthFooterLink';
import AuthHeader from '@/components/auth/AuthHeader';
import AuthPasswordField from '@/components/auth/AuthPasswordField';
import AuthPrimaryButton from '@/components/auth/AuthPrimaryButton';
import AuthTextField from '@/components/auth/AuthTextField';
import { useAuthStore } from '@/lib/store/authStore';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SignUpPage() {
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const signUp = useAuthStore((state) => state.signUp);

  useEffect(() => {
    if (errorMessage) {
      Alert.alert('Error', errorMessage);
      setErrorMessage(null);
    }
  }, [errorMessage]);

  const handleSignUp = async () => {
    if (isLoading) return;

    if (!username || !fullName || !email || !password || !confirmPassword) {
      setErrorMessage('Please fill in all fields.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    if (password.length < 8) {
      setErrorMessage('Password must be at least 8 characters long.');
      return;
    }

    try {
      setIsLoading(true);
      const result = await signUp(username, fullName, email, password);

      // Navigate to OTP verification screen
      router.push({
        pathname: '/verify-otp',
        params: { email: result.email },
      });
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 px-6 pt-10">
        <AuthHeader
          title="Create Account"
          subtitle="Create an account to start your culinary journey"
        />

        <View className="mt-6 gap-5">
          <AuthTextField
            label="Username"
            placeholder="Your username"
            autoCapitalize="none"
            value={username}
            onChangeText={setUsername}
          />
          <AuthTextField
            label="Full Name"
            placeholder="Your full name"
            autoCapitalize="words"
            value={fullName}
            onChangeText={setFullName}
          />
          <AuthTextField
            label="Email"
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />
          <AuthPasswordField
            label="Password"
            placeholder="••••••••"
            value={password}
            onChangeText={setPassword}
          />
          <AuthPasswordField
            label="Confirm Password"
            placeholder="••••••••"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
          />
        </View>

        <AuthPrimaryButton
          title={isLoading ? "Creating Account..." : "Sign Up"}
          containerClassName="mt-6"
          onPress={handleSignUp}
          disabled={isLoading}
        />

        <AuthFooterLink
          text="Already have an account? "
          linkText="Sign in"
          onPress={() => router.dismissTo('/sign-in')}
          containerClassName="mt-auto flex-row items-center justify-center pb-6"
        />
      </View>
    </SafeAreaView>
  );
}
