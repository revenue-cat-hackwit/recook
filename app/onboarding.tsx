import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { usePreferencesStore } from '@/lib/store/preferencesStore';
import { supabase } from '@/lib/supabase';
import StepIndicator from '@/components/StepIndicator';
import SelectableCard from '@/components/SelectableCard';

export default function OnboardingScreen() {
  const router = useRouter();
  const {
    preferences,
    toggleCuisine,
    toggleTastePreference,
    toggleAllergy,
    toggleEquipment,
    completeOnboarding,
  } = usePreferencesStore();

  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(true);

  // Reference Data Options - now includes image paths
  interface RefOption {
    name: string;
    image_path: string | null;
  }
  const [cuisinesOpt, setCuisinesOpt] = useState<RefOption[]>([]);
  const [tastePreferencesOpt, setTastePreferencesOpt] = useState<RefOption[]>([]);
  const [allergiesOpt, setAllergiesOpt] = useState<RefOption[]>([]);
  const [equipmentOpt, setEquipmentOpt] = useState<RefOption[]>([]);
  const [otherTools, setOtherTools] = useState('');

  useEffect(() => {
    fetchRefData();
  }, []);

  const fetchRefData = async () => {
    try {
      // Fetch cuisines with image paths
      const { data: cData } = await supabase.from('reference_cuisines').select('name, image_path');
      if (cData) setCuisinesOpt(cData);

      // Fetch taste preferences with image paths
      const { data: tData } = await supabase
        .from('reference_taste_preferences')
        .select('name, image_path');
      if (tData) setTastePreferencesOpt(tData);

      // Fetch allergies with image paths
      const { data: aData } = await supabase.from('reference_allergies').select('name, image_path');
      if (aData) setAllergiesOpt(aData);

      // Fetch equipment with image paths
      const { data: eData } = await supabase.from('reference_equipment').select('name, image_path');
      if (eData) setEquipmentOpt(eData);
    } catch (e) {
      console.error('Failed to fetch onboarding references', e);
      // Fallback data (without images)
      setCuisinesOpt([
        { name: 'Indonesia', image_path: null },
        { name: 'Italian', image_path: null },
        { name: 'Japanese', image_path: null },
        { name: 'Chinese', image_path: null },
        { name: 'Thai', image_path: null },
        { name: 'Korean', image_path: null },
      ]);
      setTastePreferencesOpt([
        { name: 'Too Spicy', image_path: null },
        { name: 'Strong Spices / Herbs', image_path: null },
        { name: 'Too Sweet', image_path: null },
        { name: 'Too Salty', image_path: null },
        { name: 'Oily / Fatty Food', image_path: null },
        { name: 'Sour / Acidic', image_path: null },
      ]);
      setAllergiesOpt([
        { name: 'Peanuts', image_path: null },
        { name: 'Seafood', image_path: null },
        { name: 'Dairy / Lactose', image_path: null },
        { name: 'Gluten', image_path: null },
      ]);
      setEquipmentOpt([
        { name: 'Pressure Cooker', image_path: null },
        { name: 'Oven', image_path: null },
        { name: 'Air Fryer', image_path: null },
        { name: 'Microwave', image_path: null },
        { name: 'Steamer', image_path: null },
        { name: 'Chopper', image_path: null },
        { name: 'Mixer', image_path: null },
        { name: 'Grill Pan', image_path: null },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    } else {
      handleFinish();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleFinish = () => {
    completeOnboarding();
    router.replace('/(tabs)/feed');
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#8BD65E" />
      </View>
    );
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <>
            <Text className="mb-2 text-center font-visby-bold text-2xl text-gray-900">
              Favorite Cuisines
            </Text>
            <Text className="mb-6 text-center font-visby text-sm text-gray-500">
              Select the regions you love the most
            </Text>

            <View className="flex-row flex-wrap justify-between gap-y-4">
              {cuisinesOpt.map((item) => (
                <SelectableCard
                  key={item.name}
                  label={item.name}
                  imagePath={item.image_path || undefined}
                  isSelected={preferences.cuisines?.includes(item.name) ?? false}
                  onPress={() => toggleCuisine(item.name)}
                  showBorder={true}
                />
              ))}
            </View>
          </>
        );

      case 2:
        return (
          <>
            <Text className="mb-2 text-center font-visby-bold text-2xl text-gray-900">
              Taste Preferences
            </Text>
            <Text className="mb-6 text-center font-visby text-sm text-gray-500">
              Are there any flavors you dislike?
            </Text>

            <View className="flex-row flex-wrap justify-between gap-y-4">
              {tastePreferencesOpt.map((item) => (
                <SelectableCard
                  key={item.name}
                  label={item.name}
                  imagePath={item.image_path || undefined}
                  isSelected={preferences.tastePreferences?.includes(item.name) ?? false}
                  onPress={() => toggleTastePreference(item.name)}
                />
              ))}
            </View>
          </>
        );

      case 3:
        return (
          <>
            <Text className="mb-2 text-center font-visby-bold text-2xl text-gray-900">
              Food Allergies
            </Text>
            <Text className="mb-6 text-center font-visby text-sm text-gray-500">
              Do you have any food allergies?
            </Text>

            <View className="flex-row flex-wrap justify-between gap-y-4">
              {allergiesOpt.map((item) => (
                <SelectableCard
                  key={item.name}
                  label={item.name}
                  imagePath={item.image_path || undefined}
                  isSelected={preferences.allergies?.includes(item.name) ?? false}
                  onPress={() => toggleAllergy(item.name)}
                />
              ))}
            </View>
          </>
        );

      case 4:
        return (
          <>
            <Text className="mb-2 text-center font-visby-bold text-2xl text-gray-900">
              What&apos;s in Your Kitchen?
            </Text>
            <Text className="mb-6 text-center font-visby text-sm text-gray-500">
              Select the tools you have so we can find recipes that fit your gear
            </Text>

            <View className="flex-row flex-wrap justify-between gap-y-4">
              {equipmentOpt.map((item) => (
                <SelectableCard
                  key={item.name}
                  label={item.name}
                  imagePath={item.image_path || undefined}
                  isSelected={preferences.equipment?.includes(item.name) ?? false}
                  onPress={() => toggleEquipment(item.name)}
                />
              ))}
            </View>

            {/* Other Tools Input */}
            <View className="mb-20 mt-6">
              <Text className="mb-2 font-visby-bold text-sm text-gray-700">Other tools</Text>
              <TextInput
                value={otherTools}
                onChangeText={setOtherTools}
                placeholder="Rice Cooker, Pisau Kecil, Piring Kayu..."
                placeholderTextColor="#9CA3AF"
                className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 font-visby text-sm text-gray-900"
                multiline
              />
            </View>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Header with Back Button */}
      <View className="flex-row items-center justify-between px-6 pt-8">
        {currentStep > 1 ? (
          <TouchableOpacity onPress={handleBack} className="p-2">
            <Ionicons name="arrow-back" size={24} color="#1F2937" />
          </TouchableOpacity>
        ) : (
          <View className="w-10" />
        )}

        <StepIndicator currentStep={currentStep} totalSteps={4} />

        <View className="w-10" />
      </View>

      <ScrollView className="flex-1 px-6 pt-8" showsVerticalScrollIndicator={false}>
        {renderStepContent()}
      </ScrollView>

      {/* Next Button */}
      <View className="px-6 pb-8 pt-8">
        <TouchableOpacity
          onPress={handleNext}
          className="w-full flex-row items-center justify-center rounded-2xl bg-[#8BD65E] py-4 shadow-lg shadow-green-200"
        >
          <Text className="mr-2 font-visby-bold text-lg text-white">
            {currentStep === 4 ? "Let's Cook" : 'Next'}
          </Text>
          <Ionicons name="arrow-forward" size={20} color="white" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
