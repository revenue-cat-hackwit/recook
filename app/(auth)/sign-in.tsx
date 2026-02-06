import AuthFooterLink from '@/components/auth/AuthFooterLink';
import AuthHeader from '@/components/auth/AuthHeader';
import AuthPasswordField from '@/components/auth/AuthPasswordField';
import AuthPrimaryButton from '@/components/auth/AuthPrimaryButton';
import AuthSocialButton from '@/components/auth/AuthSocialButton';
import AuthTextField from '@/components/auth/AuthTextField';
import { useAuthStore } from '@/lib/store/authStore';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { showAlert } from '@/lib/utils/globalAlert';
import { LoadingModal } from '@/components/LoadingModal';
import { Danger, Sms, Lock, Login, Google } from 'iconsax-react-native';

export default function SignInPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const signIn = useAuthStore((state) => state.signIn);
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
      router.replace('/personalization');
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (loading) return;
    
    console.log('🟢 [Sign-In Screen] User initiated Google Sign-In');
    try {
      setLoading(true);
      console.log('🟢 [Sign-In Screen] Calling signInWithGoogle...');
      await signInWithGoogle();
      console.log('✅ [Sign-In Screen] Google Sign-In successful, navigating...');
      router.replace('/personalization');
    } catch (err: any) {
      console.error('❌ [Sign-In Screen] Google Sign-In failed:', {
        message: err?.message,
        error: err,
      });
      setErrorMessage(err.message || 'Google Sign-In failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 px-6 pt-10">
        <AuthHeader
          title="Ready to cook something amazing? Let's get you logged in."
          subtitle=""
          titleClassName="font-visby-demibold text-3xl font-medium text-black"
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
            icon={<Sms size={20} color="#8BD65E" variant="Bold" />}
          />

          <View className="gap-2">
            <AuthPasswordField
              label="Password"
              placeholder="********"
              value={password}
              onChangeText={setPassword}
              icon={<Lock size={20} color="#8BD65E" variant="Bold" />}
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
          title={loading ? 'Logging in...' : 'Login'}
          containerClassName="mt-6"
          onPress={handleSignIn}
          disabled={loading}
          icon={!loading && <Login size={20} color="#FFFFFF" variant="Bold" />}
        />

        <View className="mt-6 flex-row items-center justify-center gap-2">
          <View className="h-[1px] flex-1 bg-gray-200" />
          <Text className="font-visby-medium text-sm text-gray-500">Or continue with</Text>
          <View className="h-[1px] flex-1 bg-gray-200" />
        </View>

        <AuthSocialButton
          title="Sign in with Google"
          icon={<Google size={20} color="#000000" variant="Bold" />}
          onPress={handleGoogleSignIn}
          disabled={loading}
          containerClassName="mt-4"
        />

        <AuthFooterLink
          text="New to ReCook? "
          linkText="Create an account"
          onPress={() => router.dismissTo('/sign-up')}
          containerClassName="mt-auto flex-row items-center justify-center pb-6"
        />
      </View>

      <LoadingModal 
        visible={loading} 
        message="Signing in..." 
        subMessage="Connecting to your account"
      />
    </SafeAreaView>
  );
}
