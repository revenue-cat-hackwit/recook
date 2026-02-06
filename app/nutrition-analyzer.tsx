import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Container } from '@/components/Container';
import * as ImagePicker from 'expo-image-picker';
import { CustomCameraModal } from '@/components/CustomCameraModal';
import { NutritionAnalyzerService, NutritionInfo } from '@/lib/services/nutritionAnalyzerService';
import { showAlert } from '@/lib/utils/globalAlert';
import { Danger, TickCircle, Health, InfoCircle } from 'iconsax-react-native';

import { useColorScheme } from 'nativewind';

import { useLocalSearchParams } from 'expo-router';

export default function NutritionAnalyzerScreen() {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const params = useLocalSearchParams();
  
  const [analyzing, setAnalyzing] = useState(false);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [nutrition, setNutrition] = useState<NutritionInfo | null>(null);
  const [isCameraVisible, setIsCameraVisible] = useState(false);

  // Check for passed recipe
  React.useEffect(() => {
    if (params.recipeData) {
      try {
        const recipe = JSON.parse(params.recipeData as string);
        analyzeRecipeData(recipe);
      } catch (e) {
        console.error('Failed to parse recipe data', e);
      }
    }
  }, [params.recipeData]);

  const analyzeRecipeData = async (recipe: any) => {
    setAnalyzing(true);
    setNutrition(null);
    // Use recipe image if available, else placeholder
    setImageUri(recipe.imageUrl || 'https://placehold.co/600x400/png?text=Recipe'); 

    try {
      const result = await NutritionAnalyzerService.analyzeRecipe(recipe);
      setNutrition(result);
      
      showAlert(
        'Analysis Complete! 🎉',
        `Analyzed: ${result.foodName}`,
        undefined,
        {
          icon: <TickCircle size={32} color="#10B981" variant="Bold" />,
        }
      );
    } catch (error: any) {
      console.error('Analysis error:', error);
      showAlert('Analysis Failed', error.message);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleCameraCapture = async (uri: string) => {
    setImageUri(uri);
    setIsCameraVisible(false);
    await analyzeImage(uri);
  };

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
      await analyzeImage(result.assets[0].uri);
    }
  };

  const analyzeImage = async (uri: string) => {
    setAnalyzing(true);
    setNutrition(null);

    try {
      const result = await NutritionAnalyzerService.uploadAndAnalyze(uri);
      setNutrition(result);

      showAlert(
        'Analysis Complete! 🎉',
        `Found: ${result.foodName}`,
        undefined,
        {
          icon: <TickCircle size={32} color="#10B981" variant="Bold" />,
        }
      );
    } catch (error: any) {
      console.error('Analysis error:', error);
      showAlert(
        'Analysis Failed',
        error.message || 'Could not analyze the image. Please try again with a clear photo of food.',
        undefined,
        {
          icon: <Danger size={32} color="#EF4444" variant="Bold" />,
          type: 'destructive',
        }
      );
      setImageUri(null);
    } finally {
      setAnalyzing(false);
    }
  };

  const getHealthScoreColor = (score: number) => {
    if (score >= 80) return '#10B981';
    if (score >= 60) return '#F59E0B';
    return '#EF4444';
  };

  const getHealthScoreLabel = (score: number) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Poor';
  };

  return (
    <Container className="bg-white dark:bg-[#0F0F0F]" noPadding>
      {/* Header */}
      <View className="flex-row items-center justify-between border-b border-gray-100 bg-white px-5 py-4 dark:border-gray-800 dark:bg-[#0F0F0F]">
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={router.canGoBack() ? (colorScheme === 'dark' ? 'white' : 'black') : 'transparent'} />
        </TouchableOpacity>
        <Text className="font-visby-bold text-xl text-gray-900 dark:text-white">Nutrition Analyzer 🔬</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView className="flex-1 px-5 pt-4">
        {/* Upload Section */}
        {!imageUri && (
          <View className="mt-10 items-center">
            <View className="mb-6 h-32 w-32 items-center justify-center rounded-[40px] bg-green-50 shadow-sm dark:bg-green-900/20">
              <Health size={56} color="#8BD65E" variant="Bold" />
            </View>

            <Text className="mb-2 text-center font-visby-bold text-2xl text-gray-900 dark:text-white">
              Analyze Food Nutrition
            </Text>

            <Text className="mb-8 w-4/5 text-center font-visby text-base leading-6 text-gray-500 dark:text-gray-400">
              Take a photo or upload an image of your food to get instant AI-powered nutrition analysis
            </Text>

            <TouchableOpacity
              onPress={() => setIsCameraVisible(true)}
              className="mb-3 w-full flex-row items-center justify-center rounded-3xl bg-[#8BD65E] py-4 shadow-lg shadow-green-200 active:scale-95"
            >
              <Ionicons name="camera" size={24} color="white" style={{ marginRight: 8 }} />
              <Text className="font-visby-bold text-lg text-white">Take Photo</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handlePickImage}
              className="w-full flex-row items-center justify-center rounded-3xl border-2 border-green-200 bg-white py-4 active:scale-95 dark:border-green-800 dark:bg-gray-800"
            >
              <Ionicons name="images" size={24} color="#8BD65E" style={{ marginRight: 8 }} />
              <Text className="font-visby-bold text-lg text-green-600 dark:text-green-400">Choose from Gallery</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Analyzing State */}
        {analyzing && imageUri && (
          <View className="mt-10 items-center">
            <Image
              source={{ uri: imageUri }}
              className="mb-6 h-48 w-full rounded-2xl"
              resizeMode="cover"
            />
            <ActivityIndicator size="large" color="#8BD65E" />
            <Text className="mt-4 font-visby-bold text-lg text-gray-700 dark:text-gray-300">
              Analyzing nutrition...
            </Text>
            <Text className="mt-2 text-center font-visby text-gray-500 dark:text-gray-400">
              AI is examining your food image
            </Text>
          </View>
        )}

        {/* Results */}
        {nutrition && imageUri && !analyzing && (
          <View>
            {/* Food Image */}
            <View className="mb-4 overflow-hidden rounded-2xl shadow-sm">
              <Image
                source={{ uri: imageUri }}
                className="h-48 w-full"
                resizeMode="cover"
              />
            </View>

            {/* Food Name & Serving */}
            <View className="mb-4 rounded-2xl bg-white p-4 shadow-sm dark:bg-gray-800">
              <Text className="mb-1 font-visby-bold text-2xl text-gray-900 dark:text-white">
                {nutrition.foodName}
              </Text>
              <Text className="font-visby text-sm text-gray-500">
                Serving Size: {nutrition.servingSize}
              </Text>
              <View className="mt-2 flex-row items-center">
                <Text className="font-visby text-xs text-gray-400">
                  Confidence: {Math.round(nutrition.confidence * 100)}%
                </Text>
              </View>
            </View>

            {/* Health Score */}
            <View className="mb-4 overflow-hidden rounded-2xl bg-white shadow-sm dark:bg-gray-800">
              <View className="flex-row items-center justify-between p-4">
                <View className="flex-1">
                  <Text className="mb-1 font-visby-bold text-lg text-gray-900 dark:text-white">
                    Health Score
                  </Text>
                  <Text className="font-visby text-sm text-gray-500">
                    {getHealthScoreLabel(nutrition.healthScore)}
                  </Text>
                </View>
                <View className="items-center">
                  <View
                    className="h-16 w-16 items-center justify-center rounded-full"
                    style={{ backgroundColor: `${getHealthScoreColor(nutrition.healthScore)}20` }}
                  >
                    <Text
                      className="font-visby-bold text-2xl"
                      style={{ color: getHealthScoreColor(nutrition.healthScore) }}
                    >
                      {nutrition.healthScore}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Main Nutrition Facts */}
            <View className="mb-4 rounded-2xl bg-white p-4 shadow-sm dark:bg-gray-800">
              <Text className="mb-4 font-visby-bold text-lg text-gray-900 dark:text-white">
                Nutrition Facts
              </Text>

              <View className="mb-3 rounded-xl bg-green-50 p-3 dark:bg-green-900/20">
                <Text className="mb-1 font-visby text-xs text-gray-500 dark:text-gray-400">CALORIES</Text>
                <Text className="font-visby-bold text-3xl text-green-600">
                  {nutrition.calories}
                </Text>
              </View>

              <View className="space-y-3">
                <NutritionRow label="Protein" value={nutrition.protein} unit="g" color="#10B981" />
                <NutritionRow label="Carbs" value={nutrition.carbs} unit="g" color="#F59E0B" />
                <NutritionRow label="Fat" value={nutrition.fat} unit="g" color="#EF4444" />
                <NutritionRow label="Fiber" value={nutrition.fiber} unit="g" color="#8B5CF6" />
                <NutritionRow label="Sugar" value={nutrition.sugar} unit="g" color="#EC4899" />
                <NutritionRow label="Sodium" value={nutrition.sodium} unit="mg" color="#6B7280" />
              </View>
            </View>

            {/* Dietary Flags */}
            {nutrition.dietaryFlags && nutrition.dietaryFlags.length > 0 && (
              <View className="mb-4 rounded-2xl bg-white p-4 shadow-sm dark:bg-gray-800">
                <Text className="mb-3 font-visby-bold text-lg text-gray-900 dark:text-white">
                  Dietary Information
                </Text>
                <View className="flex-row flex-wrap gap-2">
                  {nutrition.dietaryFlags.map((flag, index) => (
                    <View
                      key={index}
                      className="rounded-full bg-green-100 px-3 py-1.5"
                    >
                      <Text className="font-visby-bold text-xs text-green-700">{flag}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Warnings */}
            {nutrition.warnings && nutrition.warnings.length > 0 && (
              <View className="mb-4 rounded-2xl bg-orange-50 p-4">
                <View className="mb-2 flex-row items-center">
                  <InfoCircle size={20} color="#F59E0B" variant="Bold" />
                  <Text className="ml-2 font-visby-bold text-sm text-orange-700">
                    Health Warnings
                  </Text>
                </View>
                {nutrition.warnings.map((warning, index) => (
                  <Text key={index} className="mb-1 font-visby text-sm text-orange-600">
                    • {warning}
                  </Text>
                ))}
              </View>
            )}

            {/* Recommendations */}
            <View className="mb-4 rounded-2xl bg-gradient-to-r from-purple-50 to-green-50 p-4">
              <Text className="mb-3 font-visby-bold text-sm text-purple-700">
                Health Recommendations
              </Text>
              {NutritionAnalyzerService.getHealthRecommendations(nutrition).map((rec, index) => (
                <Text key={index} className="mb-2 font-visby text-sm text-purple-600">
                  {rec}
                </Text>
              ))}
            </View>

            {/* Analyze Another Button */}
            <TouchableOpacity
              onPress={() => {
                setImageUri(null);
                setNutrition(null);
              }}
              className="mb-6 rounded-3xl bg-[#8BD65E] py-4 active:scale-95"
            >
              <Text className="text-center font-visby-bold text-lg text-white">
                Analyze Another Food
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <View className="h-10" />
      </ScrollView>

      {/* Custom Camera Modal */}
      <CustomCameraModal
        visible={isCameraVisible}
        onClose={() => setIsCameraVisible(false)}
        onPhotoTaken={handleCameraCapture}
      />
    </Container>
  );
}

// Helper Component for Nutrition Rows
function NutritionRow({
  label,
  value,
  unit,
  color,
}: {
  label: string;
  value: number;
  unit: string;
  color: string;
}) {
  return (
    <View className="flex-row items-center justify-between border-b border-gray-100 pb-3 dark:border-gray-700">
      <Text className="font-visby text-sm text-gray-700 dark:text-gray-300">{label}</Text>
      <View className="flex-row items-baseline">
        <Text className="font-visby-bold text-lg" style={{ color }}>
          {value}
        </Text>
        <Text className="ml-1 font-visby text-xs text-gray-500">{unit}</Text>
      </View>
    </View>
  );
}
