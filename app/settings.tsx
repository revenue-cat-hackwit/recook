import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/store/authStore';

import { Alert, Text, TouchableOpacity, View, ScrollView, TextInput, ActivityIndicator } from 'react-native';
import { Container } from '@/components/Container';
import { SubscriptionCard } from '@/components/SubscriptionCard';
import { CustomAlertModal } from '@/components/CustomAlertModal';

import { usePreferencesStore } from '@/lib/store/preferencesStore';
import { useRouter, useNavigation } from 'expo-router';
import { AIService } from '@/lib/services/aiService';
import { PersonalizationService } from '@/lib/services/personalizationService';
import { showAlert } from '@/lib/utils/globalAlert';
import { Danger, Trash, TickCircle } from 'iconsax-react-native';
import * as Haptics from 'expo-haptics';
import Purchases from 'react-native-purchases';
import { Platform, Linking } from 'react-native';
import { useSubscriptionStore } from '@/lib/store/subscriptionStore';
import { Setting2 } from 'iconsax-react-native';

const ALLERGIES_OPT = ['Peanuts', 'Seafood', 'Dairy', 'Gluten', 'Eggs', 'Soy'];
const EQUIPMENT_OPT = ['Oven', 'Blender', 'Air Fryer', 'Microwave', 'Mixer'];



/* End of Personalization Section Definitions */

/* Helper components above */

