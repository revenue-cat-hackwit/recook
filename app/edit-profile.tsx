import { useAuthStore } from '@/lib/store/authStore';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useState, useEffect, useCallback } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Hardcoded fallbacks if DB is empty
const DIET_GOALS = ['Balanced', 'Low Carb', 'Keto', 'Vegan', 'Vegetarian', 'High Protein'];
const ALLERGIES_LIST = ['Peanuts', 'Dairy', 'Gluten', 'Seafood', 'Soy', 'Eggs'];
const EQUIPMENT_LIST = ['Oven', 'Blender', 'Air Fryer', 'Stove', 'Microwave'];

export default function EditProfileScreen() {
  const router = useRouter();
  const session = useAuthStore((state) => state.session);
  const user = session?.user;
  const setCredentials = useAuthStore((state) => state.setCredentials);

  const [loading, setLoading] = useState(false);

  // Auth Metadata Fields
  const [fullName, setFullName] = useState(user?.user_metadata?.full_name || '');
  const [bio, setBio] = useState(user?.user_metadata?.bio || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.user_metadata?.avatar_url || '');

  // DB Profile Fields
  const [dietGoal, setDietGoal] = useState<string>('');
  const [allergies, setAllergies] = useState<string[]>([]);
  const [equipment, setEquipment] = useState<string[]>([]);

  // Modals for Selection
  const [activeModal, setActiveModal] = useState<'diet' | 'allergy' | 'equip' | null>(null);

  const fetchProfileData = useCallback(async () => {
    try {
      if (!user?.id) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('diet_goal, allergies, equipment')
        .eq('id', user.id)
        .single();

      if (data) {
        if (data.diet_goal) setDietGoal(data.diet_goal);
        if (data.allergies) setAllergies(data.allergies);
        if (data.equipment) setEquipment(data.equipment);
      }
    } catch (e) {
      console.log('Error fetching profile personalization:', e);
    }
  }, [user]);

  useEffect(() => {
    fetchProfileData();
  }, [fetchProfileData]);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      // Placeholder for upload logic
      Alert.alert('Info', 'Feature requires Supabase Storage setup. Displaying locally only.');
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      // 1. Update Auth Metadata (Name/Bio)
      const updates = {
        full_name: fullName,
        bio: bio,
      };

      const { data: authData, error: authError } = await supabase.auth.updateUser({
        data: updates,
      });

      if (authError) throw authError;

      // 2. Update DB Profile (Personalization)
      const { error: dbError } = await supabase
        .from('profiles')
        .update({
          diet_goal: dietGoal,
          allergies: allergies,
          equipment: equipment,
          full_name: fullName, // Sync basic info too
        })
        .eq('id', user?.id);

      if (dbError) throw dbError;

      // Update local store
      if (authData.user && session) {
        setCredentials(session, authData.user);
      }

      Alert.alert('Success', 'Profile updated!');
      router.back();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  // Helper to toggle array items
  const toggleItem = (item: string, list: string[], setList: (l: string[]) => void) => {
    if (list.includes(item)) {
      setList(list.filter((i) => i !== item));
    } else {
      setList([...list, item]);
    }
  };

  const renderSelectionModal = () => {
    if (!activeModal) return null;

    let title = '';
    let items: string[] = [];
    let selected: string[] | string = [];
    let onSelect: (item: string) => void = () => {};
    let multi = false;

    if (activeModal === 'diet') {
      title = 'Select Diet Goal';
      items = DIET_GOALS;
      selected = dietGoal;
      multi = false;
      onSelect = (item) => {
        setDietGoal(item);
        setActiveModal(null);
      };
    } else if (activeModal === 'allergy') {
      title = 'Select Allergies';
      items = ALLERGIES_LIST;
      selected = allergies;
      multi = true;
      onSelect = (item) => toggleItem(item, allergies, setAllergies);
    } else if (activeModal === 'equip') {
      title = 'Select Equipment';
      items = EQUIPMENT_LIST;
      selected = equipment;
      multi = true;
      onSelect = (item) => toggleItem(item, equipment, setEquipment);
    }

    return (
      <Modal transparent animationType="fade" visible={!!activeModal}>
        <View className="flex-1 items-center justify-center bg-black/50 p-4">
          <View className="max-h-[70%] w-full rounded-2xl bg-white p-6">
            <View className="mb-4 flex-row items-center justify-between">
              <Text className="font-visby-bold text-xl">{title}</Text>
              <TouchableOpacity onPress={() => setActiveModal(null)}>
                <Ionicons name="close" size={24} color="black" />
              </TouchableOpacity>
            </View>
            <ScrollView>
              <View className="flex-row flex-wrap gap-2">
                {items.map((item) => {
                  const isSelected = multi
                    ? (selected as string[]).includes(item)
                    : selected === item;

                  return (
                    <TouchableOpacity
                      key={item}
                      onPress={() => onSelect(item)}
                      className={`rounded-xl border px-4 py-3 ${isSelected ? 'border-black bg-black' : 'border-gray-200 bg-white'}`}
                    >
                      <Text
                        className={`font-visby-bold ${isSelected ? 'text-white' : 'text-gray-700'}`}
                      >
                        {item}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
            {multi && (
              <TouchableOpacity
                onPress={() => setActiveModal(null)}
                className="mt-6 items-center rounded-xl bg-[#5FD08F] py-3"
              >
                <Text className="font-visby-bold text-white">Done</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-row items-center justify-between border-b border-gray-100 px-4 py-2">
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="close" size={28} color="black" />
        </TouchableOpacity>
        <Text className="font-visby-bold text-lg">Edit Profile</Text>
        <TouchableOpacity onPress={handleSave} disabled={loading}>
          {loading ? (
            <ActivityIndicator size="small" color="#5FD08F" />
          ) : (
            <Ionicons name="checkmark" size={28} color="#5FD08F" />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 p-6">
        {/* Avatar Section */}
        <View className="mb-8 items-center">
          <Image
            source={{ uri: avatarUrl || 'https://via.placeholder.com/150' }}
            style={{ width: 100, height: 100, borderRadius: 50 }}
          />
          <TouchableOpacity onPress={pickImage} className="mt-3">
            <Text className="font-visby-bold text-base text-[#5FD08F]">Change Photo</Text>
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
        </View>

        {/* Personalization Section */}
        <Text className="mb-4 font-visby-bold text-xl text-black">Personalization 🎨</Text>

        <View className="mb-10 space-y-4">
          {/* Diet Goal */}
          <View>
            <Text className="mb-2 ml-1 font-visby text-xs uppercase tracking-wide text-gray-500">
              Cooking Goal
            </Text>
            <TouchableOpacity
              onPress={() => setActiveModal('diet')}
              className="flex-row items-center justify-between rounded-xl border border-gray-100 bg-gray-50 p-4"
            >
              <Text className="font-visby-bold text-base text-gray-800">
                {dietGoal || 'Select Goal'}
              </Text>
              <Ionicons name="chevron-down" size={20} color="gray" />
            </TouchableOpacity>
          </View>

          {/* Allergies */}
          <View>
            <Text className="mb-2 ml-1 font-visby text-xs uppercase tracking-wide text-gray-500">
              Allergies
            </Text>
            <TouchableOpacity
              onPress={() => setActiveModal('allergy')}
              className="flex-row items-center justify-between rounded-xl border border-gray-100 bg-gray-50 p-4"
            >
              <Text className="flex-1 font-visby-bold text-base text-gray-800" numberOfLines={1}>
                {allergies.length > 0 ? allergies.join(', ') : 'None'}
              </Text>
              <Ionicons name="chevron-down" size={20} color="gray" />
            </TouchableOpacity>
          </View>

          {/* Equipment */}
          <View>
            <Text className="mb-2 ml-1 font-visby text-xs uppercase tracking-wide text-gray-500">
              Kitchen Equipment
            </Text>
            <TouchableOpacity
              onPress={() => setActiveModal('equip')}
              className="flex-row items-center justify-between rounded-xl border border-gray-100 bg-gray-50 p-4"
            >
              <Text className="flex-1 font-visby-bold text-base text-gray-800" numberOfLines={1}>
                {equipment.length > 0 ? equipment.join(', ') : 'None'}
              </Text>
              <Ionicons name="chevron-down" size={20} color="gray" />
            </TouchableOpacity>
          </View>
        </View>

        <View className="h-20" />
      </ScrollView>

      {renderSelectionModal()}
    </SafeAreaView>
  );
}
