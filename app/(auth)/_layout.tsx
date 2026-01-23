import { useAuthStore } from '@/lib/store/authStore';
import { Redirect, Stack } from 'expo-router';
import React from 'react';

export default function AuthLayout() {
  const session = useAuthStore((state) => state.session);

  if (session) {
    return <Redirect href="/home" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
