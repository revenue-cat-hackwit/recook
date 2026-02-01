import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  TextInput,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { CommunityService, FeedPost } from '@/lib/services/communityService';
import { useColorScheme } from 'nativewind';

interface PostDetailModalProps {
  post: FeedPost | null;
  visible: boolean;
  onClose: () => void;
  onLike: (id: string) => void;
}

export const PostDetailModal: React.FC<PostDetailModalProps> = ({
  post,
  visible,
  onClose,
  onLike,
}) => {
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const insets = useSafeAreaInsets();

  // Internal like state for modal
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);

  useEffect(() => {
    if (post) {
      setLoadingComments(true);
      CommunityService.getComments(post.id)
        .then(setComments)
        .catch(console.error)
        .finally(() => setLoadingComments(false));

      setLiked(false);
      setLikeCount(post.likes_count);
    }
  }, [post]);

  const handleSendComment = async () => {
    if (!post || !newComment.trim()) return;

    const tempId = Date.now().toString();
    const optimisticComment = {
      id: tempId,
      content: newComment.trim(),
      created_at: new Date().toISOString(),
      user: {
        full_name: 'You',
        avatar_url: null,
      },
    };

    // Optimistic Update
    setComments((prev) => [...prev, optimisticComment]);
    setNewComment('');

    try {
      const realComment = await CommunityService.addComment(post.id, optimisticComment.content);
      // Replace optimistic with real
      setComments((prev) => prev.map((c) => (c.id === tempId ? realComment : c)));
    } catch (e: any) {
      console.error(e);
      // Revert on error
      setComments((prev) => prev.filter((c) => c.id !== tempId));
      Alert.alert('Error', 'Failed to send comment: ' + e.message);
    }
  };

  const handleLike = () => {
    if (!post) return;
    setLiked(!liked);
    setLikeCount((prev) => (liked ? prev - 1 : prev + 1));
    onLike(post.id);
  };

  if (!post) return null;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 bg-white dark:bg-[#0F0F0F]">
        <View className="flex-1 bg-white dark:bg-[#0F0F0F]" style={{ paddingTop: insets.top }}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1 }}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
          >
            {/* Header */}
            <View className="z-10 flex-row items-center justify-between border-b border-gray-100 bg-white px-4 py-2 dark:border-gray-800 dark:bg-[#0F0F0F]">
              <TouchableOpacity onPress={onClose}>
                <Ionicons name="arrow-back" size={24} color={isDark ? 'white' : 'black'} />
              </TouchableOpacity>
              <Text className="font-visby-bold text-lg text-black dark:text-white">Post</Text>
              <View style={{ width: 24 }} />
            </View>

            <ScrollView className="flex-1" keyboardShouldPersistTaps="handled">
              {/* Image */}
              <Image
                source={{ uri: post.image_url }}
                style={{ width: '100%', height: 300 }}
                contentFit="cover"
              />

              {/* Content */}
              <View className="border-b border-gray-100 p-4 dark:border-gray-800">
                <View className="mb-2 flex-row items-start justify-between">
                  <Text className="mr-4 flex-1 font-visby-bold text-2xl text-black dark:text-white">
                    {post.title}
                  </Text>
                  <TouchableOpacity
                    onPress={handleLike}
                    className="flex-row items-center rounded-full border border-red-100 bg-red-50 px-3 py-1 dark:border-red-900/50 dark:bg-red-900/20"
                  >
                    <Ionicons name={liked ? 'heart' : 'heart-outline'} size={20} color="#EF4444" />
                    <Text className="ml-1 font-visby-bold text-red-500">{likeCount}</Text>
                  </TouchableOpacity>
                </View>

                <View className="mb-4 flex-row items-center">
                  <Image
                    source={{ uri: post.user.avatar_url }}
                    style={{ width: 30, height: 30, borderRadius: 15 }}
                  />
                  <Text className="ml-2 font-visby-bold text-gray-700 dark:text-gray-300">
                    {post.user.full_name}
                  </Text>
                </View>
              </View>

              {/* Comments Section */}
              <View className="p-4">
                <Text className="mb-4 font-visby-bold text-sm text-gray-500 dark:text-gray-400">
                  Comments ({comments.length})
                </Text>
                {loadingComments ? (
                  <ActivityIndicator size="small" color="gray" />
                ) : comments.length === 0 ? (
                  <Text className="py-4 text-center font-visby italic text-gray-400">
                    No comments yet. Say something nice!
                  </Text>
                ) : (
                  comments.map((c) => (
                    <View key={c.id} className="mb-4 flex-row">
                      <Image
                        source={{
                          uri:
                            c.user.avatar_url ||
                            'https://ui-avatars.com/api/?name=' + c.user.full_name,
                        }}
                        style={{ width: 32, height: 32, borderRadius: 16 }}
                      />
                      <View className="ml-3 flex-1 rounded-xl rounded-tl-none bg-gray-50 p-3 dark:bg-gray-800">
                        <Text className="mb-1 font-visby-bold text-xs text-gray-900 dark:text-white">
                          {c.user.full_name}
                        </Text>
                        <Text className="font-visby text-sm text-gray-700 dark:text-gray-300">
                          {c.content}
                        </Text>
                      </View>
                    </View>
                  ))
                )}
              </View>
              <View className="h-20" />
            </ScrollView>

            {/* Comment Input */}
            <View
              className="flex-row items-center border-t border-gray-200 bg-white px-4 pt-4 dark:border-gray-800 dark:bg-[#0F0F0F]"
              style={{ paddingBottom: Math.max(insets.bottom, 16) }}
            >
              <TextInput
                value={newComment}
                onChangeText={setNewComment}
                placeholder="Add a comment..."
                className="mr-3 flex-1 rounded-full bg-gray-100 px-4 py-3 font-visby text-sm text-black dark:bg-gray-800 dark:text-white"
                placeholderTextColor="#9CA3AF"
                returnKeyType="send"
                onSubmitEditing={handleSendComment}
              />
              <TouchableOpacity onPress={handleSendComment} disabled={!newComment.trim()}>
                <Ionicons name="send" size={24} color={newComment.trim() ? '#8BD65E' : '#4B5563'} />
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </View>
    </Modal>
  );
};
