import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  RefreshControl,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/lib/store/authStore';
import { useRecipeStorage } from '@/lib/hooks/useRecipeStorage';
import { CommunityService, FeedPost } from '@/lib/services/communityService';
import { useRouter } from 'expo-router';
import { useColorScheme } from 'nativewind';

// Import extracted components
import { FeedCard } from '@/components/feed/FeedCard';
import { PostDetailModal } from '@/components/feed/PostDetailModal';

const { width } = Dimensions.get('window');
const COLUMN_WIDTH = (width - 48) / 2;

export default function Feed() {
  const router = useRouter();
  const [activeCategory, setActiveCategory] = useState('For You');
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  // Modal State
  const [selectedPost, setSelectedPost] = useState<FeedPost | null>(null);

  const session = useAuthStore((state) => state.session);
  const userName = session?.user?.user_metadata?.full_name?.split(' ')[0] || 'Chef';

  const { savedRecipes } = useRecipeStorage();
  const recipeCount = savedRecipes.length;

  let chefLevel = 'Kitchen Novice 🥬';
  if (recipeCount >= 10) chefLevel = 'Sous Chef 👨‍🍳';
  else if (recipeCount >= 3) chefLevel = 'Home Cook 🍳';

  // Feed State
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [likedPostIds, setLikedPostIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadFeed = useCallback(async () => {
    try {
      const [feedData, likedIds] = await Promise.all([
        CommunityService.getFeed(),
        CommunityService.getMyLikedPostIds(),
      ]);
      setPosts(feedData);
      setLikedPostIds(new Set(likedIds));
    } catch (e) {
      console.log('Failed to load feed');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadFeed();
  }, [loadFeed]);

  const onRefresh = () => {
    setRefreshing(true);
    loadFeed();
  };

  const categories = ['For You', 'Following', 'Breakfast', 'Diet', 'Spicy'];

  const [searchQuery, setSearchQuery] = useState(''); // Search State

  // Filter Logic
  const filteredPosts = posts.filter((p) => {
    // 1. Check Search Query
    const matchesSearch =
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.user.full_name.toLowerCase().includes(searchQuery.toLowerCase());

    // 2. Check Category
    let matchesCategory = true;
    if (activeCategory !== 'For You' && activeCategory !== 'Following') {
      matchesCategory = p.title.toLowerCase().includes(activeCategory.toLowerCase());
    }
    return matchesSearch && matchesCategory;
  });

  const leftColumn = filteredPosts.filter((_, i) => i % 2 === 0);
  const rightColumn = filteredPosts.filter((_, i) => i % 2 !== 0);

  return (
    <SafeAreaView className="flex-1 bg-[#F9FAFB] dark:bg-[#0F0F0F]">
      <PostDetailModal
        post={selectedPost}
        visible={!!selectedPost}
        onClose={() => setSelectedPost(null)}
        onLike={(id) => CommunityService.toggleLike(id)}
      />

      {/* Header Gamified */}
      <View className="z-10 mb-4 rounded-b-[24px] bg-white px-5 pb-4 pt-2 shadow-sm shadow-gray-100 dark:bg-[#1A1A1A] dark:shadow-none">
        <View className="mb-4 flex-row items-center justify-between">
          <View>
            <Text className="font-visby text-sm text-gray-500 dark:text-gray-400">
              Good Morning, {userName}
            </Text>
            <View className="flex-row items-center gap-2">
              <Text className="font-visby-bold text-2xl text-gray-900 dark:text-white">
                Pirinku Social
              </Text>
              <View className="rounded-full border border-red-100 bg-red-50 px-2 py-0.5 dark:border-red-900/50 dark:bg-red-900/30">
                <Text className="font-visby-bold text-[10px] text-red-500 dark:text-red-300">
                  {chefLevel}
                </Text>
              </View>
            </View>
          </View>
          <TouchableOpacity
            onPress={() => router.push('/notifications')}
            className="relative rounded-full border border-gray-100 bg-gray-50 p-2 dark:border-gray-700 dark:bg-gray-800"
          >
            <Ionicons name="notifications-outline" size={22} color={isDark ? 'white' : 'black'} />
            {recipeCount > 0 && (
              <View className="absolute right-0 top-0 h-3 w-3 rounded-full border border-white bg-[#8BD65E] dark:border-gray-800" />
            )}
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View className="mb-4 flex-row items-center rounded-full bg-gray-100 px-4 py-3 dark:bg-gray-800">
          <Ionicons name="search" size={18} color="#9CA3AF" />
          <TextInput
            placeholder="Search viral recipes..."
            placeholderTextColor="#9CA3AF"
            className="ml-2 flex-1 font-visby text-gray-900 dark:text-white"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>

        {/* Categories */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-1">
          {categories.map((cat, idx) => (
            <TouchableOpacity
              key={idx}
              onPress={() => setActiveCategory(cat)}
              className={`mr-2 rounded-full border px-5 py-2 ${
                activeCategory === cat
                  ? 'border-[#1E1F20] bg-[#1E1F20] dark:border-white dark:bg-white'
                  : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800'
              }`}
            >
              <Text
                className={`font-visby text-sm ${
                  activeCategory === cat
                    ? 'text-white dark:text-black'
                    : 'text-gray-600 dark:text-gray-300'
                }`}
              >
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Main Feed */}
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#8BD65E" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {posts.length === 0 ? (
            <View className="items-center justify-center py-20">
              <Ionicons name="people-outline" size={48} color="#ddd" />
              <Text className="mt-4 font-visby text-gray-500 dark:text-gray-400">
                No posts yet. Be the first!
              </Text>
              <TouchableOpacity
                onPress={() => router.push('/(tabs)/generate')}
                className="mt-4 rounded-full bg-black px-6 py-3 dark:bg-white"
              >
                <Text className="font-visby-bold text-white dark:text-black">Create Recipe</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View className="flex-row justify-between">
              <View style={{ width: COLUMN_WIDTH }}>
                {leftColumn.map((item) => (
                  <FeedCard
                    key={item.id}
                    item={item}
                    isLiked={likedPostIds.has(item.id)}
                    onLike={() => CommunityService.toggleLike(item.id)}
                    onPress={() => setSelectedPost(item)}
                  />
                ))}
              </View>
              <View style={{ width: COLUMN_WIDTH }}>
                {rightColumn.map((item) => (
                  <FeedCard
                    key={item.id}
                    item={item}
                    isLiked={likedPostIds.has(item.id)}
                    onLike={() => CommunityService.toggleLike(item.id)}
                    onPress={() => setSelectedPost(item)}
                  />
                ))}

                <View className="mb-4 h-[200px] items-center justify-center rounded-2xl bg-[#8BD65E] p-4">
                  <Ionicons name="sparkles" size={32} color="white" />
                  <Text className="mt-2 text-center font-visby-bold text-lg text-white">
                    Generate Recipe?
                  </Text>
                  <TouchableOpacity
                    onPress={() => router.push('/(tabs)/generate')}
                    className="mt-3 rounded-full bg-white px-4 py-2"
                  >
                    <Text className="font-visby-bold text-xs text-[#8BD65E]">Start Cooking</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
        </ScrollView>
      )}

      {/* FAB: Publish */}
      <TouchableOpacity
        onPress={() => router.push('/(tabs)/generate')}
        className="absolute bottom-6 right-6 h-14 w-14 items-center justify-center rounded-full bg-[#1E1F20] shadow-lg shadow-black/30 dark:bg-white"
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={30} color={isDark ? 'black' : 'white'} />
      </TouchableOpacity>
    </SafeAreaView>
  );
}
