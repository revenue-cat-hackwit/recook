import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Recipe } from '@/lib/types';
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
import { CustomAlertModal } from '@/components/CustomAlertModal';
import { CustomCameraModal } from '@/components/CustomCameraModal';

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

  // Custom Camera State
  const [isCameraVisible, setIsCameraVisible] = useState(false);

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
    currentRecipe,
    setCurrentRecipe,
    removeFile,
    handleUploadMultiple,
    generate,
    alertConfig,
    hideAlert,
    showAlert,
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

  // Replace System Camera with Custom Camera Intent
  const handleLaunchCamera = async () => {
    if (uploadedFiles.length >= 5) {
      toastRef.current?.show('Max 5 photos/videos at a time.', 'error');
      return;
    }
    // Open Custom Camera
    setIsCameraVisible(true);
  };

  // Handle Photo from Custom Camera
  const handleCameraCapture = (uri: string) => {
    const asset: any = {
      uri,
      type: 'image',
      width: 1000,
      height: 1000,
    };
    handleUploadMultiple([asset]);
    setIsCameraVisible(false);
  };

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
            color={isBrief ? '#FF6B6B' : '#8BD65E'}
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
                    const ingredientsToAdd = recipe.ingredients.map((ing) => ({ name: ing }));
                    addToShoppingList(ingredientsToAdd, recipe.title);
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    toastRef.current?.show('Added to Shopping List', 'success');
                  }}
                >
                  <Text className="font-visby-bold text-xs text-[#8BD65E]">+ Add to List</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Community Publish Button */}
            {!isBrief && (
              <TouchableOpacity
                onPress={async () => {
                  try {
                    const { CommunityService } = await import('@/lib/services/communityService');
                    await CommunityService.publishRecipe(recipe);
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    toastRef.current?.show('Published to Community Feed!', 'success');
                    showAlert('Success', 'Your recipe is now live on the Community Feed! 🌍');
                  } catch (e) {
                    showAlert('Error', 'Failed to publish recipe.');
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

  const handleStartManual = () => {
    setTempManualRecipe({
      title: '',
      description: '',
      ingredients: [''],
      steps: [{ step: '1', instruction: '' }],
      time_minutes: '30',
      difficulty: 'Medium',
      servings: '2',
      calories_per_serving: '0',
      imageUrl: undefined,
      collections: [],
    } as Recipe);
    setManualModalVisible(true);
  };

  const handleSaveManual = async (recipe: Recipe) => {
    try {
      if (!recipe.title.trim()) {
        showAlert('Error', 'Please provide a title');
        return;
      }

      const saved = await saveRecipe(recipe);
      setManualModalVisible(false);

      // Show success
      showAlert('Recipe Created', 'Your recipe has been saved to your collection!', {
        confirmText: 'OK',
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      showAlert('Error', e.message);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* LOADING OVERLAY */}
      {loading && <ChefLoading status={loadingMessage} />}

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16 }}>
        {/* Header */}
        <View className="mb-8 mt-4">
          <Text className="font-visby-bold text-4xl leading-tight text-gray-900">
            Create{'\n'}Something <Text className="text-[#8BD65E]">Delicious</Text>
          </Text>
          <Text className="mt-2 font-visby text-base text-gray-500">
            Choose how you want to add your new recipe today.
          </Text>
        </View>

        {/* Option 1: AI Magic (Expanded) */}
        <View className="mb-6 rounded-3xl border border-gray-100 bg-white p-6 shadow-xl shadow-gray-100/50">
          <View className="mb-4 flex-row items-center gap-3">
            <View className="h-10 w-10 items-center justify-center">
              <ExpoImage
                source={require('@/assets/images/cooki.png')}
                style={{ width: 40, height: 40 }}
                contentFit="contain"
              />
            </View>
            <Text className="font-visby-bold text-xl text-gray-900">Magic Import (AI)</Text>
          </View>

          {uploadedFiles.length > 0 ? (
            <View className="mb-4">
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3">
                {uploadedFiles.map((url, i) => (
                  <View key={i} className="mr-3 h-20 w-20 overflow-hidden rounded-xl bg-gray-100">
                    <ExpoImage
                      source={{ uri: url }}
                      style={{ width: '100%', height: '100%' }}
                      contentFit="cover"
                    />
                    <TouchableOpacity
                      onPress={() => removeFile(url)}
                      className="absolute right-1 top-1 rounded-full bg-black/60 p-1"
                    >
                      <Ionicons name="close" size={10} color="white" />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
              <TouchableOpacity onPress={() => setUploadedFiles([])}>
                <Text className="text-center font-visby text-xs text-red-500">Reset Selection</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View className="mb-4 space-y-3">
              {/* URL Input */}
              <View className="flex-row items-center rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
                <Ionicons name="link" size={20} color="#9CA3AF" />
                <TextInput
                  placeholder="Paste Instagram/TikTok/YouTube link..."
                  placeholderTextColor="#9CA3AF"
                  value={videoUrl}
                  onChangeText={setVideoUrl}
                  className="ml-3 flex-1 font-visby text-gray-900"
                />
                {videoUrl.length > 0 && (
                  <TouchableOpacity onPress={() => setVideoUrl('')}>
                    <Ionicons name="close-circle" size={18} color="#9CA3AF" />
                  </TouchableOpacity>
                )}
              </View>

              <Text className="text-center font-visby text-xs text-gray-400">- OR -</Text>

              {/* Media Buttons */}
              <View className="flex-row gap-3">
                <TouchableOpacity
                  onPress={handlePickMedia}
                  className="flex-1 flex-row items-center justify-center gap-2 rounded-xl bg-gray-50 py-3 active:bg-gray-100"
                >
                  <Ionicons name="images-outline" size={20} color="#666" />
                  <Text className="font-visby-bold text-xs text-gray-600">Gallery</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleLaunchCamera}
                  className="flex-1 flex-row items-center justify-center gap-2 rounded-xl bg-gray-50 py-3 active:bg-gray-100"
                >
                  <Ionicons name="camera-outline" size={20} color="#666" />
                  <Text className="font-visby-bold text-xs text-gray-600">Camera</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          <TouchableOpacity
            onPress={generate}
            disabled={loading || (uploadedFiles.length === 0 && !videoUrl.trim())}
            className={`w-full flex-row items-center justify-center rounded-2xl py-4 shadow-lg ${
              loading || (uploadedFiles.length === 0 && !videoUrl.trim())
                ? 'bg-gray-200 shadow-none'
                : 'bg-[#8BD65E] shadow-green-200'
            }`}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <Text className="mr-2 font-visby-bold text-base text-white">Generate Recipe</Text>
                <Ionicons name="arrow-forward" size={20} color="white" />
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Option 2: Manual Entry */}
        <TouchableOpacity
          onPress={handleStartManual}
          className="active:scale-98 mb-8 flex-row items-center justify-between rounded-3xl border border-[#8BD65E]/30 bg-[#F0FDF4] p-6 shadow-xl shadow-green-100/50"
        >
          <View className="flex-1">
            <View className="mb-1 flex-row items-center gap-2">
              <Ionicons name="create-outline" size={22} color="#8BD65E" />
              <Text className="font-visby-bold text-lg text-[#8BD65E]">Write Manually</Text>
            </View>
            <Text className="font-visby text-sm text-gray-500">
              Create your own recipe from scratch
            </Text>
          </View>
          <View className="h-10 w-10 items-center justify-center rounded-full bg-[#8BD65E]/10">
            <Ionicons name="chevron-forward" size={24} color="#8BD65E" />
          </View>
        </TouchableOpacity>

        {/* Recently Generated / Result */}
        {currentRecipe && (
          <View className="mt-4">
            <View className="mb-4 flex-row items-center justify-between">
              <Text className="font-visby-bold text-xl text-gray-900">Recent Result</Text>
              <TouchableOpacity onPress={() => setCurrentRecipe(null)}>
                <Text className="font-visby-bold text-xs text-red-500">Clear</Text>
              </TouchableOpacity>
            </View>
            {renderRecipeCard(currentRecipe)}
          </View>
        )}
      </ScrollView>

      {/* Toast */}
      <Toast ref={toastRef} />

      {/* Custom Alert Modal */}
      <CustomAlertModal
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        confirmText={alertConfig.confirmText}
        cancelText={alertConfig.cancelText}
        showCancel={alertConfig.showCancel}
        onConfirm={alertConfig.onConfirm}
        onClose={hideAlert}
        type={alertConfig.type}
      />

      {/* Custom Camera Modal */}
      <CustomCameraModal
        visible={isCameraVisible}
        onClose={() => setIsCameraVisible(false)}
        onPhotoTaken={handleCameraCapture}
      />

      {/* Manual Creation Modal */}
      <RecipeDetailModal
        recipe={tempManualRecipe}
        visible={manualModalVisible}
        onClose={() => setManualModalVisible(false)}
        onUpdate={handleSaveManual}
        onDelete={() => setManualModalVisible(false)} // Cancel acts as delete for unsaved
        onShare={() => {}}
        initialMode="edit"
      />

      {/* View Generated Recipe Details Modal */}
      {currentRecipe && (
        <RecipeDetailModal
          recipe={currentRecipe}
          visible={!!currentRecipe}
          onClose={() => setCurrentRecipe(null)}
          onUpdate={async (updated) => {
            // If user edits the generated result, save it
            await saveRecipe(updated);
            setCurrentRecipe(null); // Close after save
            showAlert('Saved', 'Recipe saved to your collection.');
          }}
          onDelete={() => setCurrentRecipe(null)}
          onShare={() => {}}
        />
      )}
    </SafeAreaView>
  );
}
