import { useAuthStore } from '@/lib/store/authStore';
import { ProfileService } from '@/lib/services/profileService';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useState, useEffect } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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

export default function EditProfileScreen() {
  const router = useRouter();
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);

  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Profile Fields
  const [fullName, setFullName] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');

  // Fetch current profile data
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await ProfileService.getProfile();
        const profile = response.data.user;
        setFullName(profile.fullName || '');
        setBio(profile.bio || '');
        setAvatarUrl(profile.avatar || ''); // Changed from avatarUrl
      } catch (error: any) {
        console.error('Failed to fetch profile:', error);
      }
    };

    if (token) {
      fetchProfile();
    }
  }, [token]);

  const pickImage = async () => {
    try {
      // Request permission
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant camera roll permissions to upload an avatar.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        await uploadAvatar(asset.uri);
      }
    } catch (error: any) {
      console.error('Image picker error:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const uploadAvatar = async (uri: string) => {
    try {
      setUploading(true);

      // Create FormData
      const formData = new FormData();
      const filename = uri.split('/').pop() || 'avatar.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';

      formData.append('file', {
        uri,
        name: filename,
        type,
      } as any);

      const uploadResponse = await ProfileService.uploadFile(formData);

      // Update avatar URL locally
      setAvatarUrl(uploadResponse.data.url);
      Alert.alert('Success', 'Avatar uploaded! Don\'t forget to save your changes.');
    } catch (error: any) {
      console.error('Upload error:', error);
      Alert.alert('Upload Failed', error.message || 'Failed to upload avatar');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const updateData: any = {};

      // Only send fields that have changed
      if (fullName) updateData.fullName = fullName;
      if (bio) updateData.bio = bio;
      if (avatarUrl) updateData.avatar = avatarUrl;

      const response = await ProfileService.updateProfile(updateData);

      // Update auth store with new user data
      useAuthStore.setState({ user: response.data.user });

      Alert.alert('Success', 'Profile updated successfully!');
      router.back();
    } catch (error: any) {
      console.error('Update error:', error);
      Alert.alert('Error', error.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const userInitials = getInitials(fullName, user?.username);

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-row items-center justify-between border-b border-gray-100 px-4 py-2">
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="close" size={28} color="black" />
        </TouchableOpacity>
        <Text className="font-visby-bold text-lg">Edit Profile</Text>
        <TouchableOpacity onPress={handleSave} disabled={loading || uploading}>
          {loading ? (
            <ActivityIndicator size="small" color="#8BD65E" />
          ) : (
            <Ionicons name="checkmark" size={28} color="#8BD65E" />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 p-6">
        {/* Avatar Section */}
        <View className="mb-8 items-center">
          {avatarUrl ? (
            <Image
              source={{ uri: avatarUrl }}
              style={{ width: 100, height: 100, borderRadius: 50 }}
            />
          ) : (
            <View
              className="items-center justify-center rounded-full bg-[#8BD65E]"
              style={{ width: 100, height: 100 }}
            >
              <Text className="font-visby-bold text-4xl text-white">
                {userInitials}
              </Text>
            </View>
          )}
          <TouchableOpacity onPress={pickImage} disabled={uploading} className="mt-3">
            {uploading ? (
              <ActivityIndicator size="small" color="#8BD65E" />
            ) : (
              <Text className="font-visby-bold text-base text-[#8BD65E]">Change Photo</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Basic Fields */}
        <View className="mb-8 space-y-6">
          <View>
            <Text className="mb-2 ml-1 font-visby text-gray-500">Full Name</Text>
            <TextInput
              value={fullName}
              onChangeText={setFullName}
              className="border-b border-gray-200 pb-2 font-visby-bold text-lg text-black"
              placeholder="Your Name"
            />
          </View>

          <View>
            <Text className="mb-2 ml-1 font-visby text-gray-500">Bio</Text>
            <TextInput
              value={bio}
              onChangeText={setBio}
              multiline
              className="border-b border-gray-200 pb-2 font-visby text-base text-black"
              placeholder="Tell us about yourself..."
              style={{ minHeight: 60 }}
            />
          </View>

          <View>
            <Text className="mb-2 ml-1 font-visby text-gray-500">Email</Text>
            <Text className="pb-2 font-visby text-base text-gray-400">
              {user?.email || '-'}
            </Text>
            <Text className="font-visby text-xs text-gray-400">
              Email cannot be changed
            </Text>
          </View>

          <View>
            <Text className="mb-2 ml-1 font-visby text-gray-500">Username</Text>
            <Text className="pb-2 font-visby text-base text-gray-400">
              @{user?.username || '-'}
            </Text>
            <Text className="font-visby text-xs text-gray-400">
              Username cannot be changed
            </Text>
          </View>
        </View>

        <View className="h-20" />
      </ScrollView>
    </SafeAreaView>
  );
}
