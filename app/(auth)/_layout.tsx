import { useAuthStore } from '@/lib/store/authStore';
import { Redirect, Stack } from 'expo-router';
import React from 'react';

export default function AuthLayout() {
  const token = useAuthStore((state) => state.token);

  if (token) {
    return <Redirect href="/feed" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
