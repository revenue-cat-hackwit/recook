import { useAuthStore } from '@/lib/store/authStore';
import { useSubscriptionStore } from '@/lib/store/subscriptionStore';
import { supabase } from '@/lib/supabase';
import * as Linking from 'expo-linking';
import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import '../global.css';
import { useSettingsStore } from '@/lib/store/settingsStore';

export default function RootLayout() {
  useEffect(() => {
    useSubscriptionStore.getState().initialize();
  }, []);

  useEffect(() => {
    useSettingsStore.getState().loadLanguage();
  }, []);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Supabase Auth Event:', event);

      //NOTE - Update Auth Store on Auth State Change only for INITIAL_SESSION , TOKEN_REFRESHED and USER_UPDATED because other events are handled explicitly in the Auth Store actions
      if (event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        useAuthStore.getState().setCredentials(session, session?.user ?? null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
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
  }, []);

  const handleUrl = (url: string) => {
    console.log('Auth _layout:', url);

    //NOTE - Example URL: pirinku://reset-password?token=....#access_token=....&expires_at=....&expires_in=....&refresh_token=....&token_type=bearer&type=recovery
    const isResetPassword = Linking.parse(url).hostname === 'reset-password';
    console.log('Auth _layout:', 'Is Reset Password', isResetPassword);

    if (isResetPassword) {
      useAuthStore.getState().setCredentialsFromUrl(url);
    }
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(auth)" />
      </Stack>
    </GestureHandlerRootView>
  );
}
