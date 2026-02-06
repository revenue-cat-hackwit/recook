import AuthFooterLink from '@/components/auth/AuthFooterLink';
import AuthHeader from '@/components/auth/AuthHeader';
import AuthPasswordField from '@/components/auth/AuthPasswordField';
import AuthPrimaryButton from '@/components/auth/AuthPrimaryButton';
import AuthSocialButton from '@/components/auth/AuthSocialButton';
import AuthTextField from '@/components/auth/AuthTextField';
import { useAuthStore } from '@/lib/store/authStore';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { showAlert } from '@/lib/utils/globalAlert';
import { LoadingModal } from '@/components/LoadingModal';
import { Danger, Profile, User, Sms, Lock, UserAdd, Google } from 'iconsax-react-native';

export default function SignUpPage() {
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const signUp = useAuthStore((state) => state.signUp);
  const signInWithGoogle = useAuthStore((state) => state.signInWithGoogle);

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

  const handleGoogleSignIn = async () => {
    if (isLoading) return;

    console.log('🟢 [Sign-Up Screen] User initiated Google Sign-In');
    try {
      setIsLoading(true);
      console.log('🟢 [Sign-Up Screen] Calling signInWithGoogle...');
      await signInWithGoogle();
      console.log('✅ [Sign-Up Screen] Google Sign-In successful, navigating...');
      router.replace('/personalization');
    } catch (err: any) {
      console.error('❌ [Sign-Up Screen] Google Sign-In failed:', {
        message: err?.message,
        error: err,
      });
      setErrorMessage(err.message || 'Google Sign-In failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView 
        className="flex-1" 
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 40, paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
      >
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

        <View className="mt-6 flex-row items-center justify-center gap-2">
          <View className="h-[1px] flex-1 bg-gray-200" />
          <Text className="font-visby-medium text-sm text-gray-500">Or continue with</Text>
          <View className="h-[1px] flex-1 bg-gray-200" />
        </View>

        <AuthSocialButton
          title="Sign up with Google"
          icon={<Google size={20} color="#000000" variant="Bold" />}
          onPress={handleGoogleSignIn}
          disabled={isLoading}
          containerClassName="mt-4"
        />

        <AuthFooterLink
          text="Already have an account? "
          linkText="Login here"
          onPress={() => router.dismissTo('/sign-in')}
          containerClassName="mt-auto flex-row items-center justify-center pb-6 pt-6"
        />
      </ScrollView>

      <LoadingModal 
        visible={isLoading} 
        message="Creating account..." 
        subMessage="Please wait a moment"
      />
    </SafeAreaView>
  );
}
