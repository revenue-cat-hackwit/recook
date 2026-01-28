import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { usePreferencesStore } from '@/lib/store/preferencesStore';
import { supabase } from '@/lib/supabase';

export default function OnboardingScreen() {
  const router = useRouter();
  const { preferences, toggleAllergy, toggleEquipment, completeOnboarding } = usePreferencesStore();

  // Reference Data (Fetched from DB)
  const [allergiesOpt, setAllergiesOpt] = useState<string[]>([]);
  const [equipmentOpt, setEquipmentOpt] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRefData();
  }, []);

  const fetchRefData = async () => {
    try {
      const { data: aData } = await supabase.from('reference_allergies').select('name');
      if (aData) setAllergiesOpt(aData.map((d: any) => d.name));

      const { data: eData } = await supabase.from('reference_equipment').select('name');
      if (eData) setEquipmentOpt(eData.map((d: any) => d.name));
    } catch (e) {
      console.error('Failed to fetch onboarding references', e);
      // Fallback if network fails
      setAllergiesOpt(['Peanuts', 'Seafood', 'Dairy']);
      setEquipmentOpt(['Oven', 'Blender', 'Stove']);
    } finally {
      setLoading(false);
    }
  };

  const handleFinish = () => {
    completeOnboarding();
    router.replace('/(tabs)/feed');
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#CC5544" />
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView className="flex-1 px-6 pt-10">
        {/* Header */}
        <View className="mb-10 items-center">
          <View className="mb-4 h-20 w-20 items-center justify-center rounded-full bg-red-100">
            <Ionicons name="restaurant" size={40} color="#CC5544" />
          </View>
          <Text className="mb-2 text-center font-visby-bold text-3xl text-gray-900">
            Welcome Chef! 👨‍🍳
          </Text>
          <Text className="mb-8 text-center font-visby text-base text-gray-500">
            Let&apos;s personalize your experience
          </Text>
        </View>

        {/* 1. Allergies */}
        <View className="mb-8">
          <Text className="mb-4 font-visby-bold text-lg text-gray-900">
            ⛔ Allergies / Restrictions
          </Text>
          <View className="flex-row flex-wrap gap-3">
            {allergiesOpt.map((item) => {
              const isSelected = preferences.allergies.includes(item);
              return (
                <TouchableOpacity
                  key={item}
                  onPress={() => toggleAllergy(item)}
                  className={`rounded-full border px-5 py-3 ${isSelected ? 'border-red-500 bg-red-500' : 'border-gray-200 bg-gray-50'}`}
                >
                  <Text
                    className={`font-visby-bold text-sm ${isSelected ? 'text-white' : 'text-gray-600'}`}
                  >
                    {item}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* 2. Equipment */}
        <View className="mb-10">
          <Text className="mb-4 font-visby-bold text-lg text-gray-900">🔪 Kitchen Equipment</Text>
          <View className="flex-row flex-wrap gap-3">
            {equipmentOpt.map((item) => {
              const isSelected = preferences.equipment.includes(item);
              return (
                <TouchableOpacity
                  key={item}
                  onPress={() => toggleEquipment(item)}
                  className={`rounded-full border px-5 py-3 ${isSelected ? 'border-black bg-black' : 'border-gray-200 bg-gray-50'}`}
                >
                  <Text
                    className={`font-visby-bold text-sm ${isSelected ? 'text-white' : 'text-gray-600'}`}
                  >
                    {item}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Save Button */}
        <TouchableOpacity
          onPress={handleFinish}
          className="mb-10 w-full flex-row items-center justify-center rounded-2xl bg-[#CC5544] py-4 shadow-lg shadow-red-200"
        >
          <Text className="mr-2 font-visby-bold text-lg text-white">Let&apos;s Cook</Text>
          <Ionicons name="arrow-forward" size={20} color="white" />
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
