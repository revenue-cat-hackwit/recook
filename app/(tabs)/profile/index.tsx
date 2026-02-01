import { useAuthStore } from '@/lib/store/authStore';
import { ProfileService } from '@/lib/services/profileService';
import { PostService } from '@/lib/services/postService';
import { ProfileUser } from '@/lib/types/auth';
import { Post, MyComment } from '@/lib/types/post';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter, useFocusEffect } from 'expo-router';
import React, { useState, useCallback } from 'react';

import {
  Alert,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColorScheme } from 'nativewind';

// Helper function to get user initials
const getInitials = (fullName?: string, username?: string): string => {
  if (fullName) {
    const names = fullName.trim().split(' ');
    if (names.length >= 2) {
      return (names[0][0] + names[names.length - 1][0]).toUpperCase();
    }
    return fullName.substring(0, 2).toUpperCase();
  }
  if (username) {
    return username.substring(0, 2).toUpperCase();
  }
  return 'U';
};

// Helper function to format date
const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 7) {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } else if (days > 0) {
    return `${days}d ago`;
  } else if (hours > 0) {
    return `${hours}h ago`;
  } else if (minutes > 0) {
    return `${minutes}m ago`;
  } else {
    return 'Just now';
  }
};

type TabType = 'My Posts' | 'Reply' | 'Saved';

