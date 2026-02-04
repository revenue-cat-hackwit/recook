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

export default function Feed() {
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

    // TODO: Call API to like/unlike post
    // try {
    //   await PostService.toggleLike(postId);
    // } catch (err) {
    //   // Revert on error
    //   setPosts(prev =>
    //     prev.map(post =>
    //       post.id === postId
    //         ? {
    //             ...post,
    //             isLiked: !post.isLiked,
    //             likesCount: post.isLiked ? post.likesCount + 1 : post.likesCount - 1,
    //           }
    //         : post
    //     )
    //   );
    // }
  };

  const handleComment = (postId: string) => {
    // TODO: Navigate to post detail or open comment modal
    console.log('Comment on post:', postId);
  };

  const handlePostPress = (postId: string) => {
    // TODO: Navigate to post detail
    console.log('Open post:', postId);
  };

  if (loading && posts.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-white dark:bg-[#0F0F0F]">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#FF6B6B" />
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
            className="mt-6 rounded-full bg-[#FF6B6B] px-6 py-3"
            activeOpacity={0.8}
          >
            <Text className="font-visby-demibold text-white">Coba Lagi</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-[#0F0F0F]">
      <FlatList
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
        contentContainerStyle={{ paddingHorizontal: 16 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#FF6B6B"
            colors={['#FF6B6B']}
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListHeaderComponent={
          <>
            {/* AppBar */}
            <View className="py-4">
              <Text className="font-visby-bold text-2xl text-gray-900 dark:text-white">Feed</Text>
            </View>

            {/* Welcome Header */}
            {currentUser && (
              <View className="mb-6 rounded-3xl border border-gray-100 bg-gray-50 p-5 dark:border-gray-800 dark:bg-gray-900">
                <View className="flex-row items-center">
                  <View className="mr-4 h-14 w-14 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                    <Image
                      source={{
                        uri:
                          currentUser.avatar ||
                          `https://ui-avatars.com/api/?name=${currentUser.fullName}&background=random`,
                      }}
                      style={{ width: 56, height: 56 }}
                      contentFit="cover"
                    />
                  </View>
                  <View className="flex-1">
                    <Text className="font-visby text-sm text-gray-500 dark:text-gray-400">
                      Welcome back,
                    </Text>
                    <Text className="font-visby-bold text-xl text-gray-900 dark:text-white">
                      {currentUser.fullName}
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* Section Title */}
            <View className="mb-4">
              <Text className="font-visby-bold text-lg text-gray-900 dark:text-white">
                All Posts
              </Text>
            </View>
          </>
        }
        ListFooterComponent={
          loading && posts.length > 0 ? (
            <View className="py-4">
              <ActivityIndicator size="small" color="#FF6B6B" />
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View className="items-center justify-center py-20">
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
    </SafeAreaView>
  );
}
