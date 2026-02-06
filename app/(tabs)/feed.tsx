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
import { PostCommentsModal } from '@/components/feed/PostCommentsModal';
import { CreatePostModal } from '@/components/feed/CreatePostModal';
import { Notification, Setting2, Danger, DocumentText, Refresh, MagicStar, Add } from 'iconsax-react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { ProButton } from '@/components/ProButton';

export default function Feed() {
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [commentModalVisible, setCommentModalVisible] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [createPostModalVisible, setCreatePostModalVisible] = useState(false);

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
    // Store previous state for rollback
    const previousPosts = [...posts];
    const post = posts.find((p) => p.id === postId);
    if (!post) return;

    // Optimistic update
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? {
              ...p,
              isLiked: !p.isLiked,
              likesCount: p.isLiked ? p.likesCount - 1 : p.likesCount + 1,
            }
          : p,
      ),
    );

    // Call API
    try {
      await PostService.likePost(postId);
    } catch (error) {
      // Rollback on error
      setPosts(previousPosts);
      console.error('Error liking post:', error);
      // Optional: Show error toast to user
    }
  };

  const handleComment = (postId: string) => {
    setSelectedPostId(postId);
    setCommentModalVisible(true);
  };

  const handleCommentAdded = () => {
    // Refresh the feed to get updated comment counts
    fetchFeeds(1, true);
  };

  const handleCreatePost = async (content: string, imageUrl?: string) => {
    try {
      await PostService.createPost(content, imageUrl);
      // Refresh the feed to show the new post
      fetchFeeds(1, true);
    } catch (error) {
      console.error('Error creating post:', error);
      throw error;
    }
  };

  const handlePostPress = (postId: string) => {
    // TODO: Navigate to post detail
    console.log('Open post:', postId);
  };

  const handleGenerateRecipe = () => {
    router.push('/(tabs)/generate');
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
          <Danger size={64} color="#EF4444" variant="Outline" />
          <Text className="mt-4 text-center font-visby-bold text-lg text-gray-900 dark:text-white">
            failed loading Feeds
          </Text>
          <Text className="mt-2 text-center font-visby text-sm text-gray-500 dark:text-gray-400">
            {error}
          </Text>
          <TouchableOpacity
            onPress={() => fetchFeeds(1)}
            className="mt-6 rounded-full bg-[#8BC34A] px-6 py-3 flex-row items-center gap-2"
            activeOpacity={0.8}
          >
            <Refresh size={20} color="#FFFFFF" variant="Outline" />
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
            {/* AppBar */}
            <SafeAreaView edges={['top']}>
              <View className="flex-row items-center justify-between bg-white px-4 pb-3 pt-2">
                <Text className="font-visby-bold text-xl text-[#8BD65E]">Feed</Text>
                <View className="flex-row items-center gap-3">
                  <TouchableOpacity
                    className="h-10 w-10 items-center justify-center rounded-full bg-gray-100"
                    activeOpacity={0.7}
                    onPress={() => router.push('/notifications')}
                  >
                    <Notification size={20} color="#666" variant="Outline" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    className="h-10 w-10 items-center justify-center rounded-full bg-gray-100"
                    activeOpacity={0.7}
                    onPress={() => router.push('/settings')}
                  >
                    <Setting2 size={20} color="#666" variant="Outline" />
                  </TouchableOpacity>
                  {/* <ProButton /> */}
                </View>
              </View>
            </SafeAreaView>

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
              <View>
                {/* Top Bar: Welcome Section */}
                {currentUser && (
                  <View className="px-4">
                    {/* Welcome Section */}
                    <TouchableOpacity
                      className="flex-row items-center"
                      activeOpacity={0.7}
                      onPress={() => router.push('/(tabs)/profile')}
                    >
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
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>

            {/* Generate Your Recipe Card - extends below background */}
            <View
              style={{
                marginTop: -80,
                paddingHorizontal: 16,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.25,
                shadowRadius: 3.84,
                elevation: 5,
              }}
            >
              <TouchableOpacity
                onPress={handleGenerateRecipe}
                activeOpacity={0.8}
                className="overflow-hidden rounded-3xl border border-black/15"
              >
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
                  flexDirection: 'row',
                  alignItems: 'center',
                  // shadowColor: '#000',
                  // shadowOffset: { width: 0, height: 2 },
                  // shadowOpacity: 0.1,
                  // shadowRadius: 4,
                  // elevation: 3,
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
                      borderRadius: 9999,
                      alignSelf: 'flex-start',
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 8,
                    }}
                    activeOpacity={0.8}
                  >
                    <MagicStar size={20} color="#FFFFFF" variant="Bold" />
                    <Text className="font-visby-demibold text-lg text-white">Let&apos;s Try</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Section Title */}
            <View className="mb-4 mt-6 px-4">
              <View className="flex-row items-center justify-between">
                <Text className="font-visby-bold text-lg text-gray-900 dark:text-white">
                  Your Feed
                </Text>
                {/* <TouchableOpacity>
                  <Text className="font-visby text-sm text-[#8BC34A]">See All</Text>
                </TouchableOpacity> */}
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
            <DocumentText size={64} color="#9CA3AF" variant="Outline" />
            <Text className="mt-4 font-visby-bold text-lg text-gray-900 dark:text-white">
              Belum Ada Post
            </Text>
            <Text className="mt-2 text-center font-visby text-sm text-gray-500 dark:text-gray-400">
              Jadilah yang pertama membuat post!
            </Text>
          </View>
        }
      />

      {/* Floating Action Button */}
      <TouchableOpacity
        onPress={() => setCreatePostModalVisible(true)}
        className="absolute bottom-6 right-6 flex-row items-center gap-2 rounded-full bg-[#8BC34A] px-5 py-4 shadow-lg shadow-black/25"
        activeOpacity={0.8}
        style={{
          elevation: 8,
        }}
      >
        <Add size={24} color="white" variant="Bold" />
        <Text className="font-visby-bold text-base text-white">New Post</Text>
      </TouchableOpacity>

      {/* Post Comments Modal */}
      <PostCommentsModal
        visible={commentModalVisible}
        onClose={() => {
          setCommentModalVisible(false);
          setSelectedPostId(null);
        }}
        postId={selectedPostId}
        onCommentAdded={handleCommentAdded}
      />

      {/* Create Post Modal */}
      <CreatePostModal
        visible={createPostModalVisible}
        onClose={() => setCreatePostModalVisible(false)}
        onSubmit={handleCreatePost}
      />
    </View>
  );
}