/* Main Component */
const PersonalizationSection = () => {
  const { preferences, toggleAllergy, toggleEquipment, toggleCuisine, toggleTastePreference } = usePreferencesStore();

  const [newCuisine, setNewCuisine] = useState('');
  const [newTaste, setNewTaste] = useState('');
  const [newAllergy, setNewAllergy] = useState('');
  const [newEquipment, setNewEquipment] = useState('');
  const [updating, setUpdating] = useState(false);

  const updateBackend = async (field: 'favoriteCuisines' | 'tastePreferences' | 'foodAllergies' | 'whatsInYourKitchen', value: string[]) => {
    try {
      setUpdating(true);
      const updateData = {
        favoriteCuisines: field === 'favoriteCuisines' ? value : undefined,
        tastePreferences: field === 'tastePreferences' ? value : undefined,
        foodAllergies: field === 'foodAllergies' ? value : undefined,
        whatsInYourKitchen: field === 'whatsInYourKitchen' ? value : undefined,
      };
      
      // Remove undefined fields
      const cleanData = Object.fromEntries(
        Object.entries(updateData).filter(([_, v]) => v !== undefined)
      );

      await PersonalizationService.updatePersonalization(cleanData);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Failed to update personalization:', error);
      showAlert('Error', 'Failed to update preferences. Please try again.', undefined, {
        icon: <Danger size={32} color="#EF4444" variant="Bold" />,
        type: 'destructive',
      });
    } finally {
      setUpdating(false);
    }
  };

  const handleToggleAllergy = async (allergy: string) => {
    // Calculate new state BEFORE toggle (to avoid race condition)
    const isCurrentlySelected = preferences.foodAllergies.includes(allergy);
    const newAllergies = isCurrentlySelected
      ? preferences.foodAllergies.filter(a => a !== allergy)
      : [...preferences.foodAllergies, allergy];
    
    // Update local state
    toggleAllergy(allergy);
    
    // Sync to backend
    await updateBackend('foodAllergies', newAllergies);
  };

  const handleAddCuisine = async () => {
    if (newCuisine.trim()) {
      const cuisineToAdd = newCuisine.trim();
      
      // Check if already exists
      if (preferences.favoriteCuisines.includes(cuisineToAdd)) {
        setNewCuisine('');
        return;
      }
      
      // Calculate new array
      const newCuisines = [...preferences.favoriteCuisines, cuisineToAdd];
      
      // Update local state
      toggleCuisine(cuisineToAdd);
      setNewCuisine('');
      
      // Sync to backend
      await updateBackend('favoriteCuisines', newCuisines);
    }
  };

  const handleAddTaste = async () => {
    if (newTaste.trim()) {
      const tasteToAdd = newTaste.trim();
      
      // Check if already exists
      if (preferences.tastePreferences.includes(tasteToAdd)) {
        setNewTaste('');
        return;
      }
      
      // Calculate new array
      const newTastes = [...preferences.tastePreferences, tasteToAdd];
      
      // Update local state
      toggleTastePreference(tasteToAdd);
      setNewTaste('');
      
      // Sync to backend
      await updateBackend('tastePreferences', newTastes);
    }
  };

  const handleToggleEquipment = async (equipment: string) => {
    // Calculate new state BEFORE toggle (to avoid race condition)
    const isCurrentlySelected = preferences.whatsInYourKitchen.includes(equipment);
    const newEquipment = isCurrentlySelected
      ? preferences.whatsInYourKitchen.filter(e => e !== equipment)
      : [...preferences.whatsInYourKitchen, equipment];
    
    // Update local state
    toggleEquipment(equipment);
    
    // Sync to backend
    await updateBackend('whatsInYourKitchen', newEquipment);
  };

  const handleAddAllergy = async () => {
    if (newAllergy.trim()) {
      const allergyToAdd = newAllergy.trim();
      
      // Check if already exists
      if (preferences.foodAllergies.includes(allergyToAdd)) {
        setNewAllergy('');
        return;
      }
      
      // Calculate new array
      const newAllergies = [...preferences.foodAllergies, allergyToAdd];
      
      // Update local state
      toggleAllergy(allergyToAdd);
      setNewAllergy('');
      
      // Sync to backend
      await updateBackend('foodAllergies', newAllergies);
    }
  };

  const handleAddEquipment = async () => {
    if (newEquipment.trim()) {
      const equipmentToAdd = newEquipment.trim();
      
      // Check if already exists
      if (preferences.whatsInYourKitchen.includes(equipmentToAdd)) {
        setNewEquipment('');
        return;
      }
      
      // Calculate new array
      const newEquipmentList = [...preferences.whatsInYourKitchen, equipmentToAdd];
      
      // Update local state
      toggleEquipment(equipmentToAdd);
      setNewEquipment('');
      
      // Sync to backend
      await updateBackend('whatsInYourKitchen', newEquipmentList);
    }
  };

  return (
    <View className="mb-8">
      <View className="mb-4 flex-row items-center justify-between">
        <Text className="font-visby-bold text-lg text-gray-900 dark:text-gray-100">
          Personalization
        </Text>
        {updating && (
          <View className="flex-row items-center gap-2">
            <ActivityIndicator size="small" color="#8BD65E" />
            <Text className="font-visby text-xs text-gray-500">Syncing...</Text>
          </View>
        )}
      </View>

      {/* Cuisines */}
      <Text className="mb-2 font-visby-bold text-sm text-gray-500 dark:text-gray-400">
        Favorite Cuisines
      </Text>
      <View className="mb-4 flex-row flex-wrap gap-2">
        {preferences.favoriteCuisines.map((item) => (
          <TouchableOpacity
            key={item}
            onPress={async () => {
              // Calculate new state BEFORE toggle
              const newCuisines = preferences.favoriteCuisines.filter(c => c !== item);
              
              // Update local state
              toggleCuisine(item);
              
              // Sync to backend
              await updateBackend('favoriteCuisines', newCuisines);
            }}
            disabled={updating}
            className="flex-row items-center rounded-full border border-[#8BD65E] bg-[#8BD65E] px-4 py-2"
          >
            <Text className="mr-1 font-visby text-xs font-bold text-white">{item}</Text>
            <Ionicons name="close" size={12} color="white" />
          </TouchableOpacity>
        ))}
        {/* Add Logic */}
        <View className="flex-row items-center rounded-full border border-gray-200 bg-gray-50 px-3 py-1 dark:border-gray-700 dark:bg-gray-800">
          <TextInput
            value={newCuisine}
            onChangeText={setNewCuisine}
            placeholder="Add cuisine..."
            placeholderTextColor="#9CA3AF"
            className="w-24 p-1 font-visby text-xs text-gray-900 dark:text-gray-100"
            onSubmitEditing={handleAddCuisine}
            returnKeyType="done"
            editable={!updating}
          />
          <TouchableOpacity onPress={handleAddCuisine} activeOpacity={0.7} disabled={updating}>
            <Ionicons name="add-circle" size={20} color="#8BD65E" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Taste Preferences */}
      <Text className="mb-2 font-visby-bold text-sm text-gray-500 dark:text-gray-400">
        Taste Preferences (Avoid)
      </Text>
      <View className="mb-4 flex-row flex-wrap gap-2">
        {preferences.tastePreferences.map((item) => (
          <TouchableOpacity
            key={item}
            onPress={async () => {
              // Calculate new state BEFORE toggle
              const newPrefs = preferences.tastePreferences.filter(t => t !== item);
              
              // Update local state
              toggleTastePreference(item);
              
              // Sync to backend
              await updateBackend('tastePreferences', newPrefs);
            }}
            disabled={updating}
            className="flex-row items-center rounded-full border border-orange-500 bg-orange-500 px-4 py-2"
          >
            <Text className="mr-1 font-visby text-xs font-bold text-white">{item}</Text>
            <Ionicons name="close" size={12} color="white" />
          </TouchableOpacity>
        ))}
        {/* Add Logic */}
        <View className="flex-row items-center rounded-full border border-gray-200 bg-gray-50 px-3 py-1 dark:border-gray-700 dark:bg-gray-800">
          <TextInput
            value={newTaste}
            onChangeText={setNewTaste}
            placeholder="Add taste..."
            placeholderTextColor="#9CA3AF"
            className="w-24 p-1 font-visby text-xs text-gray-900 dark:text-gray-100"
            onSubmitEditing={handleAddTaste}
            returnKeyType="done"
            editable={!updating}
          />
          <TouchableOpacity onPress={handleAddTaste} activeOpacity={0.7} disabled={updating}>
            <Ionicons name="add-circle" size={20} color="#F97316" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Allergies */}
      <Text className="mb-2 font-visby-bold text-sm text-gray-500 dark:text-gray-400">
        Allergies / Restrictions
      </Text>
      <View className="mb-4 flex-row flex-wrap gap-2">
        {preferences.foodAllergies.map((item) => (
          <TouchableOpacity
            key={item}
            onPress={() => handleToggleAllergy(item)}
            disabled={updating}
            className="flex-row items-center rounded-full border border-red-500 bg-red-500 px-4 py-2"
          >
            <Text className="mr-1 font-visby text-xs font-bold text-white">{item}</Text>
            <Ionicons name="close" size={12} color="white" />
          </TouchableOpacity>
        ))}
        {/* Add Logic */}
        <View className="flex-row items-center rounded-full border border-gray-200 bg-gray-50 px-3 py-1 dark:border-gray-700 dark:bg-gray-800">
          <TextInput
            value={newAllergy}
            onChangeText={setNewAllergy}
            placeholder="Add allergy..."
            placeholderTextColor="#9CA3AF"
            className="w-24 p-1 font-visby text-xs text-gray-900 dark:text-gray-100"
            onSubmitEditing={handleAddAllergy}
            returnKeyType="done"
            editable={!updating}
          />
          <TouchableOpacity onPress={handleAddAllergy} activeOpacity={0.7} disabled={updating}>
            <Ionicons name="add-circle" size={20} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Equipment */}
      <Text className="mb-2 font-visby-bold text-sm text-gray-500 dark:text-gray-400">
        Kitchen Equipment
      </Text>
      <View className="flex-row flex-wrap gap-2">
        {preferences.whatsInYourKitchen.map((item) => (
          <TouchableOpacity
            key={item}
            onPress={() => handleToggleEquipment(item)}
            disabled={updating}
            className="flex-row items-center rounded-full border border-gray-900 bg-gray-900 px-4 py-2 dark:border-gray-700 dark:bg-gray-700"
          >
            <Text className="mr-1 font-visby text-xs font-bold text-white">{item}</Text>
            <Ionicons name="close" size={12} color="white" />
          </TouchableOpacity>
        ))}
        {/* Add Logic */}
        <View className="flex-row items-center rounded-full border border-gray-200 bg-gray-50 px-3 py-1 dark:border-gray-700 dark:bg-gray-800">
          <TextInput
            value={newEquipment}
            onChangeText={setNewEquipment}
            placeholder="Add tool..."
            placeholderTextColor="#9CA3AF"
            className="w-24 p-1 font-visby text-xs text-gray-900 dark:text-gray-100"
            onSubmitEditing={handleAddEquipment}
            returnKeyType="done"
            editable={!updating}
          />
          <TouchableOpacity onPress={handleAddEquipment} activeOpacity={0.7} disabled={updating}>
            <Ionicons
              name="add-circle"
              size={20}
              color="#111827"
              className="text-gray-900 dark:text-gray-300"
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Suggestions */}
      <View className="mt-2 flex-row flex-wrap gap-2">
        {EQUIPMENT_OPT.filter((e) => !preferences.whatsInYourKitchen.includes(e)).map((e) => (
          <TouchableOpacity 
            key={e} 
            onPress={() => handleToggleEquipment(e)}
            disabled={updating}
          >
            <Text className="text-xs text-gray-400 underline decoration-dotted dark:text-gray-500">
              + {e}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

export default function SettingsScreen() {
  const router = useRouter();
  const syncPreferences = usePreferencesStore((state) => state.sync);

  const [signOutAlertVisible, setSignOutAlertVisible] = React.useState(false);

  useEffect(() => {
    syncPreferences();
  }, [syncPreferences]);

  // Get navigation object to reset history
  const navigation = useNavigation();

  const handleSignOut = () => {
    setSignOutAlertVisible(true);
  };

  const confirmSignOut = async () => {
    try {
      // 1. Reset Subscription Store (RevenueCat Logout & Clear State)
      await useSubscriptionStore.getState().reset();
      
      // 2. Sign Out Auth
      await useAuthStore.getState().signOut();
      
      setSignOutAlertVisible(false);
      
      // Reset navigation history to prevent going back
      // This resets the Root Stack to the Auth stack
      if (navigation && navigation.reset) {
        navigation.reset({
          index: 0,
          routes: [{ name: '(auth)', params: { screen: 'sign-in' } }],
        } as any);
      } else {
        // Fallback if reset is not available
        router.replace('/(auth)/sign-in');
      }
    } catch (error) {
      console.error('Sign out error:', error);
      showAlert('Error', 'Failed to sign out. Please try again.', undefined, {
        icon: <Danger size={32} color="#EF4444" variant="Bold" />,
        type: 'destructive',
      });
    }
  };

  const handleClearChatHistory = () => {
    showAlert(
      'Clear Chat History',
      'Are you sure you want to delete all chat history? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await AIService.clearHistory();
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              showAlert('Success', 'Chat history cleared successfully', undefined, {
                icon: <TickCircle size={32} color="#10B981" variant="Bold" />,
              });
            } catch (e) {
              showAlert('Error', 'Failed to clear chat history', undefined, {
                icon: <Danger size={32} color="#EF4444" variant="Bold" />,
                type: 'destructive',
              });
            }
          },
        },
      ],
      {
        icon: <Trash size={32} color="#EF4444" variant="Bold" />,
        type: 'destructive',
      },
    );
  };

  return (
    <Container noPadding>
      {/* Header */}
      <View className="flex-row items-center border-b border-gray-100 px-4 pb-4 pt-2 dark:border-gray-800">
        <TouchableOpacity onPress={() => router.back()} className="mr-4">
          <Ionicons name="chevron-back" size={28} className="text-black dark:text-white" />
        </TouchableOpacity>
        <Text className="font-visby-bold text-xl text-black dark:text-white">Settings</Text>
      </View>

      <ScrollView className="flex-1 p-6">
        {/* Subscription Component */}
        <SubscriptionCard />

        {/* Section: Personalization */}
        <PersonalizationSection />



        {/* Section: Account */}
        <View className="mb-8">
          <Text className="mb-4 font-visby-bold text-lg text-gray-900 dark:text-gray-100">
            Account
          </Text>

          {/* Clear Chat History */}
          {/* <TouchableOpacity
            onPress={handleClearChatHistory}
            className="mb-3 flex-row items-center justify-between rounded-2xl border border-orange-100 bg-orange-50 p-4 dark:border-orange-900/50 dark:bg-orange-900/20"
          >
            <View className="flex-row items-center gap-3">
              <Ionicons name="trash-outline" size={24} color="#F97316" />
              <Text className="font-visby-bold text-base text-orange-600 dark:text-orange-500">
                Clear Chat History
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#F97316" />
          </TouchableOpacity> */}

          <TouchableOpacity
            onPress={handleSignOut}
            className="flex-row items-center justify-between rounded-2xl border border-red-100 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-900/20"
          >
            <View className="flex-row items-center gap-3">
              <Ionicons name="log-out-outline" size={24} color="#EF4444" />
              <Text className="font-visby-bold text-base text-red-500">Logout</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#EF4444" />
          </TouchableOpacity>
        </View>

        {/* Version Info */}
        <View className="mt-auto items-center">
          <Text className="font-visby text-xs text-gray-400 dark:text-gray-600">Recook v1.0.0</Text>
        </View>
      </ScrollView>

      <CustomAlertModal
        visible={signOutAlertVisible}
        title="Sign Out"
        message="Are you sure you want to sign out?"
        onClose={() => setSignOutAlertVisible(false)}
        onConfirm={confirmSignOut}
        confirmText="Sign Out"
        type="destructive"
        icon="log-out-outline"
      />
    </Container>
  );
}
