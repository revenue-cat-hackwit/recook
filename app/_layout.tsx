import { useAuthStore } from '@/lib/store/authStore';
import { supabase } from '@/lib/supabase';
import { useFonts } from 'expo-font';
import * as Linking from 'expo-linking';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import '../global.css';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const setCredentials = useAuthStore((state) => state.setCredentials);
  const setCredentialsFromUrl = useAuthStore((state) => state.setCredentialsFromUrl);
  const [fontsLoaded, error] = useFonts({
    'VisbyCF-Regular': require('../assets/fonts/VisbyCF-Regular.otf'),
    'VisbyCF-Medium': require('../assets/fonts/VisbyCF-Medium.otf'),
    'VisbyCF-DemiBold': require('../assets/fonts/VisbyCF-DemiBold.otf'),
  });

  useEffect(() => {
    if (fontsLoaded || error) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, error]);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      //NOTE - Handle auth state on app launch
      if (event === 'INITIAL_SESSION') {
        const user = session?.user || null;
        setCredentials(session, user);
      }

      //NOTE - Handle user updates (e.g., password reset)
      if (event === 'USER_UPDATED') {
        const user = session?.user || null;
        setCredentials(session, user);
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

  if (!fontsLoaded && !error) {
    return null;
  }
  return <Stack screenOptions={{ headerShown: false }} />;
}
