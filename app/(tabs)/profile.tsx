import { useAuthStore } from '@/lib/store/authStore';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LanguageSelector } from '@/components/LanguageSelector';

export default function Profile() {
  const router = useRouter();
  const session = useAuthStore((state) => state.session);
  const user = session?.user;
  const setCredentials = useAuthStore((state) => state.setCredentials);
  const [activeTab, setActiveTab] = useState<'Postingan' | 'Reels' | 'Resep'>('Postingan');

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

  const handleSignOut = async () => {
    Alert.alert('Sign Out', 'Apakah kamu yakin ingin keluar?', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Keluar',
        style: 'destructive',
        onPress: async () => {
          await supabase.auth.signOut();
          setCredentials(null, null);
          router.replace('/(auth)/sign-in');
        },
      },
    ]);
  };

  const { width } = Dimensions.get('window');
  const ITEM_SIZE = width / 3;

  const renderHeader = () => (
    <View className="mb-4 bg-white px-4 pt-2">
      <View className="mb-6 flex-row items-center justify-between">
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={28} color="black" />
        </TouchableOpacity>
        <Text className="ml-4 flex-1 pt-1 font-visby-bold text-xl text-black">Profil</Text>
        <TouchableOpacity onPress={handleSignOut}>
          <Ionicons name="settings-outline" size={26} color="black" />
        </TouchableOpacity>
      </View>

      {/* Profile Info */}
      <View className="mb-6 items-center">
        <Image
          source={{ uri: user?.user_metadata?.avatar_url || 'https://via.placeholder.com/150' }}
          style={{ width: 100, height: 100, borderRadius: 50, marginBottom: 12 }}
          contentFit="cover"
        />
        <Text className="mb-1 font-visby-bold text-xl text-black">
          {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Renata'}
        </Text>
      </View>

      {/* Stats */}
      <View className="mb-6 w-full flex-row justify-between px-8">
        <View className="items-center">
          <Text className="font-visby-bold text-lg text-black">{stats.following}</Text>
          <Text className="font-visby text-xs text-gray-500">Mengikuti</Text>
        </View>
        <View className="h-8 w-[1px] bg-gray-200" />
        <View className="items-center">
          <Text className="font-visby-bold text-lg text-black">{stats.followers}</Text>
          <Text className="font-visby text-xs text-gray-500">Pengikut</Text>
        </View>
        <View className="h-8 w-[1px] bg-gray-200" />
        <View className="items-center">
          <Text className="font-visby-bold text-lg text-black">{stats.likes}</Text>
          <Text className="font-visby text-xs text-gray-500">Suka</Text>
        </View>
      </View>

      {/* Action Buttons */}
      <View className="mb-6 flex-row justify-center space-x-3">
        <TouchableOpacity
          onPress={() => router.push('/edit-profile')}
          className="mr-2 flex-1 items-center rounded-lg bg-[#5FD08F] px-8 py-2.5"
        >
          <Text className="font-visby-bold text-base text-white">Edit profil</Text>
        </TouchableOpacity>
        <TouchableOpacity className="w-12 items-center justify-center rounded-lg bg-[#5FD08F] p-2.5">
          <Ionicons name="person-add-outline" size={20} color="white" />
        </TouchableOpacity>
      </View>

      {/* Bio */}
      <Text className="mb-6 px-4 text-center font-visby leading-5 text-gray-800">
        Masak simpel, hemat, & lezat ala anak kost 🍳🔥
      </Text>

      {/* Language Settings */}
      <View className="mb-6 px-4">
        <LanguageSelector />
      </View>

      {/* Tabs */}
      <View className="flex-row border-b border-gray-100">
        {['Postingan', 'Reels', 'Resep'].map((tab) => (
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
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
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
    </SafeAreaView>
  );
}
