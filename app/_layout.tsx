import { useAuthStore } from '@/lib/store/authStore';
import { supabase } from '@/lib/supabase';
import * as Linking from 'expo-linking';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import '../global.css';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const setCredentials = useAuthStore((state) => state.setCredentials);
  const setCredentialsFromUrl = useAuthStore((state) => state.setCredentialsFromUrl);
  const session = useAuthStore((state) => state.session);
  const segments = useSegments();
  const router = useRouter();

  // Font loading removed (handled by native config plugin)

  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  useEffect(() => {
    const inAuthGroup = segments[0] === '(auth)';

    if (session && inAuthGroup) {
      // User is signed in, redirect to home/feed
      router.replace('/(tabs)/feed');
    } else if (!session && !inAuthGroup) {
      // User is not signed in, redirect to sign-in
      if (segments[0] === '(tabs)') {
        router.replace('/(auth)/sign-in');
      }
    }
  }, [session, segments]);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Supabase Auth Event:', event);

      if (
        event === 'INITIAL_SESSION' ||
        event === 'SIGNED_IN' ||
        event === 'USER_UPDATED' ||
        event === 'TOKEN_REFRESHED'
      ) {
        const user = session?.user || null;
        setCredentials(session, user);
      } else if (event === 'SIGNED_OUT') {
        setCredentials(null, null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
    //FIXME - eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    (async () => {
      const initialUrl = await Linking.getInitialURL();
      console.log('Initial url', initialUrl);

      if (initialUrl) {
        handleUrl(initialUrl);
      }
    })();

    const sub = Linking.addEventListener('url', (event) => {
      handleUrl(event.url);
    });

    return () => sub.remove();
    //FIXME - eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleUrl = (url: string) => {
    console.log('Auth _layout:', url);

    //NOTE - Example URL: pirinku://reset-password?token=....#access_token=....&expires_at=....&expires_in=....&refresh_token=....&token_type=bearer&type=recovery
    const isResetPassword = Linking.parse(url).hostname === 'reset-password';
    console.log('Auth _layout:', 'Is Reset Password', isResetPassword);

    if (isResetPassword) {
      setCredentialsFromUrl(url);
    }
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="edit-profile" options={{ presentation: 'modal' }} />
      </Stack>
    </GestureHandlerRootView>
  );
}
