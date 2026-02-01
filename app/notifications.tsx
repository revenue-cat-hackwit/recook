import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'nativewind';

interface NotificationItem {
  id: string;
  type: 'like' | 'comment' | 'follow' | 'system';
  title: string;
  message: string;
  time: string;
  read: boolean;
  avatar_url?: string;
}

const MOCK_NOTIFICATIONS: NotificationItem[] = [
  {
    id: '1',
    type: 'system',
    title: 'Welcome to Pirinku!',
    message: 'Start exploring recipes and generate your first meal plan.',
    time: '2h ago',
    read: false,
  },
  {
    id: '2',
    type: 'like',
    title: 'New Like',
    message: 'Chef Renata liked your Nasi Goreng recipe.',
    time: '5h ago',
    read: false,
    avatar_url: 'https://ui-avatars.com/api/?name=Chef+Renata&background=random',
  },
  {
    id: '3',
    type: 'follow',
    title: 'New Follower',
    message: 'Budi Santoso started following you.',
    time: '1d ago',
    read: true,
    avatar_url: 'https://ui-avatars.com/api/?name=Budi+Santoso&background=random',
  },
];

export default function NotificationsScreen() {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [notifications, setNotifications] = useState(MOCK_NOTIFICATIONS);

  const renderItem = ({ item }: { item: NotificationItem }) => (
    <TouchableOpacity
      className={`mb-3 flex-row items-center rounded-2xl border p-4 ${
        item.read
          ? 'border-transparent bg-white dark:bg-[#1A1A1A]' // Read
          : 'border-[#8BD65E]/30 bg-green-50/50 dark:bg-green-900/10' // Unread
      }`}
    >
      {/* Icon/Avatar */}
      <View className="mr-4">
        {item.avatar_url ? (
          <Image
            source={{ uri: item.avatar_url }}
            style={{ width: 48, height: 48, borderRadius: 24 }}
          />
        ) : (
          <View className="h-12 w-12 items-center justify-center rounded-full bg-[#8BD65E]/10">
            <Ionicons name="notifications" size={24} color="#8BD65E" />
          </View>
        )}
        {/* Badge Icon Type */}
        <View className="absolute -bottom-1 -right-1 rounded-full border border-white bg-white p-1 dark:border-[#1A1A1A] dark:bg-[#1A1A1A]">
          {item.type === 'like' && <Ionicons name="heart" size={12} color="#EF4444" />}
          {item.type === 'follow' && <Ionicons name="person-add" size={12} color="#3B82F6" />}
          {item.type === 'comment' && <Ionicons name="chatbubble" size={12} color="#F59E0B" />}
          {item.type === 'system' && (
            <Ionicons name="information-circle" size={12} color="#8BD65E" />
          )}
        </View>
      </View>

      {/* Content */}
      <View className="flex-1">
        <View className="flex-row justify-between">
          <Text className="mb-1 font-visby-bold text-base text-gray-900 dark:text-white">
            {item.title}
          </Text>
          <Text className="font-visby text-xs text-gray-400">{item.time}</Text>
        </View>
        <Text className="font-visby text-sm text-gray-600 dark:text-gray-300" numberOfLines={2}>
          {item.message}
        </Text>
      </View>

      {!item.read && <View className="ml-2 h-2 w-2 rounded-full bg-[#8BD65E]" />}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView className="flex-1 bg-[#F9FAFB] dark:bg-[#0F0F0F]">
      {/* Header */}
      <View className="flex-row items-center justify-between px-6 py-4">
        <TouchableOpacity
          onPress={() => router.back()}
          className="rounded-full bg-white p-2 dark:bg-[#1A1A1A]"
        >
          <Ionicons name="arrow-back" size={24} color={isDark ? 'white' : 'black'} />
        </TouchableOpacity>
        <Text className="font-visby-bold text-xl text-gray-900 dark:text-white">Notifications</Text>
        <View className="w-10" />
      </View>

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 24 }}
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center py-20">
            <Ionicons name="notifications-off-outline" size={64} color="#D1D5DB" />
            <Text className="mt-4 font-visby text-gray-500">No notifications yet</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}
