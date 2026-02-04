import { Ionicons } from '@expo/vector-icons';
import React, { useEffect } from 'react';
import { useAuthStore } from '@/lib/store/authStore';

import { Alert, Text, TouchableOpacity, View, ScrollView, TextInput } from 'react-native';
import { ThemeSelector } from '@/components/ThemeSelector';
import { Container } from '@/components/Container';
import { SubscriptionCard } from '@/components/SubscriptionCard';
import { CustomAlertModal } from '@/components/CustomAlertModal';

import { usePreferencesStore } from '@/lib/store/preferencesStore';
import { useRouter } from 'expo-router';
import { AIService } from '@/lib/services/aiService';
import { showAlert } from '@/lib/utils/globalAlert';
import { Danger, Trash, TickCircle } from 'iconsax-react-native';
import * as Haptics from 'expo-haptics';

const ALLERGIES_OPT = ['Peanuts', 'Seafood', 'Dairy', 'Gluten', 'Eggs', 'Soy'];
const EQUIPMENT_OPT = ['Oven', 'Blender', 'Air Fryer', 'Microwave', 'Mixer'];

const PersonalizationSection = () => {
  const { preferences, toggleAllergy, toggleEquipment } = usePreferencesStore();
  const [newAllergy, setNewAllergy] = React.useState('');
  const [newEquipment, setNewEquipment] = React.useState('');

  const handleAddAllergy = () => {
    if (newAllergy.trim()) {
      toggleAllergy(newAllergy.trim());
      setNewAllergy('');
    }
  };

  const handleAddEquipment = () => {
    if (newEquipment.trim()) {
      toggleEquipment(newEquipment.trim());
      setNewEquipment('');
    }
  };

  return (
    <View className="mb-8">
      <Text className="mb-4 font-visby-bold text-lg text-gray-900 dark:text-gray-100">
        Personalization
      </Text>

      {/* Allergies */}
      <Text className="mb-2 font-visby-bold text-sm text-gray-500 dark:text-gray-400">
        Allergies / Restrictions
      </Text>
      <View className="mb-4 flex-row flex-wrap gap-2">
        {preferences.allergies.map((item) => (
          <TouchableOpacity
            key={item}
            onPress={() => toggleAllergy(item)}
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
          />
          <TouchableOpacity onPress={handleAddAllergy} activeOpacity={0.7}>
            <Ionicons name="add-circle" size={20} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Equipment */}
      <Text className="mb-2 font-visby-bold text-sm text-gray-500 dark:text-gray-400">
        Kitchen Equipment
      </Text>
      <View className="flex-row flex-wrap gap-2">
        {preferences.equipment.map((item) => (
          <TouchableOpacity
            key={item}
            onPress={() => toggleEquipment(item)}
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
          />
          <TouchableOpacity onPress={handleAddEquipment} activeOpacity={0.7}>
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
        {EQUIPMENT_OPT.filter((e) => !preferences.equipment.includes(e)).map((e) => (
          <TouchableOpacity key={e} onPress={() => toggleEquipment(e)}>
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

  const handleSignOut = () => {
    setSignOutAlertVisible(true);
  };

  const confirmSignOut = async () => {
    try {
      await useAuthStore.getState().signOut();
      setSignOutAlertVisible(false);
      router.replace('/(auth)/sign-in');
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

        {/* Section: App Settings */}
        {/* <View className="mb-8">
          <Text className="mb-4 font-visby-bold text-lg text-gray-900 dark:text-gray-100">
            App Preferences
          </Text>
          <ThemeSelector />
        </View> */}

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
