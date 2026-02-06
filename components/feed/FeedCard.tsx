import React, { useState, useEffect } from 'react';
import { View as RNView, Text as RNText, TouchableOpacity as RNTouchableOpacity, GestureResponderEvent } from 'react-native';

const View = RNView as any;
const Text = RNText as any;
const TouchableOpacity = RNTouchableOpacity as any;
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Post } from '@/lib/types/post';
import { useColorScheme } from 'nativewind';
import { Skeleton } from '@/components/ui/Skeleton';

const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=500&auto=format&fit=crop';

interface FeedCardProps {
  item: Post;
  isLiked?: boolean;
  onLike: () => void;
  onPress: () => void;
}

export const FeedCard: React.FC<FeedCardProps> = ({ item, isLiked = false, onLike, onPress }) => {
  const [liked, setLiked] = useState(isLiked);
  const [likes, setLikes] = useState(item.likesCount);
  const [isImageLoading, setIsImageLoading] = useState(true);
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  useEffect(() => {
    setLikes(item.likesCount);
  }, [item.likesCount]);

  useEffect(() => {
    setLiked(isLiked);
  }, [isLiked]);

  const handlePressLike = () => {
    setLiked(!liked);
    setLikes((prev) => (liked ? prev - 1 : prev + 1));
    onLike();
  };

  const hasValidImage =
    item.imageUrl && item.imageUrl.length > 10 && !item.imageUrl.includes('via.placeholder.com');
  const displayImage = hasValidImage ? item.imageUrl : FALLBACK_IMAGE;

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onPress}
      className="mb-4 rounded-2xl border border-transparent bg-white shadow-sm shadow-gray-200 dark:border-gray-800 dark:bg-gray-900 dark:shadow-none"
    >
      <View
        style={{ height: 200, width: '100%' }}
        className="relative overflow-hidden rounded-t-2xl bg-gray-100 dark:bg-gray-800"
      >
        <Image
          source={{ uri: displayImage || undefined }}
          style={{ flex: 1, width: '100%', height: '100%' }}
          contentFit="cover"
          transition={500}
          placeholder={require('@/assets/images/icon.png')} // Fallback to app icon
          placeholderContentFit="contain"
          onLoadStart={() => setIsImageLoading(true)}
          onLoad={() => setIsImageLoading(false)}
          onError={() => setIsImageLoading(false)}
        />
        {isImageLoading && (
          <View className="absolute inset-0 bg-gray-100 dark:bg-gray-800" pointerEvents="none">
            <Skeleton width="100%" height="100%" borderRadius={0} />
          </View>
        )}
        <TouchableOpacity
          onPress={(e: GestureResponderEvent) => {
            e.stopPropagation();
            handlePressLike();
          }}
          className="absolute right-2 top-2 h-8 w-8 items-center justify-center rounded-full bg-white/30 backdrop-blur-sm"
        >
          <Ionicons
            name={liked ? 'heart' : 'heart-outline'}
            size={18}
            color={liked ? '#EF4444' : 'white'}
          />
        </TouchableOpacity>
      </View>
      <View className="p-3">
        <Text
          className="mb-2 font-visby-bold text-sm leading-tight text-gray-900 dark:text-gray-100"
          numberOfLines={2}
        >
          {item.content}
        </Text>
        <View className="flex-row items-center justify-between">
          <View className="flex-1 flex-row items-center">
            <View className="h-5 w-5 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
              <Image
                source={{
                  uri:
                    item.user.avatar ||
                    'https://ui-avatars.com/api/?name=Chef&background=random',
                }}
                style={{ width: 20, height: 20 }}
              />
            </View>
            <Text
              className="ml-2 truncate font-visby text-xs text-gray-500 dark:text-gray-400"
              numberOfLines={1}
            >
              {item.user.fullName?.split(' ')[0] || 'Chef'}
            </Text>
          </View>
          <View className="ml-2 flex-row items-center">
            <Ionicons name="heart" size={10} color="#FF6B6B" />
            <Text className="ml-1 font-visby text-[10px] text-gray-400 dark:text-gray-500">
              {likes}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};
