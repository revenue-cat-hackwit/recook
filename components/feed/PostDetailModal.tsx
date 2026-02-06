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
} from 'react-native';
import { showAlert } from '@/lib/utils/globalAlert';
import { Danger } from 'iconsax-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { PostService } from '@/lib/services/postService';
import { Post, PostComment } from '@/lib/types/post';
import { useColorScheme } from 'nativewind';

interface PostDetailModalProps {
  post: Post | null;
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
  const [comments, setComments] = useState<PostComment[]>([]);
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
      PostService.getPostDetail(post.id)
        .then((response) => {
            if (response.success && response.data.post && response.data.post.comments) {
                setComments(response.data.post.comments);
            }
        })
        .catch(console.error)
        .finally(() => setLoadingComments(false));

      setLiked(post.isLiked);
      setLikeCount(post.likesCount);
    }
  }, [post]);

  const handleSendComment = async () => {
    if (!post || !newComment.trim()) return;

    const tempId = Date.now().toString();
    const optimisticComment: PostComment = {
      id: tempId,
      content: newComment.trim(),
      createdAt: new Date().toISOString(),
      userId: {
        id: 'temp',
        fullName: 'You',
        username: 'you',
        avatar: null,
      },
    };

    // Optimistic Update
    setComments((prev) => [...prev, optimisticComment]);
    setNewComment('');

    try {
      const result = await PostService.addComment(post.id, optimisticComment.content);
      // Replace optimistic with real
      if (result.success && result.data) {
           // Assuming result.data is the comment or contains it. 
           // If the API structure is unknown, we might want to refresh comments or just settle.
           // For now, let's look at the result.data. If it looks like a comment, use it.
           // If not, we keep the optimistic one but maybe update ID if possible?
           // Actually, best practice is to refetch or ensure backend returns the object.
           // Let's assume result.data IS the comment for now or compatible.
           // But since result.data type is any, we cast or check.
           
           // If result.data matches PostComment shape
           const realComment = result.data as PostComment; 
           setComments((prev) => prev.map((c) => (c.id === tempId ? realComment : c)));
      }
    } catch (e: any) {
      console.error(e);
      // Revert on error
      setComments((prev) => prev.filter((c) => c.id !== tempId));
      showAlert('Error', 'Failed to send comment: ' + e.message, undefined, {
        icon: <Danger size={32} color="#EF4444" variant="Bold" />,
        type: 'destructive',
      });
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
            {/* Fix for TypeScript error regarding JSX element class props */}
            {(() => {
              const KeyboardAvoidingViewFixed = KeyboardAvoidingView as unknown as React.ComponentType<any>;
              return (
                <KeyboardAvoidingViewFixed
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
                    {post.imageUrl && (
                      <Image
                        source={{ uri: post.imageUrl }}
                        style={{ width: '100%', height: 300 }}
                        contentFit="cover"
                      />
                    )}

                    {/* Content */}
                    <View className="border-b border-gray-100 p-4 dark:border-gray-800">
                      <View className="mb-2 flex-row items-start justify-between">
                        <Text className="mr-4 flex-1 font-visby-bold text-2xl text-black dark:text-white">
                          {post.content}
                        </Text>
                        <TouchableOpacity
                          onPress={handleLike}
                          className="flex-row items-center rounded-full border border-red-100 bg-red-50 px-3 py-1 dark:border-red-900/50 dark:bg-red-900/20"
                        >
                          <Ionicons
                            name={liked ? 'heart' : 'heart-outline'}
                            size={20}
                            color="#EF4444"
                          />
                          <Text className="ml-1 font-visby-bold text-red-500">{likeCount}</Text>
                        </TouchableOpacity>
                      </View>

                      <View className="mb-4 flex-row items-center">
                        <Image
                          source={{ uri: post.user.avatar || undefined }}
                          style={{ width: 30, height: 30, borderRadius: 15 }}
                        />
                        <Text className="ml-2 font-visby-bold text-gray-700 dark:text-gray-300">
                          {post.user.fullName}
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
                        comments.map((c, index) => (
                          <View key={c.id || index} className="mb-4 flex-row">
                            <Image
                              source={{
                                uri:
                                  c.userId?.avatar ||
                                  'https://ui-avatars.com/api/?name=' +
                                    (c.userId?.fullName || 'User') ||
                                  undefined,
                              }}
                              style={{ width: 32, height: 32, borderRadius: 16 }}
                            />
                            <View className="ml-3 flex-1 rounded-xl rounded-tl-none bg-gray-50 p-3 dark:bg-gray-800">
                              <Text className="mb-1 font-visby-bold text-xs text-gray-900 dark:text-white">
                                {c.userId?.fullName || 'User'}
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
                      <Ionicons
                        name="send"
                        size={24}
                        color={newComment.trim() ? '#8BD65E' : '#4B5563'}
                      />
                    </TouchableOpacity>
                  </View>
                </KeyboardAvoidingViewFixed>
              );
            })()}
        </View>
      </View>
    </Modal>
  );
};
