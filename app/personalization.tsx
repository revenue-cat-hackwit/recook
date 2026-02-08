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
import { useAuthStore } from '@/lib/store/authStore';
import { supabase } from '@/lib/supabase';
import { PersonalizationService } from '@/lib/services/personalizationService';
import { showAlert } from '@/lib/utils/globalAlert';
import { Danger, TickCircle, Logout } from 'iconsax-react-native';
import StepIndicator from '@/components/StepIndicator';
import SelectableCard from '@/components/SelectableCard';
import { useSubscriptionStore } from '@/lib/store/subscriptionStore';

export default function PersonalizationScreen() {
  const router = useRouter();
  const signOut = useAuthStore((state) => state.signOut);
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
  const [checkingPersonalization, setCheckingPersonalization] = useState(true);

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
    checkUserPersonalization();
    fetchRefData();
  }, []);

  const checkUserPersonalization = async () => {
    try {
      setCheckingPersonalization(true);
      const result = await PersonalizationService.checkPersonalization();

      if (result.success && result.data.hasPersonalization) {
        // User already has personalization data, redirect to feed
        console.log('✅ User has personalization, redirecting to feed');
        completeOnboarding();
        router.replace('/(tabs)/feed');
      } else {
        // User needs to fill personalization
        console.log('📝 User needs to fill personalization data');
      }
    } catch (error) {
      console.error('Error checking personalization:', error);
      // Continue to show personalization form on error
    } finally {
      setCheckingPersonalization(false);
    }
  };

  const fetchRefData = async () => {
    const baseUrl = 'https://pxhoqlzgkyflqlaixzkv.supabase.co/storage/v1/object/public/onboarding_assets';

    // Fallback data with images from Supabase storage
    const fallbackCuisines = [
      { name: 'Indonesia', image_path: `${baseUrl}/indonesian.png` },
      { name: 'Italian', image_path: `${baseUrl}/italian.png` },
      { name: 'Japanese', image_path: `${baseUrl}/japan.png` },
      { name: 'Chinese', image_path: `${baseUrl}/chinese.png` },
      { name: 'Thai', image_path: `${baseUrl}/Thai.png` },
      { name: 'Korean', image_path: `${baseUrl}/Korean.png` },
    ];
    const fallbackTastePreferences = [
      { name: 'Too Spicy', image_path: `${baseUrl}/spicy.png` },
      { name: 'Strong Spices / Herbs', image_path: `${baseUrl}/herbs.png` },
      { name: 'Too Sweet', image_path: `${baseUrl}/sweet.png` },
      { name: 'Too Salty', image_path: `${baseUrl}/salty.png` },
      { name: 'Oily / Fatty Food', image_path: `${baseUrl}/bitter.png` },
      { name: 'Sour / Acidic', image_path: `${baseUrl}/sour.png` },
    ];
    const fallbackAllergies = [
      { name: 'Peanuts', image_path: `${baseUrl}/peanut.png` },
      { name: 'Seafood', image_path: `${baseUrl}/seafood.png` },
      { name: 'Dairy / Lactose', image_path: `${baseUrl}/dairy.png` },
      { name: 'Gluten', image_path: `${baseUrl}/gluten.png` },
    ];
    const fallbackEquipment = [
      { name: 'Pressure Cooker', image_path: `${baseUrl}/pressure.png` },
      { name: 'Oven', image_path: `${baseUrl}/oven.png` },
      { name: 'Air Fryer', image_path: `${baseUrl}/airfryer.png` },
      { name: 'Microwave', image_path: `${baseUrl}/microwave.png` },
      { name: 'Steamer', image_path: `${baseUrl}/steamer.png` },
      { name: 'Chopper', image_path: `${baseUrl}/chopper.png` },
      { name: 'Mixer', image_path: `${baseUrl}/mixer.png` },
      { name: 'Grill Pan', image_path: `${baseUrl}/grill.png` },
    ];

    try {
      // Fetch cuisines with image paths
      const { data: cData } = await supabase.from('reference_cuisines').select('name, image_path');
      setCuisinesOpt(cData && cData.length > 0 ? cData : fallbackCuisines);

      // Fetch taste preferences with image paths
      const { data: tData } = await supabase
        .from('reference_taste_preferences')
        .select('name, image_path');
      setTastePreferencesOpt(tData && tData.length > 0 ? tData : fallbackTastePreferences);

      // Fetch allergies with image paths
      const { data: aData } = await supabase.from('reference_allergies').select('name, image_path');
      setAllergiesOpt(aData && aData.length > 0 ? aData : fallbackAllergies);

      // Fetch equipment with image paths
      const { data: eData } = await supabase.from('reference_equipment').select('name, image_path');
      setEquipmentOpt(eData && eData.length > 0 ? eData : fallbackEquipment);
    } catch (e) {
      console.error('Failed to fetch onboarding references', e);
      // Use fallback data on error
      setCuisinesOpt(fallbackCuisines);
      setTastePreferencesOpt(fallbackTastePreferences);
      setAllergiesOpt(fallbackAllergies);
      setEquipmentOpt(fallbackEquipment);
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

  const handleLogout = async () => {
    showAlert(
      'Logout',
      'Are you sure you want to logout? Your progress will be saved.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              // Reset Subscription Store (RevenueCat Logout)
              await useSubscriptionStore.getState().reset();

              await signOut();
              router.replace('/(auth)/sign-in');
            } catch (error) {
              console.error('Logout error:', error);
            }
          },
        },
      ],
      {
        type: 'destructive',
      }
    );
  };

  const handleFinish = async () => {
    try {
      setLoading(true);

      // Prepare data for API
      const personalizationData = {
        favoriteCuisines: preferences.favoriteCuisines,
        tastePreferences: preferences.tastePreferences,
        foodAllergies: preferences.foodAllergies,
        whatsInYourKitchen: preferences.whatsInYourKitchen,
        otherTools: otherTools.split(',').map(tool => tool.trim()).filter(tool => tool.length > 0),
      };

      // Save to backend API
      const result = await PersonalizationService.savePersonalization(personalizationData);

      if (result.success) {
        console.log('Personalization saved:', result.data.personalization.id);

        // Mark onboarding as complete in local state
        completeOnboarding();

        showAlert(
          'Setup Complete!',
          'Your personalized cooking experience is ready',
          undefined,
          {
            icon: <TickCircle size={32} color="#10B981" variant="Bold" />,
          }
        );

        router.replace('/(tabs)/feed');
      }
    } catch (error: any) {
      console.error('Error finishing onboarding:', error);
      showAlert(
        'Error',
        error.message || 'Failed to complete setup. Please try again.',
        undefined,
        {
          icon: <Danger size={32} color="#EF4444" variant="Bold" />,
          type: 'destructive',
        }
      );
    } finally {
      setLoading(false);
    }
  };

  if (checkingPersonalization || loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#8BD65E" />
        <Text className="mt-4 font-visby text-gray-500">
          {checkingPersonalization ? 'Checking your profile...' : 'Loading preferences...'}
        </Text>
      </View>
    );
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <>
            <View className="mb-8 items-center">
              <Text className="mb-3 text-center font-visby-bold text-3xl text-gray-900">
                Favorite Cuisines
              </Text>
              <View className="h-1 w-16 rounded-full bg-[#8BD65E]" />
              <Text className="mt-4 text-center font-visby text-base leading-6 text-gray-600">
                Select the cuisines you love the most
              </Text>
            </View>

            <View className="flex-row flex-wrap justify-between gap-y-4">
              {cuisinesOpt.map((item) => (
                <SelectableCard
                  key={item.name}
                  label={item.name}
                  imagePath={item.image_path || undefined}
                  isSelected={preferences.favoriteCuisines?.includes(item.name) ?? false}
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
            <View className="mb-8 items-center">
              <Text className="mb-3 text-center font-visby-bold text-3xl text-gray-900">
                Taste Preferences
              </Text>
              <View className="h-1 w-16 rounded-full bg-[#8BD65E]" />
              <Text className="mt-4 text-center font-visby text-base leading-6 text-gray-600">
                Select any flavors you prefer to avoid
              </Text>
            </View>

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
            <View className="mb-8 items-center">
              <Text className="mb-3 text-center font-visby-bold text-3xl text-gray-900">
                Food Allergies
              </Text>
              <View className="h-1 w-16 rounded-full bg-[#8BD65E]" />
              <Text className="mt-4 text-center font-visby text-base leading-6 text-gray-600">
                Help us keep you safe by selecting any allergies
              </Text>
            </View>

            <View className="flex-row flex-wrap justify-between gap-y-4">
              {allergiesOpt.map((item) => (
                <SelectableCard
                  key={item.name}
                  label={item.name}
                  imagePath={item.image_path || undefined}
                  isSelected={preferences.foodAllergies?.includes(item.name) ?? false}
                  onPress={() => toggleAllergy(item.name)}
                />
              ))}
            </View>
          </>
        );

      case 4:
        return (
          <>
            <View className="mb-8 items-center">
              <Text className="mb-3 text-center font-visby-bold text-3xl text-gray-900">
                Kitchen Equipment
              </Text>
              <View className="h-1 w-16 rounded-full bg-[#8BD65E]" />
              <Text className="mt-4 text-center font-visby text-base leading-6 text-gray-600">
                Select your available tools for personalized recipes
              </Text>
            </View>

            <View className="flex-row flex-wrap justify-between gap-y-4">
              {equipmentOpt.map((item) => (
                <SelectableCard
                  key={item.name}
                  label={item.name}
                  imagePath={item.image_path || undefined}
                  isSelected={preferences.whatsInYourKitchen?.includes(item.name) ?? false}
                  onPress={() => toggleEquipment(item.name)}
                />
              ))}
            </View>

            {/* Other Tools Input */}
            <View className="mb-20 mt-8">
              <Text className="mb-3 font-visby-bold text-base text-gray-900">Other Tools (Optional)</Text>
              <TextInput
                value={otherTools}
                onChangeText={setOtherTools}
                placeholder="e.g., Rice Cooker, Blender, Food Processor..."
                placeholderTextColor="#9CA3AF"
                className="min-h-[100px] rounded-2xl border-2 border-gray-200 bg-gray-50 px-5 py-4 font-visby text-base text-gray-900"
                multiline
                textAlignVertical="top"
                style={{
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.05,
                  shadowRadius: 2,
                  elevation: 1,
                }}
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
      {/* Header with Back Button and Logout */}
      <View className="flex-row items-center justify-between px-6 pb-6 pt-4">
        {currentStep > 1 ? (
          <TouchableOpacity
            onPress={handleBack}
            className="rounded-full bg-gray-100 p-2.5"
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={22} color="#1F2937" />
          </TouchableOpacity>
        ) : (
          <View className="w-10" />
        )}

        <StepIndicator currentStep={currentStep} totalSteps={4} />

        <TouchableOpacity
          onPress={handleLogout}
          className="rounded-full bg-red-50 p-2.5"
          activeOpacity={0.7}
        >
          <Logout size={22} color="#EF4444" variant="Outline" />
        </TouchableOpacity>
      </View>

      <ScrollView
        className="flex-1 px-6"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 20 }}
      >
        {renderStepContent()}
      </ScrollView>

      {/* Next Button */}
      <View className="border-t border-gray-100 bg-white px-6 pb-8 pt-4">
        <TouchableOpacity
          onPress={handleNext}
          disabled={loading}
          activeOpacity={0.8}
          className="w-full flex-row items-center justify-center rounded-2xl bg-[#8BD65E] py-4 shadow-lg"
          style={{
            shadowColor: '#8BD65E',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 6,
          }}
        >
          {loading ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <>
              <Text className="mr-2 font-visby-bold text-lg text-white">
                {currentStep === 4 ? "Let's Cook! 🍳" : 'Continue'}
              </Text>
              <Ionicons name="arrow-forward" size={22} color="white" />
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
