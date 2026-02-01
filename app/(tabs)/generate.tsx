import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert, // Keep for confirmation dialogs if needed, or remove
  ActivityIndicator,
} from 'react-native';
import { Recipe } from '@/lib/types';
import { RecipeService } from '@/lib/services/recipeService';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Image as ExpoImage } from 'expo-image';
import Toast, { ToastRef } from '@/components/Toast';
import { useSubscriptionStore } from '@/lib/store/subscriptionStore';
import { useShoppingListStore } from '@/lib/store/shoppingListStore';
import RevenueCatUI from 'react-native-purchases-ui';

import { usePreferencesStore } from '@/lib/store/preferencesStore';
import * as Haptics from 'expo-haptics';

import { ChefLoading } from '@/components/ChefLoading';

import { useRecipeGenerator } from '@/lib/hooks/useRecipeGenerator';
import { RecipeDetailModal } from '@/components/recipes/RecipeDetailModal';
import { useRecipeStorage } from '@/lib/hooks/useRecipeStorage';

export default function GenerateScreen() {
  // Dependencies
  const preferences = usePreferencesStore((state) => state.preferences);
  const { initialize } = useSubscriptionStore();
  const addToShoppingList = useShoppingListStore((state) => state.addMultiple);
  const toastRef = useRef<ToastRef>(null);
  
  // Storage for manual saving
  const { saveRecipe } = useRecipeStorage();

  // Manual Creation State
  const [manualModalVisible, setManualModalVisible] = useState(false);
  const [tempManualRecipe, setTempManualRecipe] = useState<Recipe | null>(null);

  // Paywall Logic
  const handlePresentPaywall = async () => {
    const paywallResult = await RevenueCatUI.presentPaywall();
    if (
      paywallResult === RevenueCatUI.PAYWALL_RESULT.PURCHASED ||
      paywallResult === RevenueCatUI.PAYWALL_RESULT.RESTORED
    ) {
      await initialize();
    }
  };

  // Logic Hook
  const {
    videoUrl,
    setVideoUrl,
    uploadedFiles,
    setUploadedFiles,
    loading,
    loadingMessage,
    uploading,
    currentRecipe,
    setCurrentRecipe,
    removeFile,
    handleUploadMultiple,
    generate,
  } = useRecipeGenerator({
    preferences,
    toastRef,
    onPaywallRequest: handlePresentPaywall,
  });

  // Media Pickers
  const handlePickMedia = async () => {
    if (uploadedFiles.length >= 5) {
      toastRef.current?.show('Max 5 photos/videos at once.', 'error');
      return;
    }
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permissionResult.granted === false) {
      toastRef.current?.show('Gallery Permission Denied', 'error');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsEditing: false,
      allowsMultipleSelection: true,
      selectionLimit: 5 - uploadedFiles.length,
      quality: 0.5,
    });
    if (!result.canceled) handleUploadMultiple(result.assets);
  };

  const handleLaunchCamera = async () => {
    if (uploadedFiles.length >= 5) {
      toastRef.current?.show('Max 5 photos/videos at a time.', 'error');
      return;
    }
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (!permissionResult.granted) {
      toastRef.current?.show('Camera Permission Denied', 'error');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsEditing: false,
      quality: 0.5,
      // aspect: [4, 3], // Optional: standard aspect ratio
    });
    if (!result.canceled) handleUploadMultiple(result.assets);
  };

  // ... renderRecipeCard ... (omitted from replace unless modified)

  const renderRecipeCard = (recipe: Recipe, isBrief = false) => (
    <View className="mb-4 rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
      <View className="mb-2 flex-row items-start justify-between">
        <View className="mr-2 flex-1">
          <Text className="mb-1 font-visby-bold text-2xl leading-tight text-gray-900">
            {recipe.title}
          </Text>
          <Text className="mb-4 font-visby text-sm text-gray-500">{recipe.description}</Text>
        </View>
        <TouchableOpacity
          onPress={() => (isBrief ? setCurrentRecipe(recipe) : null)}
          className="rounded-full bg-gray-50 p-2"
        >
          <Ionicons
            name={isBrief ? 'chevron-forward' : 'checkmark-circle'}
            size={22}
            color={isBrief ? '#FF6B6B' : '#4CAF50'}
          />
        </TouchableOpacity>
      </View>

      <View className="mb-6 flex-row space-x-4 border-t border-gray-100 pt-2">
        <View className="items-center">
          <Ionicons name="time-outline" size={18} color="#666" />
          <Text className="mt-1 font-visby text-xs text-gray-500">{recipe.time_minutes} m</Text>
        </View>
        <View className="items-center">
          <Ionicons name="flame-outline" size={18} color="#666" />
          <Text className="mt-1 font-visby text-xs text-gray-500">
            {recipe.calories_per_serving} kcal
          </Text>
        </View>
        <View className="items-center">
          <Ionicons name="restaurant-outline" size={18} color="#666" />
          <Text className="mt-1 font-visby text-xs text-gray-500">{recipe.servings} servings</Text>
        </View>
        <View className="items-center">
          <Ionicons name="barbell-outline" size={18} color="#666" />
          <Text className="mt-1 font-visby text-xs text-gray-500">{recipe.difficulty}</Text>
        </View>
      </View>

      {!isBrief && (
        <>
          <View className="mb-6">
            <View className="mb-3 flex-row items-center justify-between">
              <Text className="font-visby-bold text-lg text-gray-900">🛒 Ingredients</Text>
              {!isBrief && (
                <TouchableOpacity
                  onPress={() => {
                    addToShoppingList(recipe.ingredients, recipe.title);
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    toastRef.current?.show('Added to Shopping List', 'success');
                  }}
                >
                  <Text className="font-visby-bold text-xs text-[#CC5544]">+ Add to List</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Community Publish Button - NEW */}
            {!isBrief && (
              <TouchableOpacity
                onPress={async () => {
                  try {
                    const { CommunityService } = await import('@/lib/services/communityService');
                    await CommunityService.publishRecipe(recipe);
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    toastRef.current?.show('Published to Community Feed!', 'success');
                    Alert.alert('Success', 'Your recipe is now live on the Community Feed! 🌍');
                  } catch (e) {
                    Alert.alert('Error', 'Failed to publish recipe.');
                  }
                }}
                className="mb-4 flex-row items-center justify-center rounded-xl border border-blue-100 bg-blue-50 py-3"
              >
                <Ionicons
                  name="globe-outline"
                  size={18}
                  color="#3B82F6"
                  style={{ marginRight: 8 }}
                />
                <Text className="font-visby-bold text-blue-600">Publish to Community</Text>
              </TouchableOpacity>
            )}
            {recipe.ingredients.map((ing, idx) => (
              <View key={idx} className="mb-2 flex-row items-center">
                <View className="mr-3 h-1.5 w-1.5 rounded-full bg-red-400" />
                <Text className="flex-1 font-visby text-base text-gray-700">{ing}</Text>
              </View>
            ))}
          </View>

          <View className="mb-6">
            <Text className="mb-3 font-visby-bold text-lg text-gray-900">🍳 Instructions</Text>
            {recipe.steps.map((step, idx) => (
              <View key={idx} className="mb-4 flex-row">
                <View className="mr-3 mt-0.5 h-6 w-6 items-center justify-center rounded-full bg-red-50">
                  <Text className="font-visby-bold text-xs text-red-500">{step.step}</Text>
                </View>
                <Text className="flex-1 font-visby text-base leading-6 text-gray-700">
                  {step.instruction}
                </Text>
              </View>
            ))}
          </View>

          {recipe.tips && (
            <View className="mb-4 rounded-xl bg-yellow-50 p-4">
              <Text className="mb-1 font-visby-bold text-yellow-800">💡 Chef&apos;s Tips</Text>
              <Text className="font-visby text-sm leading-5 text-yellow-700">{recipe.tips}</Text>
            </View>
          )}
        </>
      )}
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* LOADING OVERLAY */}
      {loading && <ChefLoading status={loadingMessage} />}
      
      <ScrollView className="flex-1 px-4 pt-4">
        {/* Header */}
        <View className="mb-6">
          <Text className="font-visby-bold text-3xl text-gray-900">AI Chef ‍🍳</Text>
          <Text className="mt-1 font-visby text-base text-gray-500">
            Paste link, upload photos, or create manually!
          </Text>
        </View>

        {/* Input Card */}
        <View className="mb-6 rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
          {uploadedFiles.length > 0 ? (
            /* Multi-File View */
            <View>
              <View className="mb-3 flex-row items-center justify-between">
                <Text className="font-visby-bold text-gray-900">
                  Selected Media ({uploadedFiles.length}/5)
                </Text>
                <TouchableOpacity onPress={() => setUploadedFiles([])}>
                  <Text className="font-visby text-xs text-red-500">Reset</Text>
                </TouchableOpacity>
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
                {uploadedFiles.map((url, index) => (
                  <View key={index} className="relative mr-3">
                    <ExpoImage
                      source={{ uri: url }}
                      style={{ width: 80, height: 80, borderRadius: 12 }}
                      contentFit="cover"
                    />
                    <TouchableOpacity
                      onPress={() => removeFile(url)}
                      className="absolute -right-2 -top-2 rounded-full bg-black/50 p-1"
                    >
                      <Ionicons name="close" size={14} color="white" />
                    </TouchableOpacity>
                  </View>
                ))}

                {uploadedFiles.length < 5 && (
                  <View className="flex-row gap-2">
                    <TouchableOpacity
                      onPress={handlePickMedia}
                      className="h-20 w-20 items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-50"
                    >
                      <Ionicons name="images" size={20} color="#9CA3AF" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={handleLaunchCamera}
                      className="h-20 w-20 items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-50"
                    >
                      <Ionicons name="camera" size={20} color="#9CA3AF" />
                    </TouchableOpacity>
                  </View>
                )}
              </ScrollView>
            </View>
          ) : (
            /* Empty State: Paste Link OR Upload */
            <>
              {/* Opsi 1: Link Input */}
              <View className="mb-4 rounded-xl bg-gray-50 px-4 py-3">
                <TextInput
                  placeholder="Paste cooking video/photo link here..."
                  placeholderTextColor="#9CA3AF"
                  value={videoUrl}
                  onChangeText={setVideoUrl}
                  className="font-visby text-base text-gray-900"
                />
              </View>

              <Text className="mb-4 text-center text-xs text-gray-400">OR</Text>

              {/* Buttons Row */}
              <View className="mb-6 flex-row gap-3">
                {/* Gallery Button */}
                <TouchableOpacity
                  onPress={handlePickMedia}
                  disabled={uploading}
                  className="flex-1 flex-row items-center justify-center rounded-xl border border-gray-200 bg-white py-4 shadow-sm"
                >
                  <Ionicons
                    name="images-outline"
                    size={24}
                    color="#666"
                    style={{ marginRight: 8 }}
                  />
                  <Text className="font-visby-bold text-gray-600">Gallery</Text>
                </TouchableOpacity>

                {/* Camera Button */}
                <TouchableOpacity
                  onPress={handleLaunchCamera}
                  disabled={uploading}
                  className="flex-1 flex-row items-center justify-center rounded-xl border border-gray-200 bg-white py-4 shadow-sm"
                >
                  <Ionicons
                    name="camera-outline"
                    size={24}
                    color="#666"
                    style={{ marginRight: 8 }}
                  />
                  <Text className="font-visby-bold text-gray-600">Camera</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {/* Button Generate */}
          <TouchableOpacity
            onPress={generate}
            disabled={loading || (uploadedFiles.length === 0 && !videoUrl.trim())}
            className={`w-full flex-row items-center justify-center rounded-xl py-4 ${loading ? 'bg-gray-300' : 'bg-red-500 shadow-lg shadow-red-200'}`}
          >
            {loading ? (
              <>
                <ActivityIndicator color="white" className="mr-2" />
                <Text className="font-visby-bold text-lg text-white">{loadingMessage}</Text>
              </>
            ) : (
              <>
                <Ionicons name="sparkles" size={20} color="white" style={{ marginRight: 8 }} />
                <Text className="font-visby-bold text-lg text-white">Generate Recipe Now</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Result Area */}
        {currentRecipe && (
          <View>
            <View className="mb-4 flex-row items-center justify-between">
              <Text className="font-visby-bold text-xl text-gray-900">AI Analysis Result</Text>
              <TouchableOpacity onPress={() => setCurrentRecipe(null)}>
                <Text className="font-visby text-red-500">Close</Text>
              </TouchableOpacity>
            </View>
            {renderRecipeCard(currentRecipe)}
          </View>
        )}

        <View className="h-24" />
      </ScrollView>
    </SafeAreaView>
  );
}