export default function Profile() {
  const router = useRouter();
  const token = useAuthStore((state) => state.token);
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  // Profile Data from API
  const [profileData, setProfileData] = useState<ProfileUser | null>(null);
  const [loading, setLoading] = useState(false);

  // Tab state
  const [activeTab, setActiveTab] = useState<TabType>('My Posts');

  // Posts data
  const [myPosts, setMyPosts] = useState<Post[]>([]);
  const [myComments, setMyComments] = useState<MyComment[]>([]);
  const [savedPosts, setSavedPosts] = useState<Post[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);

  const fetchProfile = async () => {
    if (!token) return;

    try {
      setLoading(true);

      // Fetch profile from new API
      const response = await ProfileService.getProfile();
      setProfileData(response.data.user);
    } catch (error: any) {
      console.error('Failed to fetch profile:', error);
      Alert.alert('Error', error.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const fetchTabData = async (tab: TabType) => {
    if (!token) return;

    try {
      setLoadingPosts(true);

      if (tab === 'My Posts') {
        const response = await PostService.getPosts();
        // Filter posts by current user
        const userPosts = response.data.posts.filter(
          (post) => post.userId._id === profileData?.id
        );
        setMyPosts(userPosts);
      } else if (tab === 'Reply') {
        const response = await PostService.getMyComments();
        setMyComments(response.data.comments);
      } else if (tab === 'Saved') {
        const response = await PostService.getSavedPosts();
        setSavedPosts(response.data.posts);
      }
    } catch (error: any) {
      console.error('Failed to fetch tab data:', error);
    } finally {
      setLoadingPosts(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchProfile();
    }, [token]),
  );

  // Fetch tab data when tab changes or profile loads
  React.useEffect(() => {
    if (profileData) {
      fetchTabData(activeTab);
    }
  }, [activeTab, profileData]);

  const userInitials = getInitials(profileData?.fullName, profileData?.username);

  const renderPostItem = ({ item }: { item: Post }) => (
    <View className="mb-4 rounded-xl bg-gray-50 p-4 dark:bg-gray-900">
      <View className="mb-2 flex-row items-start justify-between">
        <View className="flex-1">
          <Text className="font-visby-bold text-base text-black dark:text-white">
            {item.user.fullName}
          </Text>
          <Text className="font-visby text-xs text-gray-500 dark:text-gray-400">
            @{item.user.username} · {formatDate(item.createdAt)}
          </Text>
        </View>
      </View>

      <Text className="mb-3 font-visby text-sm text-gray-800 dark:text-gray-200">
        {item.content}
      </Text>

      {item.imageUrl && (
        <Image
          source={{ uri: item.imageUrl }}
          style={{ width: '100%', height: 200, borderRadius: 12, marginBottom: 12 }}
          contentFit="cover"
        />
      )}

      <View className="flex-row items-center gap-4">
        <View className="flex-row items-center gap-1">
          <Ionicons name="heart-outline" size={18} color={isDark ? '#9CA3AF' : '#6B7280'} />
          <Text className="font-visby text-xs text-gray-600 dark:text-gray-400">
            {item.likesCount}
          </Text>
        </View>
        <View className="flex-row items-center gap-1">
          <Ionicons name="chatbubble-outline" size={18} color={isDark ? '#9CA3AF' : '#6B7280'} />
          <Text className="font-visby text-xs text-gray-600 dark:text-gray-400">
            {item.commentsCount}
          </Text>
        </View>
      </View>
    </View>
  );

  const renderCommentItem = ({ item }: { item: MyComment }) => (
    <View className="mb-4 rounded-xl bg-gray-50 p-4 dark:bg-gray-900">
      <View className="mb-2">
        <Text className="font-visby text-xs text-gray-500 dark:text-gray-400">
          Replied to @{item.post.user.username} · {formatDate(item.createdAt)}
        </Text>
      </View>

      <Text className="mb-3 font-visby text-sm text-gray-800 dark:text-gray-200">
        {item.content}
      </Text>

      <View className="rounded-lg border-l-2 border-[#8BD65E] bg-white/50 p-3 dark:bg-black/20">
        <Text className="font-visby-bold text-xs text-gray-700 dark:text-gray-300">
          {item.post.user.fullName}
        </Text>
        <Text className="font-visby text-xs text-gray-600 dark:text-gray-400" numberOfLines={2}>
          {item.post.content}
        </Text>
      </View>
    </View>
  );

  const renderTabContent = () => {
    if (loadingPosts) {
      return (
        <View className="py-8">
          <ActivityIndicator size="large" color="#8BD65E" />
        </View>
      );
    }

    if (activeTab === 'My Posts') {
      if (myPosts.length === 0) {
        return (
          <View className="items-center py-12">
            <Ionicons name="document-text-outline" size={48} color="#9CA3AF" />
            <Text className="mt-3 font-visby text-gray-500 dark:text-gray-400">
              No posts yet
            </Text>
          </View>
        );
      }
      return <FlatList data={myPosts} renderItem={renderPostItem} keyExtractor={(item) => item._id} scrollEnabled={false} />;
    }

    if (activeTab === 'Reply') {
      if (myComments.length === 0) {
        return (
          <View className="items-center py-12">
            <Ionicons name="chatbubbles-outline" size={48} color="#9CA3AF" />
            <Text className="mt-3 font-visby text-gray-500 dark:text-gray-400">
              No comments yet
            </Text>
          </View>
        );
      }
      return <FlatList data={myComments} renderItem={renderCommentItem} keyExtractor={(item, index) => `${item.post.id}-${index}`} scrollEnabled={false} />;
    }

    if (activeTab === 'Saved') {
      if (savedPosts.length === 0) {
        return (
          <View className="items-center py-12">
            <Ionicons name="bookmark-outline" size={48} color="#9CA3AF" />
            <Text className="mt-3 font-visby text-gray-500 dark:text-gray-400">
              No saved posts yet
            </Text>
          </View>
        );
      }
      return <FlatList data={savedPosts} renderItem={renderPostItem} keyExtractor={(item) => item._id} scrollEnabled={false} />;
    }

    return null;
  };

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-[#0F0F0F]" edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View className="bg-white px-4 pt-2 dark:bg-[#0F0F0F]">
          {/* Header */}
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
            {profileData?.avatar ? (
              <Image
                source={{ uri: profileData.avatar }}
                style={{ width: 100, height: 100, borderRadius: 50, marginBottom: 12 }}
                contentFit="cover"
                cachePolicy="memory-disk"
                transition={200}
              />
            ) : (
              <View
                className="mb-3 items-center justify-center rounded-full bg-[#8BD65E]"
                style={{ width: 100, height: 100 }}
              >
                <Text className="font-visby-bold text-4xl text-white">
                  {userInitials}
                </Text>
              </View>
            )}
            <Text className="mb-1 font-visby-bold text-xl text-black dark:text-white">
              {profileData?.fullName || profileData?.username || 'User'}
            </Text>
            <Text className="font-visby text-sm text-gray-500 dark:text-gray-400">
              @{profileData?.username || 'username'}
            </Text>
          </View>

          {/* Stats */}
          <View className="mb-6 w-full flex-row justify-between px-8">
            <View className="items-center">
              <Text className="font-visby-bold text-lg text-black dark:text-white">
                {profileData?.followingCount || 0}
              </Text>
              <Text className="font-visby text-xs text-gray-500 dark:text-gray-400">Following</Text>
            </View>
            <View className="h-8 w-[1px] bg-gray-200 dark:bg-gray-700" />
            <View className="items-center">
              <Text className="font-visby-bold text-lg text-black dark:text-white">
                {profileData?.followersCount || 0}
              </Text>
              <Text className="font-visby text-xs text-gray-500 dark:text-gray-400">Followers</Text>
            </View>
            <View className="h-8 w-[1px] bg-gray-200 dark:bg-gray-700" />
            <View className="items-center">
              <Text className="font-visby-bold text-lg text-black dark:text-white">
                {profileData?.postsCount || 0}
              </Text>
              <Text className="font-visby text-xs text-gray-500 dark:text-gray-400">Posts</Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View className="mb-6 flex-row justify-center space-x-3">
            <TouchableOpacity
              onPress={() => router.push('/edit-profile')}
              className="mr-2 flex-1 items-center rounded-lg bg-[#8BD65E] px-8 py-2.5"
            >
              <Text className="font-visby-bold text-base text-white">Edit Profile</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push('/pantry')}
              className="w-12 items-center justify-center rounded-lg bg-[#8BD65E] p-2.5"
            >
              <Ionicons name="nutrition-outline" size={20} color="white" />
            </TouchableOpacity>
          </View>

          {/* Bio */}
          {profileData?.bio && (
            <Text className="mb-6 px-4 text-center font-visby leading-5 text-gray-800 dark:text-gray-300">
              {profileData.bio}
            </Text>
          )}

          {/* Tabs */}
          <View className="mb-4 flex-row border-b border-gray-100 dark:border-gray-800">
            {(['My Posts', 'Reply', 'Saved'] as TabType[]).map((tab) => (
              <TouchableOpacity
                key={tab}
                onPress={() => setActiveTab(tab)}
                className={`flex-1 items-center border-b-2 py-3 ${activeTab === tab ? 'border-[#8BD65E]' : 'border-transparent'
                  }`}
              >
                <Text
                  className={`font-visby text-sm ${activeTab === tab
                      ? 'font-bold text-[#8BD65E]'
                      : 'text-gray-400 dark:text-gray-500'
                    }`}
                >
                  {tab}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Tab Content */}
          {renderTabContent()}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
