import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Post } from '@/lib/types/post';
import { formatDistanceToNow } from 'date-fns';
import { id as localeId } from 'date-fns/locale';

interface FeedPostCardProps {
  post: Post;
  onLike: (postId: string) => void;
  onComment: (postId: string) => void;
  onPress?: (postId: string) => void;
}

export const FeedPostCard: React.FC<FeedPostCardProps> = ({ post, onLike, onComment, onPress }) => {
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const [showFullText, setShowFullText] = useState(false);

  const timeAgo = formatDistanceToNow(new Date(post.createdAt), {
    addSuffix: true,
    locale: localeId,
  });

  const MAX_TEXT_LENGTH = 150;
  const shouldTruncate = post.content.length > MAX_TEXT_LENGTH;
  const displayText =
    showFullText || !shouldTruncate
      ? post.content
      : post.content.substring(0, MAX_TEXT_LENGTH) + '...';

  return (
    <View className="mx-4 mb-4 overflow-hidden rounded-2xl border border-[#8BD65E] bg-white shadow-sm dark:bg-gray-900">
      {/* Header */}
      <View className="flex-row items-center justify-between p-4 pb-3">
        <View className="flex-1 flex-row items-center">
          <View className="h-12 w-12 overflow-hidden rounded-full border-2 border-green-400 bg-gray-200 dark:bg-gray-700">
            <Image
              source={{
                uri:
                  post.user.avatar ||
                  `https://ui-avatars.com/api/?name=${post.user.fullName}&background=random`,
              }}
              style={{ width: 48, height: 48 }}
              contentFit="cover"
            />
          </View>
          <View className="ml-3 flex-1">
            <Text className="font-visby-bold text-base text-gray-900 dark:text-white">
              {post.user.fullName}
            </Text>
            <Text className="font-visby text-xs text-gray-500 dark:text-gray-400">
              @{post.user.username} · {timeAgo}
            </Text>
          </View>
        </View>

        {/* Three dots menu */}
        <TouchableOpacity className="p-2" activeOpacity={0.7}>
          <Ionicons name="ellipsis-horizontal" size={20} color="#9CA3AF" />
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View className="px-4 pb-3">
        <Text className="font-visby text-sm leading-5 text-gray-800 dark:text-gray-200">
          {displayText}
          {shouldTruncate && !showFullText && (
            <Text
              onPress={() => setShowFullText(true)}
              className="font-visby-demibold text-sm text-green-500"
            >
              {' '}
              See more
            </Text>
          )}
        </Text>
      </View>

      {/* Image */}
      {post.imageUrl && (
        <View
          className="relative mx-4 mb-3 overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-800"
          style={{ height: 250 }}
        >
          {!imageError && (
            <Image
              source={{ uri: post.imageUrl }}
              style={{ width: '100%', height: '100%' }}
              contentFit="cover"
              transition={300}
              onLoadStart={() => {
                setImageLoading(true);
                setImageError(false);
              }}
              onLoad={() => {
                setImageLoading(false);
              }}
              onError={(error) => {
                console.log('Image failed to load:', post.imageUrl, error);
                setImageLoading(false);
                setImageError(true);
              }}
            />
          )}

          {/* Loading indicator */}
          {imageLoading && !imageError && (
            <View className="absolute inset-0 items-center justify-center bg-gray-100 dark:bg-gray-800">
              <ActivityIndicator size="small" color="#9CA3AF" />
            </View>
          )}

          {/* Error state */}
          {imageError && (
            <View className="absolute inset-0 items-center justify-center bg-gray-100 dark:bg-gray-800">
              <Ionicons name="image-outline" size={48} color="#9CA3AF" />
              <Text className="mt-2 px-4 text-center font-visby text-xs text-gray-500 dark:text-gray-400">
                Failed to load image
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Actions */}
      <View className="flex-row items-center justify-between px-4 pb-4">
        <View className="flex-row items-center gap-4">
          {/* Like */}
          <TouchableOpacity
            onPress={() => onLike(post.id)}
            className="flex-row items-center"
            activeOpacity={0.7}
          >
            <Ionicons
              name={post.isLiked ? 'heart' : 'heart-outline'}
              size={22}
              color={post.isLiked ? '#EF4444' : '#6B7280'}
            />
            <Text className="ml-1.5 font-visby text-sm text-gray-600 dark:text-gray-400">
              {post.likesCount}
            </Text>
          </TouchableOpacity>

          {/* Comment */}
          <TouchableOpacity
            onPress={() => onComment(post.id)}
            className="flex-row items-center"
            activeOpacity={0.7}
          >
            <Ionicons name="chatbubble-outline" size={20} color="#6B7280" />
            <Text className="ml-1.5 font-visby text-sm text-gray-600 dark:text-gray-400">
              {post.commentsCount}
            </Text>
          </TouchableOpacity>

          {/* Share */}
          <TouchableOpacity className="flex-row items-center" activeOpacity={0.7}>
            <Ionicons name="paper-plane-outline" size={20} color="#6B7280" />
            <Text className="ml-1.5 font-visby text-sm text-gray-600 dark:text-gray-400">10</Text>
          </TouchableOpacity>
        </View>

        {/* Bookmark */}
        <TouchableOpacity activeOpacity={0.7}>
          <Ionicons name="bookmark-outline" size={22} color="#6B7280" />
        </TouchableOpacity>
      </View>
    </View>
  );
};
