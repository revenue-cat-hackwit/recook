import AuthFooterLink from '@/components/auth/AuthFooterLink';
import AuthHeader from '@/components/auth/AuthHeader';
import AuthPasswordField from '@/components/auth/AuthPasswordField';
import AuthPrimaryButton from '@/components/auth/AuthPrimaryButton';
import AuthSocialButton from '@/components/auth/AuthSocialButton';
import AuthTextField from '@/components/auth/AuthTextField';
import { useAuthStore } from '@/lib/store/authStore';
import { FontAwesome6 } from '@expo/vector-icons';
import { AuthError } from '@supabase/supabase-js';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SignUpPage() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const signUp = useAuthStore((state) => state.signUp);

  useEffect(() => {
    if (errorMessage) {
      //FIXME Change Alert dialog
      Alert.alert('Error', errorMessage);
      setErrorMessage(null);
    }
  }, [errorMessage]);

  const handleSignUp = async () => {
    if (isLoading) return;

    if (!username || !email || !password || !confirmPassword) {
      setErrorMessage('Please fill in all fields.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    try {
      setIsLoading(true);
      await signUp(username, email, password);
    } catch (err) {
      if (err instanceof AuthError) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('An unexpected error occurred. Please try again.');
      }
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

        <AuthPrimaryButton title="Sign Up" containerClassName="mt-6" onPress={handleSignUp} />

        <View className="mt-auto gap-4">
          {/* TODO Add social sign-up functionality */}
          <AuthSocialButton
            title="Sign Up with Google"
            icon={<FontAwesome6 name="google" size={20} color="#4285F4" />}
          />

          <AuthFooterLink
            text="Already have an account? "
            linkText="Sign in"
            onPress={() => router.dismissTo('/sign-in')}
            containerClassName="flex-row items-center justify-center pb-2"
          />
        </View>
      </View>
    </SafeAreaView>
  );
}
