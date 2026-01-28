import { useAuthStore } from '@/lib/store/authStore';
import { useRecipeStorage } from '@/lib/hooks/useRecipeStorage';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter, useFocusEffect } from 'expo-router';
import React, { useState, useCallback } from 'react';
import { PostDetailModal } from '@/components/feed/PostDetailModal';
import { CommunityService } from '@/lib/services/communityService';

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
import { useColorScheme } from 'nativewind';

// Move ITEM_SIZE outside logic to generic constant
const { width } = Dimensions.get('window');
const ITEM_SIZE = width / 3;

export default function Profile() {
  const router = useRouter();
  const session = useAuthStore((state) => state.session);
  const user = session?.user;
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [activeTab, setActiveTab] = useState<'Recipe'>('Recipe');

  // Real Data
  const { savedRecipes } = useRecipeStorage();
  // Stat State
  const [stats, setStats] = useState({
    following: 0,
    followers: 0,
    likes: 0,
    postCount: 0,
  });

  // State for Posts and Modal
  const [userPosts, setUserPosts] = useState<any[]>([]);
  const [selectedPost, setSelectedPost] = useState<any>(null);
  const [profileData, setProfileData] = useState<any>(null);

  const fetchProfile = async () => {
    if (!user?.id) return;

    // 1. Profile Data
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    if (profile) setProfileData(profile);

    // 2. Community Posts (Shared Recipes)
    const { data: posts, error } = await supabase
      .from('community_posts')
      .select('*') // Fetch all fields for detail view
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    let likes = 0;
    let postCount = 0;

    if (posts && !error) {
      // Filter valid posts
      const validPosts = posts.filter((p) => p.image_url && p.image_url.length > 5);
      setUserPosts(validPosts);

      likes = posts.reduce((sum, p) => sum + (p.likes_count || 0), 0);
      postCount = posts.length;
    }

    // 3. Follows Stats
    const { count: following } = await supabase
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('follower_id', user.id);

    const { count: followers } = await supabase
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('following_id', user.id);

    setStats({
      following: following || 0,
      followers: followers || 0,
      likes,
      postCount,
    });
  };

  useFocusEffect(
    useCallback(() => {
      fetchProfile();
    }, [user]),
  );

  // Memoized Grid Item
  const renderItem = useCallback(
    ({ item }: { item: any }) => (
      <TouchableOpacity activeOpacity={0.8} onPress={() => setSelectedPost(item)}>
        <Image
          source={{ uri: item.image_url }}
          style={{
            width: ITEM_SIZE,
            height: ITEM_SIZE,
            borderColor: isDark ? '#1F2937' : 'white',
            borderWidth: 1,
            backgroundColor: isDark ? '#374151' : '#F3F4F6',
          }}
          contentFit="cover"
          cachePolicy="memory-disk"
          // No transition to avoid flickering
        />
      </TouchableOpacity>
    ),
    [isDark],
  );

  // Memoized Header
  const renderHeader = useCallback(
    () => (
      <View className="mb-4 bg-white px-4 pt-2 dark:bg-[#0F0F0F]">
        <View className="mb-6 flex-row items-center justify-between">
          <Text className="flex-1 pt-1 font-visby-bold text-xl text-black dark:text-white">
            Profile
          </Text>
          <TouchableOpacity onPress={() => router.push('/settings')}>
            <Ionicons name="settings-outline" size={26} color={isDark ? 'white' : 'black'} />
          </TouchableOpacity>
        </View>

        {/* Profile Info */}
        <View className="mb-6 items-center">
          <Image
            source={{ uri: user?.user_metadata?.avatar_url || 'https://via.placeholder.com/150' }}
            style={{ width: 100, height: 100, borderRadius: 50, marginBottom: 12 }}
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={200}
          />
          <Text className="mb-1 font-visby-bold text-xl text-black dark:text-white">
            {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Renata'}
          </Text>
        </View>

        {/* Stats */}
        <View className="mb-6 w-full flex-row justify-between px-8">
          <View className="items-center">
            <Text className="font-visby-bold text-lg text-black dark:text-white">
              {stats.following}
            </Text>
            <Text className="font-visby text-xs text-gray-500 dark:text-gray-400">Following</Text>
          </View>
          <View className="h-8 w-[1px] bg-gray-200 dark:bg-gray-700" />
          <View className="items-center">
            <Text className="font-visby-bold text-lg text-black dark:text-white">
              {stats.followers}
            </Text>
            <Text className="font-visby text-xs text-gray-500 dark:text-gray-400">Followers</Text>
          </View>
          <View className="h-8 w-[1px] bg-gray-200 dark:bg-gray-700" />
          <View className="items-center">
            <Text className="font-visby-bold text-lg text-black dark:text-white">
              {stats.postCount}
            </Text>
            <Text className="font-visby text-xs text-gray-500 dark:text-gray-400">Recipes</Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View className="mb-6 flex-row justify-center space-x-3">
          <TouchableOpacity
            onPress={() => router.push('/edit-profile')}
            className="mr-2 flex-1 items-center rounded-lg bg-[#5FD08F] px-8 py-2.5"
          >
            <Text className="font-visby-bold text-base text-white">Edit Profile</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push('/pantry')}
            className="w-12 items-center justify-center rounded-lg bg-[#5FD08F] p-2.5"
          >
            <Ionicons name="nutrition-outline" size={20} color="white" />
          </TouchableOpacity>
        </View>

        {/* Bio */}
        <Text className="mb-4 px-4 text-center font-visby leading-5 text-gray-800 dark:text-gray-300">
          {user?.user_metadata?.bio || 'Simple, cheap & delicious cooking 🍳🔥'}
        </Text>

        {/* Personalization Tags */}
        {profileData && (
          <View className="mb-6 flex-row flex-wrap justify-center gap-2 px-4">
            {profileData.diet_goal && (
              <View className="rounded-full bg-orange-100 px-3 py-1 dark:bg-orange-900/30">
                <Text className="font-visby-bold text-xs text-orange-700 dark:text-orange-300">
                  Goal: {profileData.diet_goal}
                </Text>
              </View>
            )}
            {profileData.allergies &&
              profileData.allergies.map((allergy: string) => (
                <View
                  key={allergy}
                  className="rounded-full bg-red-100 px-3 py-1 dark:bg-red-900/30"
                >
                  <Text className="font-visby-bold text-xs text-red-700 dark:text-red-300">
                    🚫 {allergy}
                  </Text>
                </View>
              ))}
          </View>
        )}

        {/* Tabs */}
        <View className="flex-row border-b border-gray-100 dark:border-gray-800">
          {['Recipe'].map((tab) => (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveTab(tab as any)}
              className={`flex-1 items-center border-b-2 py-3 ${
                activeTab === tab ? 'border-[#5FD08F]' : 'border-transparent'
              }`}
            >
              <Text
                className={`font-visby text-base ${
                  activeTab === tab
                    ? 'font-bold text-[#5FD08F]'
                    : 'text-gray-400 dark:text-gray-500'
                }`}
              >
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    ),
    [user, stats, profileData, activeTab, isDark],
  );

  // ... inside Profile component

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-[#0F0F0F]" edges={['top']}>
      <PostDetailModal
        post={selectedPost}
        visible={!!selectedPost}
        onClose={() => setSelectedPost(null)}
        onLike={(id) => CommunityService.toggleLike(id)}
      />

      <FlatList
        data={userPosts}
        keyExtractor={(item) => item.id}
        numColumns={3}
        ListHeaderComponent={renderHeader}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={true}
        initialNumToRender={12}
        maxToRenderPerBatch={12}
        windowSize={5}
      />
    </SafeAreaView>
  );
}
