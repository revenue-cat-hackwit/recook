import AuthFooterLink from '@/components/auth/AuthFooterLink';
import AuthHeader from '@/components/auth/AuthHeader';
import AuthPasswordField from '@/components/auth/AuthPasswordField';
import AuthPrimaryButton from '@/components/auth/AuthPrimaryButton';
import AuthTextField from '@/components/auth/AuthTextField';
import { useAuthStore } from '@/lib/store/authStore';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { showAlert } from '@/lib/utils/globalAlert';
import { Danger, Profile, User, Sms, Lock, UserAdd } from 'iconsax-react-native';

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
      showAlert('Error', errorMessage, undefined, {
        icon: <Danger size={32} color="#EF4444" variant="Bold" />,
        type: 'destructive',
      });
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
          title="Create your account and start your delicious culinary journey today"
          subtitle=""
          titleClassName="font-visby-demibold text-3xl font-medium text-black"
        />

        <View className="mt-6 gap-5">
          <AuthTextField
            label="Username"
            placeholder="Your username"
            autoCapitalize="none"
            value={username}
            onChangeText={setUsername}
            icon={<Profile size={20} color="#8BD65E" variant="Bold" />}
          />
          <AuthTextField
            label="Full Name"
            placeholder="Your full name"
            autoCapitalize="words"
            value={fullName}
            onChangeText={setFullName}
            icon={<User size={20} color="#8BD65E" variant="Bold" />}
          />
          <AuthTextField
            label="Email"
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
            icon={<Sms size={20} color="#8BD65E" variant="Bold" />}
          />
          <AuthPasswordField
            label="Password"
            placeholder="********"
            value={password}
            onChangeText={setPassword}
            icon={<Lock size={20} color="#8BD65E" variant="Bold" />}
          />
          <AuthPasswordField
            label="Confirm Password"
            placeholder="********"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            icon={<Lock size={20} color="#8BD65E" variant="Bold" />}
          />
        </View>

        <AuthPrimaryButton
          title={isLoading ? 'Creating Account...' : 'Create Account'}
          containerClassName="mt-6"
          onPress={handleSignUp}
          disabled={isLoading}
          icon={!isLoading && <UserAdd size={20} color="#FFFFFF" variant="Bold" />}
        />

        <AuthFooterLink
          text="Already have an account? "
          linkText="Login here"
          onPress={() => router.dismissTo('/sign-in')}
          containerClassName="mt-auto flex-row items-center justify-center pb-6"
        />
      </View>
    </SafeAreaView>
  );
}
