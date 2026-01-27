import { useAuthStore } from '@/lib/store/authStore';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Dimensions, FlatList, Text, TouchableOpacity, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';

export default function ProfilePage() {
  const router = useRouter();
  const userData = useAuthStore((state) => state.user?.user_metadata);
  const [activeTab, setActiveTab] = useState<'Posts' | 'Reels' | 'Recipes'>('Posts');

  // Dummy Data for Profile
  const stats = {
    following: 106,
    followers: 105,
    likes: 290,
  };

  // Dummy Content for Grid
  const gridImages = [
    'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=500&auto=format&fit=crop', // Salad
    'https://images.unsplash.com/photo-1562967963-edc4fa48d79d?q=80&w=500&auto=format&fit=crop', // Fried Chicken
    'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?q=80&w=500&auto=format&fit=crop', // Rice Bowl
    'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?q=80&w=500&auto=format&fit=crop', // Pizza
    'https://images.unsplash.com/photo-1482049016688-2d3e1b311543?q=80&w=500&auto=format&fit=crop', // Sandwich/Toast
    'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?q=80&w=500&auto=format&fit=crop', // Pancakes
    'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?q=80&w=500&auto=format&fit=crop', // Salad 2
    'https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=500&auto=format&fit=crop', // Steak
    'https://images.unsplash.com/photo-1600891964599-f61ba0e24092?q=80&w=500&auto=format&fit=crop', // Pasta
  ];

  const { width } = Dimensions.get('window');
  const ITEM_SIZE = width / 3;
  console.log(userData?.avatar_url);

  const renderHeader = () => (
    <View className="mb-4 bg-white px-4">
      {/* Profile Info */}
      <View className="mb-6 items-center">
        {/* ?t=Date.now() to prevent image caching */}
        <Image
          source={{
            uri: `${userData?.avatar_url}?t=${Date.now()}` || 'https://via.placeholder.com/150',
          }}
          style={{ width: 100, height: 100, borderRadius: 50, marginBottom: 12 }}
          contentFit="cover"
        />
        <Text className="mb-1 font-visby-bold text-xl text-black">
          {userData?.username || userData?.full_name || '-'}
        </Text>
      </View>

      {/* Stats */}
      <View className="mb-6 w-full flex-row justify-between px-8">
        <View className="items-center">
          <Text className="font-visby-bold text-lg text-black">{stats.following}</Text>
          <Text className="font-visby text-xs text-gray-500">Following</Text>
        </View>
        <View className="h-8 w-[1px] bg-gray-200" />
        <View className="items-center">
          <Text className="font-visby-bold text-lg text-black">{stats.followers}</Text>
          <Text className="font-visby text-xs text-gray-500">Followers</Text>
        </View>
        <View className="h-8 w-[1px] bg-gray-200" />
        <View className="items-center">
          <Text className="font-visby-bold text-lg text-black">{stats.likes}</Text>
          <Text className="font-visby text-xs text-gray-500">Likes</Text>
        </View>
      </View>

      {/* Action Buttons */}
      <View className="mb-6 flex-row justify-center space-x-3">
        <TouchableOpacity
          onPress={() => router.push('/profile/edit-profile')}
          className="mr-2 flex-1 items-center rounded-lg bg-[#5FD08F] px-8 py-2.5"
        >
          <Text className="font-visby-bold text-base text-white">Edit Profile</Text>
        </TouchableOpacity>
        <TouchableOpacity className="w-12 items-center justify-center rounded-lg bg-[#5FD08F] p-2.5">
          <Ionicons name="person-add-outline" size={20} color="white" />
        </TouchableOpacity>
      </View>

      {/* Bio */}
      <Text className="mb-6 px-4 text-center font-visby leading-5 text-gray-800">
        Simple, cheap & delicious cooking 🍳🔥
      </Text>

      {/* Tabs */}
      <View className="flex-row border-b border-gray-100">
        {['Posts', 'Reels', 'Recipes'].map((tab) => (
          <TouchableOpacity
            key={tab}
            onPress={() => setActiveTab(tab as any)}
            className={`flex-1 items-center border-b-2 py-3 ${
              activeTab === tab ? 'border-[#5FD08F]' : 'border-transparent'
            }`}
          >
            <Text
              className={`font-visby text-base ${
                activeTab === tab ? 'font-bold text-[#5FD08F]' : 'text-gray-400'
              }`}
            >
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  return (
    <>
      <StatusBar style="dark" />
      <FlatList
        data={gridImages}
        keyExtractor={(item, index) => index.toString()}
        numColumns={3}
        ListHeaderComponent={renderHeader}
        renderItem={({ item }) => (
          <TouchableOpacity activeOpacity={0.8}>
            <Image
              source={{ uri: item }}
              style={{
                width: ITEM_SIZE,
                height: ITEM_SIZE,
                borderColor: 'white',
                borderWidth: 1,
              }}
              contentFit="cover"
              transition={200}
            />
          </TouchableOpacity>
        )}
        showsVerticalScrollIndicator={false}
      />
    </>
  );
}
