import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Post } from '@/lib/types/post';
import { formatDistanceToNow } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { useAuthStore } from '@/lib/store/authStore';
import { useViewRecipeStore } from '@/lib/store/viewRecipeStore';
import { Recipe } from '@/lib/types';
import { Book, ArrowRight } from 'iconsax-react-native';
import { useRouter } from 'expo-router';

interface FeedPostCardProps {
  post: Post;
  onLike: (postId: string) => void;
  onComment: (postId: string) => void;
  onPress?: (postId: string) => void;
  onFollow?: (userId: string, isFollowing: boolean) => void;
}

export const FeedPostCard: React.FC<FeedPostCardProps> = ({ post, onLike, onComment, onPress, onFollow }) => {
  const router = useRouter();
  const currentUser = useAuthStore((state) => state.user);
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const [showFullText, setShowFullText] = useState(false);

  const timeAgo = formatDistanceToNow(new Date(post.createdAt), {
    addSuffix: true,
    locale: localeId,
  });

  // Smart Link Parsing
  const jsonMatch = post.content.match(/\[recipe-json-start\]([\s\S]*?)\[recipe-json-end\]/);
  let recipeData: Recipe | null = null;
  if (jsonMatch) {
    try {
      recipeData = JSON.parse(jsonMatch[1]);
      console.log('Parsed recipe data:', recipeData?.title);
    } catch (e) {
      console.warn('Failed to parse recipe JSON in post', e);
    }
  }

  const oldMatch = post.content.match(/\[recipe:([^|]+)\|([^\]]+)\]/);
  const oldRecipeId = oldMatch ? oldMatch[1] : null;
  const oldRecipeTitle = oldMatch ? oldMatch[2] : null;

  const cleanContent = post.content
    .replace(/\[recipe-json-start\][\s\S]*?\[recipe-json-end\]/, '')
    .replace(/\[recipe:[^\]]+\]/g, '')
    .trim();

  const linkedRecipeTitle = recipeData?.title || oldRecipeTitle;
  const hasLinkedRecipe = !!recipeData || !!oldRecipeId;

  const MAX_TEXT_LENGTH = 150;
  const shouldTruncate = cleanContent.length > MAX_TEXT_LENGTH;
  const displayText =
    showFullText || !shouldTruncate
      ? cleanContent
      : cleanContent.substring(0, MAX_TEXT_LENGTH) + '...';

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() => onPress?.(post.id)}
      className="mx-4 mb-4 overflow-hidden rounded-3xl border border-black/15 bg-white"
    >
      {/* Header */}
      <View className="flex-row items-center justify-between p-4 pb-3">
        <View className="flex-1 flex-row items-center">
          <View className="h-12 w-12 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
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

        {/* Follow Button */}
        {currentUser?.id !== post.user.id && onFollow && (
          <TouchableOpacity
            onPress={() => onFollow(post.user.id, !!post.isFollowing)}
            className={`rounded-full px-4 py-1.5 ${
              post.isFollowing
                ? 'border border-gray-300 bg-transparent dark:border-gray-600'
                : 'bg-[#8BD65E]'
            }`}
          >
            <Text
              className={`font-visby-bold text-xs ${
                post.isFollowing
                  ? 'text-gray-600 dark:text-gray-300'
                  : 'text-white'
              }`}
            >
              {post.isFollowing ? 'Following' : 'Follow'}
            </Text>
          </TouchableOpacity>
        )}
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
        
        {/* Linked Recipe Card */}
        {hasLinkedRecipe && (
          <TouchableOpacity 
            onPress={() => {
                if (recipeData) {
                    useViewRecipeStore.getState().setRecipe(recipeData);
                    router.push('/recipe/shared');
                } else if (oldRecipeId) {
                    router.push(`/recipe/${oldRecipeId}`);
                }
            }}
            className="mt-3 flex-row items-center bg-orange-50 dark:bg-orange-900/20 p-3 rounded-xl border border-orange-100 dark:border-orange-900"
            activeOpacity={0.8}
          >
            <View className="h-10 w-10 items-center justify-center rounded-full bg-white dark:bg-orange-800 mr-3 shadow-sm">
              <Book size={20} color="#F97316" variant="Bold" />
            </View>
            <View className="flex-1">
              <Text className="font-visby text-xs text-orange-600 dark:text-orange-400 mb-0.5">Linked Recipe</Text>
              <Text className="font-visby-bold text-sm text-gray-900 dark:text-white" numberOfLines={1}>{linkedRecipeTitle}</Text>
            </View>
            <ArrowRight size={16} color="#F97316" />
          </TouchableOpacity>
        )}
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
        </View>
      </View>
    </TouchableOpacity>
  );
};
