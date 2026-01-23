import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/lib/store/authStore';
import { Redirect, Tabs } from 'expo-router';
import React from 'react';

export default function TabsLayout() {
  const session = useAuthStore((state) => state.session);

  if (!session) {
    return <Redirect href="/" />;
  }
  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: '#FF6B6B', tabBarInactiveTintColor: 'gray' }}>
      <Tabs.Screen
        name="index"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="feed"
        options={{
          title: 'Feed',
          tabBarIcon: ({ color, size }) => <Ionicons name="newspaper" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="chatbot"
        options={{
          title: 'Chat',
          tabBarIcon: ({ color, size }) => <Ionicons name="chatbubble" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="generate"
        options={{
          title: 'Generate',
          tabBarIcon: ({ color, size }) => <Ionicons name="videocam" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="store"
        options={{
          title: 'Store',
          tabBarIcon: ({ color, size }) => <Ionicons name="storefront" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <Ionicons name="person" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
