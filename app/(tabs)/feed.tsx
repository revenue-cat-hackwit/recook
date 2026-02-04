// @/app/(tabs)/feed.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PostService } from '@/lib/services/postService';
import { Post, CurrentUser } from '@/lib/types/post';
import { FeedPostCard } from '@/components/feed/FeedPostCard';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';

export default function Feed() {
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const fetchFeeds = async (pageNum: number = 1, isRefresh: boolean = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else if (pageNum === 1) {
        setLoading(true);
      }

      setError(null);
      const response = await PostService.getFeeds(pageNum, 10);

      // Set current user on first load
      if (pageNum === 1 && response.data.currentUser) {
        setCurrentUser(response.data.currentUser);
      }

      if (isRefresh || pageNum === 1) {
        setPosts(response.data.posts);
      } else {
        setPosts((prev) => [...prev, ...response.data.posts]);
      }

      setHasMore(response.data.pagination.hasNextPage);
      setPage(pageNum);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load feeds');
      console.error('Error fetching feeds:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchFeeds(1);
  }, []);

  const handleRefresh = useCallback(() => {
    fetchFeeds(1, true);
  }, []);

  const handleLoadMore = useCallback(() => {
    if (!loading && hasMore) {
      fetchFeeds(page + 1);
    }
  }, [loading, hasMore, page]);

  const handleLike = async (postId: string) => {
    // Optimistic update
    setPosts((prev) =>
      prev.map((post) =>
        post.id === postId
          ? {
              ...post,
              isLiked: !post.isLiked,
              likesCount: post.isLiked ? post.likesCount - 1 : post.likesCount + 1,
            }
          : post,
      ),
    );
  };

  const handleComment = (postId: string) => {
    // TODO: Navigate to post detail or open comment modal
    console.log('Comment on post:', postId);
  };

  const handlePostPress = (postId: string) => {
    // TODO: Navigate to post detail
    console.log('Open post:', postId);
  };

  const handleGenerateRecipe = () => {
    router.push('/(tabs)/chat');
  };

  if (loading && posts.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-white dark:bg-[#0F0F0F]">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#8BC34A" />
          <Text className="mt-3 font-visby text-sm text-gray-500 dark:text-gray-400">
            Loading feeds...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error && posts.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-white dark:bg-[#0F0F0F]">
        <View className="flex-1 items-center justify-center px-6">
          <Ionicons name="alert-circle-outline" size={64} color="#EF4444" />
          <Text className="mt-4 text-center font-visby-bold text-lg text-gray-900 dark:text-white">
            failed loading Feeds
          </Text>
          <Text className="mt-2 text-center font-visby text-sm text-gray-500 dark:text-gray-400">
            {error}
          </Text>
          <TouchableOpacity
            onPress={() => fetchFeeds(1)}
            className="mt-6 rounded-full bg-[#8BC34A] px-6 py-3"
            activeOpacity={0.8}
          >
            <Text className="font-visby-demibold text-white">Coba Lagi</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View className="flex-1 bg-white dark:bg-[#0F0F0F]">
      <FlatList
        style={{ paddingHorizontal: 0, marginHorizontal: 0 }}
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <FeedPostCard
            post={item}
            onLike={handleLike}
            onComment={handleComment}
            onPress={handlePostPress}
          />
        )}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#8BC34A"
            colors={['#8BC34A']}
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListHeaderComponent={
          <>
            {/* Background Section with fixed height */}
            <View
              style={{
                position: 'relative',
                height: 150,
                width: '100%',
                marginLeft: 0,
                marginRight: 0,
                paddingLeft: 0,
                paddingRight: 0,
              }}
            >
              <SafeAreaView edges={['top']}>
                <View className="pt-2">
                  {/* Top Bar: Welcome, Notifications, Settings */}
                  {currentUser && (
                    <View className="mb-4 flex-row items-center justify-between px-4">
                      {/* Welcome Section */}
                      <View className="flex-1 flex-row items-center">
                        <View className="mr-3 h-12 w-12 overflow-hidden rounded-full bg-gray-200">
                          <Image
                            source={{
                              uri:
                                currentUser.avatar ||
                                `https://ui-avatars.com/api/?name=${currentUser.fullName}&background=random`,
                            }}
                            style={{ width: 48, height: 48 }}
                            contentFit="cover"
                          />
                        </View>
                        <View>
                          <Text className="font-visby text-xs text-gray-700">Welcome</Text>
                          <Text className="font-visby-bold text-base text-gray-900">
                            {currentUser.fullName}
                          </Text>
                        </View>
                      </View>

                      {/* Icons: Notifications & Settings */}
                      <View className="flex-row items-center gap-3">
                        <TouchableOpacity
                          className="h-10 w-10 items-center justify-center rounded-full bg-[#8BC34A]"
                          activeOpacity={0.7}
                        >
                          <Ionicons name="notifications-outline" size={20} color="#FFFFFF" />
                        </TouchableOpacity>
                        <TouchableOpacity
                          className="h-10 w-10 items-center justify-center rounded-full bg-[#8BC34A]"
                          activeOpacity={0.7}
                        >
                          <Ionicons name="settings-outline" size={20} color="#FFFFFF" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                </View>
              </SafeAreaView>
            </View>

            {/* Generate Your Recipe Card - extends below background */}
            <View
              style={{
                marginTop: -60,
                paddingHorizontal: 16,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.25,
                shadowRadius: 3.84,
                elevation: 5,
              }}
            >
              <TouchableOpacity onPress={handleGenerateRecipe} activeOpacity={0.8}>
                <Image
                  source={{
                    uri: 'https://pxhoqlzgkyflqlaixzkv.supabase.co/storage/v1/object/public/images/dashboardopening.svg',
                  }}
                  style={{ width: '100%', height: 180 }}
                  contentFit="cover"
                />
              </TouchableOpacity>
            </View>

            {/* Cook with Cooki Card */}
            <View style={{ marginTop: 16, paddingHorizontal: 16 }}>
              <View
                style={{
                  backgroundColor: 'white',
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: '#9AEE68',
                  padding: 16,
                  flexDirection: 'row',
                  alignItems: 'center',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.1,
                  shadowRadius: 4,
                  elevation: 3,
                }}
              >
                {/* Cooki Avatar */}
                <View
                  style={{
                    width: 75,
                    height: 75,
                    borderRadius: 100,
                    backgroundColor: '#FFFFFF',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 12,
                    overflow: 'hidden',
                  }}
                >
                  <Image
                    source={require('@/assets/images/cooki.png')}
                    style={{ width: 75, height: 75 }}
                    contentFit="contain"
                  />
                </View>

                {/* Text Content and Button */}
                <View style={{ flex: 1, flexDirection: 'column' }}>
                  <Text className="text-md mb-2 font-visby text-gray-900">
                    Cook with Cooki, an AI assistant ready to create recipes according to your
                    preferences.
                  </Text>

                  {/* Let's Try Button */}
                  <TouchableOpacity
                    onPress={handleGenerateRecipe}
                    style={{
                      backgroundColor: '#8BD65E',
                      paddingHorizontal: 16,
                      paddingVertical: 8,
                      borderRadius: 10,
                      alignSelf: 'flex-start',
                    }}
                    activeOpacity={0.8}
                  >
                    <Text className="font-visby-demibold text-lg text-white">Let&apos;s Try</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Section Title */}
            <View className="mb-4 mt-6 px-4">
              <View className="flex-row items-center justify-between">
                <Text className="font-visby-bold text-lg text-gray-900 dark:text-white">
                  New post
                </Text>
                <TouchableOpacity>
                  <Text className="font-visby text-sm text-[#8BC34A]">See All</Text>
                </TouchableOpacity>
              </View>
            </View>
          </>
        }
        contentContainerStyle={{ paddingBottom: 16, paddingHorizontal: 0 }}
        ListFooterComponent={
          loading && posts.length > 0 ? (
            <View className="py-4">
              <ActivityIndicator size="small" color="#8BC34A" />
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View className="items-center justify-center px-4 py-20">
            <Ionicons name="document-text-outline" size={64} color="#9CA3AF" />
            <Text className="mt-4 font-visby-bold text-lg text-gray-900 dark:text-white">
              Belum Ada Post
            </Text>
            <Text className="mt-2 text-center font-visby text-sm text-gray-500 dark:text-gray-400">
              Jadilah yang pertama membuat post!
            </Text>
          </View>
        }
      />
    </View>
  );
}
