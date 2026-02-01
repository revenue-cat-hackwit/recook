import { useAuthStore } from '@/lib/store/authStore';
import { useSubscriptionStore } from '@/lib/store/subscriptionStore';
import { Stack } from 'expo-router';
import { useEffect } from 'react';
import '../global.css';
import { useSettingsStore } from '@/lib/store/settingsStore';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  useEffect(() => {
    useSettingsStore.getState().loadTheme();
  }, []);

  useEffect(() => {
    useSubscriptionStore.getState().initialize();
  }, []);

  useEffect(() => {
    useSettingsStore.getState().loadLanguage();
  }, []);

  // Initialize auth from stored JWT token
  useEffect(() => {
    useAuthStore.getState().initializeAuth();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="dark" backgroundColor="#ffffff" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="edit-profile" options={{ presentation: 'modal' }} />
        <Stack.Screen name="shopping-list" options={{ presentation: 'modal' }} />
        <Stack.Screen name="meal-planner" options={{ presentation: 'modal' }} />
        <Stack.Screen name="pantry" options={{ presentation: 'modal' }} />
      </Stack>
    </GestureHandlerRootView>
  );
}
