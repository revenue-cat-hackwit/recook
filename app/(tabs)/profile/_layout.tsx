import React from 'react';
import { router, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { TouchableOpacity } from 'react-native';

export default function ProfileLayout() {
  return (
    <Stack
      screenOptions={{
        headerTitleStyle: { fontFamily: 'VisbyCF-Medium', fontSize: 20, fontWeight: 'bold' },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: 'Profile',

          headerRight: () => (
            <TouchableOpacity
              onPress={() => {
                router.push('/settings');
              }}
            >
              <Ionicons name="settings-outline" size={24} color="black" />
            </TouchableOpacity>
          ),
        }}
      />
      <Stack.Screen name="edit-profile" />
    </Stack>
  );
}
