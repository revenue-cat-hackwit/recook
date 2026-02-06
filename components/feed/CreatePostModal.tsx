import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  ActivityIndicator,
  ScrollView,
  // Alert, // Removed native Alert import
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'nativewind';
import { Camera, Gallery, CloseCircle } from 'iconsax-react-native';
import * as ImagePicker from 'expo-image-picker';
import { UploadService } from '@/lib/services/uploadService';
import { showAlert } from '@/lib/utils/globalAlert';

interface CreatePostModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (content: string, imageUrl?: string) => Promise<void>;
}

export const CreatePostModal: React.FC<CreatePostModalProps> = ({
  visible,
  onClose,
  onSubmit,
}) => {
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const insets = useSafeAreaInsets();

  const handleSubmit = async () => {
    if (!content.trim() || isSubmitting) {
      showAlert('Oops!', 'Please write something to share!');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(content.trim(), imageUrl.trim() || undefined);
      setContent('');
      setImageUrl('');
      setSelectedImage(null);
      onClose();
    } catch (error) {
      console.error('Error creating post:', error);
      showAlert('Error', 'Failed to create post. Please try again!');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting && !isUploading) {
      setContent('');
      setImageUrl('');
      setSelectedImage(null);
      onClose();
    }
  };

  const pickImage = async (sourceType: 'camera' | 'gallery') => {
    try {
      let result;
      
      if (sourceType === 'camera') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          showAlert('Permission Required', 'We need camera permission to take photos.');
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [4, 3],
          quality: 0.8,
        });
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          showAlert('Permission Required', 'We need permission to access your photo library.');
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [4, 3],
          quality: 0.8,
        });
      }

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setSelectedImage(asset.uri);
        await uploadImage(asset);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      showAlert('Error', 'Failed to select image. Please try again!');
    }
  };

  const uploadImage = async (asset: { uri: string; fileName?: string | null; mimeType?: string | null }) => {
    setIsUploading(true);
    try {
      const fileName = asset.fileName || `photo_${Date.now()}.jpg`;
      const fileType = asset.mimeType || 'image/jpeg';

      const file = {
        uri: asset.uri,
        name: fileName,
        type: fileType,
      };

      const response = await UploadService.uploadFile(file);
      
      if (response.success && response.data.url) {
        setImageUrl(response.data.url);
        showAlert('Success!', 'Photo uploaded successfully!');
      } else {
        throw new Error('Upload failed');
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      showAlert('Error', 'Failed to upload image. Please try again!');
      setSelectedImage(null);
    } finally {
      setIsUploading(false);
    }
  };

  const removeImage = () => {
    setImageUrl('');
    setSelectedImage(null);
  };



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
            <TouchableOpacity onPress={handleClose} disabled={isSubmitting || isUploading}>
              <Ionicons name="close" size={28} color={isDark ? '#9CA3AF' : '#6B7280'} />
            </TouchableOpacity>
            <Text className="font-visby-bold text-lg text-gray-900 dark:text-white">
              Create New Post
            </Text>
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={!content.trim() || isSubmitting || isUploading}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#8BC34A" />
              ) : (
                <Text
                  className={`font-visby-bold text-base ${
                    content.trim() && !isUploading ? 'text-[#8BC34A]' : 'text-gray-400'
                  }`}
                >
                  Post
                </Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView className="flex-1 px-4 pt-4" keyboardShouldPersistTaps="handled">
            {/* Content Input */}
            <TextInput
              value={content}
              onChangeText={setContent}
              placeholder="What's cooking today? Share your culinary story..."
              placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'}
              multiline
              numberOfLines={6}
              maxLength={1000}
              className="min-h-[150px] rounded-2xl bg-gray-50 p-4 font-visby text-base text-gray-900 dark:bg-gray-800 dark:text-white"
              style={{ textAlignVertical: 'top' }}
              editable={!isSubmitting && !isUploading}
              autoFocus
            />
            <Text className="mt-2 text-right font-visby text-xs text-gray-400">
              {content.length}/1000
            </Text>

            {/* Image Preview */}
            {(selectedImage || imageUrl) && (
              <View className="relative mt-4 overflow-hidden rounded-2xl bg-gray-100 dark:bg-gray-800">
                {isUploading ? (
                  <View className="h-[200px] items-center justify-center">
                    <ActivityIndicator size="large" color="#8BC34A" />
                    <Text className="mt-2 font-visby text-sm text-gray-600 dark:text-gray-400">
                      Uploading photo...
                    </Text>
                  </View>
                ) : (
                  <>
                    <Image
                      source={{ uri: selectedImage || imageUrl }}
                      style={{ width: '100%', height: 200 }}
                      contentFit="cover"
                    />
                    <TouchableOpacity
                      onPress={removeImage}
                      className="absolute right-2 top-2 h-10 w-10 items-center justify-center rounded-full bg-black/60"
                    >
                      <CloseCircle size={28} color="white" variant="Bold" />
                    </TouchableOpacity>
                  </>
                )}
              </View>
            )}

            {/* Add Image Button */}
            {/* Add Image Options */}
            {!selectedImage && !imageUrl && !isUploading && (
              <View className="mt-4 flex-row gap-4">
                <TouchableOpacity
                  onPress={() => pickImage('camera')}
                  className="flex-1 flex-row items-center justify-center rounded-xl border-2 border-dashed border-gray-300 p-6 dark:border-gray-700"
                  disabled={isSubmitting}
                >
                  <Camera size={24} color={isDark ? '#9CA3AF' : '#6B7280'} variant="Bold" />
                  <Text className="ml-2 font-visby-demibold text-base text-gray-600 dark:text-gray-400">
                    Camera
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => pickImage('gallery')}
                  className="flex-1 flex-row items-center justify-center rounded-xl border-2 border-dashed border-gray-300 p-6 dark:border-gray-700"
                  disabled={isSubmitting}
                >
                  <Gallery size={24} color={isDark ? '#9CA3AF' : '#6B7280'} variant="Bold" />
                  <Text className="ml-2 font-visby-demibold text-base text-gray-600 dark:text-gray-400">
                    Gallery
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Info Text */}
            <View className="mt-6 rounded-xl bg-green-50 p-4 dark:bg-green-900/20">
              <Text className="font-visby-demibold text-sm text-green-700 dark:text-green-400">
                💡 Tips for Great Posts:
              </Text>
              <Text className="mt-2 font-visby text-xs leading-5 text-green-700 dark:text-green-400">
                • Share your cooking experience{"\n"}
                • Include recipes or cooking tips{"\n"}
                • Don't forget to add a photo of your dish!
              </Text>
            </View>
          </ScrollView>

          {/* Submit Button */}
          <View
            className="border-t border-gray-200 bg-white px-4 pt-4 dark:border-gray-800 dark:bg-[#0F0F0F]"
            style={{ paddingBottom: Math.max(insets.bottom, 16) }}
          >
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={!content.trim() || isSubmitting || isUploading}
              className={`flex-row items-center justify-center rounded-full py-4 ${
                !content.trim() || isSubmitting || isUploading
                  ? 'bg-gray-300 dark:bg-gray-700'
                  : 'bg-[#8BC34A]'
              }`}
              activeOpacity={0.8}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <>
                  <Ionicons name="send" size={20} color="white" />
                  <Text className="ml-2 font-visby-bold text-base text-white">
                    Share Post
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};
