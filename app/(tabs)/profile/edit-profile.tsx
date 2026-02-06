import { UserService } from '@/lib/services/userService';
import { ProfileService } from '@/lib/services/profileService';
import { useAuthStore } from '@/lib/store/authStore';
import { useProfileStore } from '@/lib/store/profileStore';
import { Ionicons } from '@expo/vector-icons';
import { type ImagePickerAsset, launchImageLibraryAsync } from 'expo-image-picker';
import { Stack, useNavigation, useRouter } from 'expo-router';
import React, { useLayoutEffect, useState, useEffect, useRef, useCallback } from 'react';
import {
  Image,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from 'react-native';
import { ProfileUser } from '@/lib/types/auth';
import { showAlert } from '@/lib/utils/globalAlert';
import { Danger, TickCircle } from 'iconsax-react-native';

export default function EditProfileScreen() {
  const router = useRouter();
  const token = useAuthStore((state) => state.token);
  const currentUser = useAuthStore((state) => state.user);

  const [userData, setUserData] = useState<ProfileUser | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState<string | undefined>(undefined);
  const [bio, setBio] = useState<string | undefined>(undefined);
  const [avatarImageResult, setAvatarImageResult] = useState<ImagePickerAsset | undefined>(
    undefined,
  );

  // Refs untuk mencegah multiple fetches dan tracking changes
  const hasFetchedRef = useRef(false);
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

  const fetchProfile = useCallback(async () => {
    if (!token || hasFetchedRef.current) return;
    
    try {
      setLoadingProfile(true);
      hasFetchedRef.current = true;
      
      const response = await ProfileService.getProfile();
      const profile = response.data.user;
      
      setUserData(profile);
      // Set initial values
      if (!username) setUsername(profile.fullName || '');
      if (!bio) setBio(profile.bio || '');
    } catch (error: any) {
      console.error('Failed to fetch profile:', error);
      showAlert('Error', 'Failed to load profile data', undefined, {
        icon: <Danger size={32} color="#EF4444" variant="Bold" />,
        type: 'destructive',
      });
    } finally {
      setLoadingProfile(false);
    }
  }, [token, username, bio]);

  useEffect(() => {
    fetchProfile();
    
    // Cleanup
    return () => {
      hasFetchedRef.current = false;
    };
  }, [fetchProfile]);

  const pickImage = async () => {
    try {
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
    } catch (error: any) {
      console.error('Image picker error:', error);
      showAlert('Error', 'Failed to pick image', undefined, {
        icon: <Danger size={32} color="#EF4444" variant="Bold" />,
        type: 'destructive',
      });
    }
  };

  const handleSave = async () => {
    if (loading) return;
    
    // Cek apakah ada perubahan
    const hasChanges = 
      (username && username !== userData?.fullName) ||
      (bio && bio !== userData?.bio) ||
      avatarImageResult;
      
    if (!hasChanges) {
      showAlert('Info', 'No changes to save', undefined, {
        icon: <TickCircle size={32} color="#F59E0B" variant="Bold" />,
      });
      return;
    }
    
    try {
      setLoading(true);
      await UserService.updateUserProfile({
        username: username !== userData?.fullName ? username : undefined,
        bio: bio !== userData?.bio ? bio : undefined,
        avatarBase64: avatarImageResult?.base64 || undefined,
      });
      
      // Reset fetch flag agar profile page bisa fetch data baru
      hasFetchedRef.current = false;
      
      const { triggerRefetch } = useProfileStore.getState();
      triggerRefetch();

      showAlert('Success', 'Profile updated successfully', undefined, {
        icon: <TickCircle size={32} color="#10B981" variant="Bold" />,
      });
      
      // Navigate back setelah sukses
      setTimeout(() => router.back(), 1500);
    } catch (error: any) {
      showAlert('Error', error.message, undefined, {
        icon: <Danger size={32} color="#EF4444" variant="Bold" />,
        type: 'destructive',
      });
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
              disabled={loading}
            >
              <Ionicons name="close" size={28} color={loading ? "#ccc" : "black"} />
            </TouchableOpacity>
          ),
          headerRight: () => (
            <TouchableOpacity onPress={handleSave} disabled={loading}>
              {loading ? (
                <ActivityIndicator size="small" color="#5FD08F" />
              ) : (
                <Ionicons name="checkmark" size={28} color="#5FD08F" />
              )}
            </TouchableOpacity>
          ),
        }}
      />
      <ScrollView className="flex-1 bg-white p-6" showsVerticalScrollIndicator={false}>
        {/* Avatar Section */}
        <View className="mb-8 items-center">
          <Image
            source={{
              uri: avatarImageResult?.uri || userData?.avatar || 'https://via.placeholder.com/150',
            }}
            style={{ width: 100, height: 100, borderRadius: 50 }}
            defaultSource={{ uri: 'https://via.placeholder.com/150' }}
          />
          <TouchableOpacity onPress={pickImage} className="mt-3" disabled={loading}>
            <Text className="font-visby-bold text-base text-[#5FD08F]">Ganti Foto Profil</Text>
          </TouchableOpacity>
        </View>

        {/* Fields */}
        <View className="space-y-6">
          <View>
            <Text className="mb-2 ml-1 font-visby text-gray-500">Nama Lengkap</Text>
            <TextInput
              value={username || userData?.fullName || ''}
              onChangeText={setUsername}
              className="border-b border-gray-200 pb-2 font-visby-bold text-lg text-black"
              placeholder="Nama Kamu"
              placeholderTextColor="#ccc"
              editable={!loading}
            />
          </View>

          <View>
            <Text className="mb-2 ml-1 font-visby text-gray-500">Bio</Text>
            <TextInput
              value={bio || userData?.bio || ''}
              onChangeText={setBio}
              multiline
              numberOfLines={3}
              maxLength={150}
              className="border-b border-gray-200 pb-2 font-visby text-base text-black"
              placeholder="Ceritakan sedikit tentang dirimu..."
              placeholderTextColor="#ccc"
              style={{ minHeight: 80, textAlignVertical: 'top' }}
              editable={!loading}
            />
            <Text className="mt-1 text-right text-xs text-gray-400">
              {(bio || userData?.bio || '').length}/150
            </Text>
          </View>
          
          <View className="mt-8">
            <Text className="mb-2 ml-1 font-visby text-gray-500">Email</Text>
            <Text className="pb-2 font-visby text-base text-gray-500">
              {currentUser?.email || userData?.email || 'No email'}
            </Text>
          </View>
        </View>
        
        <View className="h-20" />
      </ScrollView>
    </>
  );
}
