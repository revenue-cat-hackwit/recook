import { UserService } from '@/lib/services/userService';
import { ProfileService } from '@/lib/services/profileService';
import { useAuthStore } from '@/lib/store/authStore';
import { Ionicons } from '@expo/vector-icons';
import { type ImagePickerAsset, launchImageLibraryAsync } from 'expo-image-picker';
import { Stack, useNavigation, useRouter } from 'expo-router';
import React, { useLayoutEffect, useState, useEffect } from 'react';
import { Alert, Image, ScrollView, Text, TextInput, TouchableOpacity, View, ActivityIndicator } from 'react-native';
import { ProfileUser } from '@/lib/types/auth';

export default function EditProfileScreen() {
  const router = useRouter();
  const token = useAuthStore((state) => state.token);

  const [userData, setUserData] = useState<ProfileUser | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState<string | undefined>(undefined);
  const [bio, setBio] = useState<string | undefined>(undefined);
  const [avatarImageResult, setAvatarImageResult] = useState<ImagePickerAsset | undefined>(
    undefined,
  );

  const navigation = useNavigation();

  useLayoutEffect(() => {
    navigation.getParent()?.setOptions({
      tabBarStyle: { display: 'none' },
    });

    return () => {
      navigation.getParent()?.setOptions({
        tabBarStyle: { display: 'flex' },
      });
    };
  }, [navigation]);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!token) return;
      try {
        setLoadingProfile(true);
        const response = await ProfileService.getProfile();
        setUserData(response.data.user);
      } catch (error: any) {
        console.error('Failed to fetch profile:', error);
        Alert.alert('Error', 'Failed to load profile data');
      } finally {
        setLoadingProfile(false);
      }
    };

    fetchProfile();
  }, [token]);

  const pickImage = async () => {
    const result = await launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
      base64: true,
      allowsMultipleSelection: false,
    });

    if (!result.canceled && result.assets.length === 1) {
      setAvatarImageResult(result.assets[0]);
    }
  };

  const handleSave = async () => {
    if (loading) return;
    // Do not proceed if no changes were made
    if (!username && !bio && !avatarImageResult) return;
    try {
      setLoading(true);
      await UserService.updateUserProfile({
        username,
        bio,
        avatarBase64: avatarImageResult?.base64 || undefined,
      });
      Alert.alert('Success', 'Profile updated successfully');
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  if (loadingProfile) {
    return (
      <>
        <Stack.Screen
          options={{
            title: 'Edit Profile',
            headerTitleAlign: 'center',
          }}
        />
        <View className="flex-1 items-center justify-center bg-white">
          <ActivityIndicator size="large" color="#5FD08F" />
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Edit Profile',
          headerTitleAlign: 'center',
          headerLeft: ({ canGoBack }) => (
            <TouchableOpacity
              onPress={() => {
                if (canGoBack) {
                  router.back();
                }
              }}
            >
              <Ionicons name="close" size={28} color="black" />
            </TouchableOpacity>
          ),
          headerRight: () => (
            <TouchableOpacity onPress={handleSave}>
              <Ionicons name="checkmark" size={28} color="#5FD08F" />
            </TouchableOpacity>
          ),
        }}
      />
      <ScrollView className="flex-1 bg-white p-6">
        {/* Avatar Section */}
        <View className="mb-8 items-center">
          <Image
            source={{
              uri:
                avatarImageResult?.uri ||
                userData?.avatar ||
                'https://via.placeholder.com/150',
            }}
            style={{ width: 100, height: 100, borderRadius: 50 }}
          />
          <TouchableOpacity onPress={pickImage} className="mt-3">
            <Text className="font-visby-bold text-base text-[#5FD08F]">Ganti Foto Profil</Text>
          </TouchableOpacity>
        </View>

        {/* Fields */}
        <View className="space-y-6">
          <View>
            <Text className="mb-2 ml-1 font-visby text-gray-500">Nama Lengkap</Text>
            <TextInput
              value={username || userData?.fullName}
              onChangeText={setUsername}
              className="border-b border-gray-200 pb-2 font-visby-bold text-lg text-black"
              placeholder="Nama Kamu"
              placeholderTextColor="#ccc"
            />
          </View>

          <View>
            <Text className="mb-2 ml-1 font-visby text-gray-500">Bio</Text>
            <TextInput
              value={bio || userData?.bio}
              onChangeText={setBio}
              multiline
              numberOfLines={3}
              className="border-b border-gray-200 pb-2 font-visby text-base text-black"
              placeholder="Ceritakan sedikit tentang dirimu..."
              placeholderTextColor="#ccc"
              style={{ minHeight: 80, textAlignVertical: 'top' }}
            />
            <Text className="mt-1 text-right text-xs text-gray-400">
              {bio?.length || userData?.bio?.length || 0}/150
            </Text>
          </View>
        </View>
      </ScrollView>
    </>
  );
}
