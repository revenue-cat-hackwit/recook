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

    const timeAgo = formatDistanceToNow(new Date(post.createdAt), {
        addSuffix: true,
        locale: localeId,
    });

    return (
        <TouchableOpacity
            activeOpacity={0.95}
            onPress={() => onPress?.(post.id)}
            className="mb-3 bg-white dark:bg-gray-900 rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-800"
        >
            {/* Header */}
            <View className="flex-row items-center p-4 pb-3">
                <View className="h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                    <Image
                        source={{
                            uri: post.user.avatar || `https://ui-avatars.com/api/?name=${post.user.fullName}&background=random`,
                        }}
                        style={{ width: 40, height: 40 }}
                        contentFit="cover"
                    />
                </View>
                <View className="ml-3 flex-1">
                    <Text className="font-visby-demibold text-sm text-gray-900 dark:text-white">
                        {post.user.fullName}
                    </Text>
                    <Text className="font-visby text-xs text-gray-500 dark:text-gray-400">
                        @{post.user.username} • {timeAgo}
                    </Text>
                </View>
            </View>

            {/* Content */}
            <View className="px-4 pb-3">
                <Text className="font-visby text-sm text-gray-800 dark:text-gray-200 leading-5">
                    {post.content}
                </Text>
            </View>

            {/* Image */}
            {post.imageUrl && (
                <View className="w-full bg-gray-100 dark:bg-gray-800 relative" style={{ height: 300 }}>
                    {!imageError && (
                        <Image
                            source={{ uri: post.imageUrl }}
                            style={{ width: '100%', height: '100%' }}
                            contentFit="cover"
                            transition={300}
                            onLoadStart={() => {
                                console.log('Loading image:', post.imageUrl);
                                setImageLoading(true);
                                setImageError(false);
                            }}
                            onLoad={() => {
                                console.log('Image loaded successfully:', post.imageUrl);
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
                            <Text className="mt-2 font-visby text-xs text-gray-500 dark:text-gray-400 text-center px-4">
                                Gambar gagal dimuat
                            </Text>
                            <Text className="mt-1 font-visby text-[10px] text-gray-400 text-center px-4" numberOfLines={1}>
                                {post.imageUrl}
                            </Text>
                        </View>
                    )}
                </View>
            )}

            {/* Actions */}
            <View className="flex-row items-center px-4 py-3 border-t border-gray-100 dark:border-gray-800">
                <TouchableOpacity
                    onPress={() => onLike(post.id)}
                    className="flex-row items-center mr-6"
                    activeOpacity={0.7}
                >
                    <Ionicons
                        name={post.isLiked ? 'heart' : 'heart-outline'}
                        size={22}
                        color={post.isLiked ? '#EF4444' : '#9CA3AF'}
                    />
                    <Text className="ml-1.5 font-visby-medium text-sm text-gray-600 dark:text-gray-400">
                        {post.likesCount}
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={() => onComment(post.id)}
                    className="flex-row items-center"
                    activeOpacity={0.7}
                >
                    <Ionicons name="chatbubble-outline" size={20} color="#9CA3AF" />
                    <Text className="ml-1.5 font-visby-medium text-sm text-gray-600 dark:text-gray-400">
                        {post.commentsCount}
                    </Text>
                </TouchableOpacity>
            </View>
        </TouchableOpacity>
    );
};
