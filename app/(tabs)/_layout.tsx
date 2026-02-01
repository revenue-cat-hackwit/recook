import { Category, MessageText, VideoPlay, Book, Profile } from 'iconsax-react-native';
import { useAuthStore } from '@/lib/store/authStore';
import { usePreferencesStore } from '@/lib/store/preferencesStore';
import { Redirect, Tabs } from 'expo-router';
import React from 'react';

export default function TabsLayout() {
  const token = useAuthStore((state) => state.token);
  const hasOnboarded = usePreferencesStore((state) => state.hasOnboarded);

  if (!token) {
    return <Redirect href="/sign-in" />;
  }

  // Redirect to onboarding if user hasn't completed it
  if (!hasOnboarded) {
    return <Redirect href="/onboarding" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#8BD65E',
        tabBarInactiveTintColor: 'gray',
        tabBarStyle: {
          elevation: 0,
          shadowOpacity: 0,
          borderTopWidth: 0,
        },
      }}
    >
      <Tabs.Screen
        name="feed"
        options={{
          title: 'Feed',
          tabBarIcon: ({ color, size }) => <Category size={size} color={color} variant="Outline" />,
        }}
      />
      <Tabs.Screen
        name="chatbot"
        options={{
          title: 'Chat',
          tabBarIcon: ({ color, size }) => (
            <MessageText size={size} color={color} variant="Outline" />
          ),
          headerShown: true,
          headerShadowVisible: false,
        }}
      />
      <Tabs.Screen
        name="generate"
        options={{
          title: 'Generate',
          tabBarIcon: ({ color, size }) => (
            <VideoPlay size={size} color={color} variant="Outline" />
          ),
        }}
      />
      <Tabs.Screen
        name="recipes"
        options={{
          title: 'Kitchen',
          headerShown: false,
          tabBarIcon: ({ color, size }) => <Book size={size} color={color} variant="Outline" />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <Profile size={size} color={color} variant="Outline" />,
        }}
      />
    </Tabs>
  );
}
