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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'nativewind';
import { PostService } from '@/lib/services/postService';
import { formatDistanceToNow } from 'date-fns';
import { id as localeId } from 'date-fns/locale';

interface PostCommentsModalProps {
  visible: boolean;
  onClose: () => void;
  postId: string | null;
  onCommentAdded?: () => void;
  autoFocus?: boolean; // New prop
}

export const PostCommentsModal: React.FC<PostCommentsModalProps> = ({
  visible,
  onClose,
  postId,
  onCommentAdded,
  autoFocus = false,
}) => {
  const [post, setPost] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const insets = useSafeAreaInsets();
  const inputRef = React.useRef<TextInput>(null);

  useEffect(() => {
    if (visible && postId) {
      fetchPostDetail();
      if (autoFocus) {
         // Tiny delay to ensure modal animation doesn't glitch focus
         setTimeout(() => {
            inputRef.current?.focus();
         }, 300);
      }
    }
  }, [visible, postId, autoFocus]);

  // ... (rest of component: fetchPostDetail, handleSubmitComment, handleClose, if !visible)


  const fetchPostDetail = async () => {
    if (!postId) return;
    
    setLoading(true);
    try {
      const response = await PostService.getPostDetail(postId);
      const postData = response.data.post;
      setPost(postData);
      setComments(postData.comments || []);
    } catch (error) {
      console.error('Error fetching post detail:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitComment = async () => {
    if (!newComment.trim() || !postId || submitting) return;

    setSubmitting(true);
    try {
      await PostService.addComment(postId, newComment.trim());
      setNewComment('');
      // Refresh post detail to get updated comments
      await fetchPostDetail();
      onCommentAdded?.();
    } catch (error) {
      console.error('Error submitting comment:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setNewComment('');
    setPost(null);
    setComments([]);
    onClose();
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View className="flex-1 bg-white dark:bg-[#0F0F0F]" style={{ paddingTop: insets.top }}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
          keyboardVerticalOffset={0}
        >
          {/* Header */}
          <View className="flex-row items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-800">
            <TouchableOpacity onPress={handleClose}>
              <Ionicons name="arrow-back" size={24} color={isDark ? 'white' : 'black'} />
            </TouchableOpacity>
            <Text className="font-visby-bold text-lg text-gray-900 dark:text-white">
              Post
            </Text>
            <View style={{ width: 24 }} />
          </View>

          {loading ? (
            <View className="flex-1 items-center justify-center">
              <ActivityIndicator size="large" color="#8BC34A" />
            </View>
          ) : post ? (
            <>
              <ScrollView className="flex-1" keyboardShouldPersistTaps="handled">
                {/* Post Content */}
                <View className="border-b border-gray-100 p-4 dark:border-gray-800">
                  {/* User Info */}
                  <View className="mb-3 flex-row items-center">
                    <View className="h-12 w-12 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                      <Image
                        source={{
                          uri:
                            post.user?.avatar ||
                            `https://ui-avatars.com/api/?name=${post.user?.fullName}&background=random`,
                        }}
                        style={{ width: 48, height: 48 }}
                        contentFit="cover"
                      />
                    </View>
                    <View className="ml-3 flex-1">
                      <Text className="font-visby-bold text-base text-gray-900 dark:text-white">
                        {post.user?.fullName}
                      </Text>
                      <Text className="font-visby text-xs text-gray-500 dark:text-gray-400">
                        @{post.user?.username}
                      </Text>
                    </View>
                  </View>

                  {/* Content */}
                  <Text className="mb-3 font-visby text-base leading-5 text-gray-800 dark:text-gray-200">
                    {post.content}
                  </Text>

                  {/* Image */}
                  {post.imageUrl && (
                    <View
                      className="mb-3 overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-800"
                      style={{ height: 250 }}
                    >
                      <Image
                        source={{ uri: post.imageUrl }}
                        style={{ width: '100%', height: '100%' }}
                        contentFit="cover"
                      />
                    </View>
                  )}

                  {/* Stats */}
                  <View className="flex-row items-center gap-4 pt-2">
                    <View className="flex-row items-center">
                      <Ionicons name="heart" size={18} color="#EF4444" />
                      <Text className="ml-1 font-visby text-sm text-gray-600 dark:text-gray-400">
                        {post.likesCount || 0}
                      </Text>
                    </View>
                    <View className="flex-row items-center">
                      <Ionicons name="chatbubble" size={16} color="#6B7280" />
                      <Text className="ml-1 font-visby text-sm text-gray-600 dark:text-gray-400">
                        {comments.length}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Comments Section */}
                <View className="p-4">
                  <Text className="mb-4 font-visby-bold text-base text-gray-900 dark:text-white">
                    Comments ({comments.length})
                  </Text>

                  {comments.length === 0 ? (
                    <View className="py-8">
                      <Text className="text-center font-visby italic text-gray-400 dark:text-gray-500">
                        No comments yet. Be the first to comment!
                      </Text>
                    </View>
                  ) : (
                    comments.map((comment, index) => {
                      const timeAgo = formatDistanceToNow(new Date(comment.createdAt), {
                        addSuffix: true,
                        locale: localeId,
                      });

                      return (
                        <View key={index} className="mb-4 flex-row">
                          <View className="h-10 w-10 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                            <Image
                              source={{
                                uri:
                                  comment.userId?.avatar ||
                                  `https://ui-avatars.com/api/?name=${comment.userId?.fullName}&background=random`,
                              }}
                              style={{ width: 40, height: 40 }}
                              contentFit="cover"
                            />
                          </View>
                          <View className="ml-3 flex-1">
                            <View className="rounded-2xl rounded-tl-none bg-gray-100 p-3 dark:bg-gray-800">
                              <Text className="mb-1 font-visby-bold text-sm text-gray-900 dark:text-white">
                                {comment.userId?.fullName}
                              </Text>
                              <Text className="font-visby text-sm leading-5 text-gray-700 dark:text-gray-300">
                                {comment.content}
                              </Text>
                            </View>
                            <Text className="mt-1 ml-3 font-visby text-xs text-gray-400">
                              {timeAgo}
                            </Text>
                          </View>
                        </View>
                      );
                    })
                  )}
                </View>
                <View className="h-20" />
              </ScrollView>

              {/* Comment Input */}
              <View
                className="flex-row items-center border-t border-gray-200 bg-white px-4 pt-3 dark:border-gray-800 dark:bg-[#0F0F0F]"
                style={{ paddingBottom: Math.max(insets.bottom, 16) }}
              >
                <TextInput
                  ref={inputRef}
                  value={newComment}
                  onChangeText={setNewComment}
                  placeholder="Write a comment..."
                  placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'}
                  className="mr-3 flex-1 rounded-full bg-gray-100 px-4 py-3 font-visby text-sm text-black dark:bg-gray-800 dark:text-white"
                  returnKeyType="send"
                  onSubmitEditing={handleSubmitComment}
                  editable={!submitting}
                />
                <TouchableOpacity
                  onPress={handleSubmitComment}
                  disabled={!newComment.trim() || submitting}
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color="#8BC34A" />
                  ) : (
                    <Ionicons
                      name="send"
                      size={24}
                      color={newComment.trim() ? '#8BC34A' : '#9CA3AF'}
                    />
                  )}
                </TouchableOpacity>
              </View>
            </>
          ) : null}
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};
