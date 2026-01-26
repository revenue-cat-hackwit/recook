import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Recipe } from '@/lib/types';
import { RecipeService } from '@/lib/services/recipeService';
import { useRecipeStorage } from '@/lib/hooks/useRecipeStorage';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';

export default function GenerateScreen() {
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Sedang Menganalisa...'); // NEW
  const [videoUrl, setVideoUrl] = useState('');
  const [currentRecipe, setCurrentRecipe] = useState<Recipe | null>(null);

  const { savedRecipes, saveRecipe, deleteRecipe } = useRecipeStorage();

  // File Upload State
  const [uploading, setUploading] = useState(false);
  const [uploadedFileUrl, setUploadedFileUrl] = useState<string | null>(null);

  const resetUpload = () => {
    setUploadedFileUrl(null);
    setVideoUrl('');
  };

  const handlePickVideo = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (permissionResult.granted === false) {
      Alert.alert('Izin Ditolak', 'Kamu perlu memberikan izin akses galeri untuk memilih video.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      allowsEditing: true, // Only for trimming
      quality: 0.5,
    });

    if (!result.canceled && result.assets[0].uri) {
      const asset = result.assets[0];

      // Limit 3 Menit (180 Detik)
      if (asset.duration && asset.duration > 180000) {
        Alert.alert(
          'Video Terlalu Panjang',
          'Maksimal durasi video adalah 3 menit. Silakan potong video Anda dulu.',
        );
        return;
      }

      handleUpload(asset.uri);
    }
  };

  const handleUpload = async (uri: string) => {
    setUploading(true);
    setVideoUrl(''); // Clear text input
    try {
      const publicUrl = await RecipeService.uploadVideo(uri);
      setUploadedFileUrl(publicUrl);
      Alert.alert('Sukses', "Video berhasil diupload! Klik 'Buat Resep' sekarang.");
    } catch (error: any) {
      Alert.alert('Upload Gagal', error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleGenerate = async () => {
    // Determine source: Text Link OR Uploaded File
    const targetUrl = uploadedFileUrl || videoUrl.trim();

    if (!targetUrl) {
      Alert.alert(
        'Input Kosong',
        'Tempel link video (TikTok/IG/YouTube) atau upload video sendiri.',
      );
      return;
    }

    setLoading(true);
    setLoadingMessage('Mengambil Video...'); // Initial message
    setCurrentRecipe(null);

    // Dynamic loading messages
    const messages = [
      'Menganalisa Video...',
      'Chef Sedang Menonton...',
      'Video sedang diproses...',
      'Sedang Menulis Resep...',
      'Hampir Selesai...',
    ];
    let msgIndex = 0;
    const interval = setInterval(() => {
      if (msgIndex < messages.length) {
        setLoadingMessage(messages[msgIndex]);
        msgIndex++;
      }
    }, 4000); // Change every 4 seconds

    try {
      console.log('Sending to AI, URL:', targetUrl);

      const generatedRecipe = await RecipeService.generateFromVideo(targetUrl);

      const newRecipe: Recipe = {
        ...generatedRecipe,
        sourceUrl: targetUrl,
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
      };

      setCurrentRecipe(newRecipe);
      saveRecipe(newRecipe);

      // Reset inputs on success
      setUploadedFileUrl(null);
      setVideoUrl('');
    } catch (error: any) {
      console.error('Error flow:', error);
      Alert.alert('Gagal', error.message || 'Terjadi kesalahan saat memproses video.');
    } finally {
      clearInterval(interval); // Stop the message cycle
      setLoading(false);
      setLoadingMessage('Sedang Menganalisa...'); // Reset default
    }
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
          <Text className="mt-1 font-visby text-xs text-gray-500">{recipe.servings} porsi</Text>
        </View>
        <View className="items-center">
          <Ionicons name="barbell-outline" size={18} color="#666" />
          <Text className="mt-1 font-visby text-xs text-gray-500">{recipe.difficulty}</Text>
        </View>
      </View>

      {!isBrief && (
        <>
          <View className="mb-6">
            <Text className="mb-3 font-visby-bold text-lg text-gray-900">🛒 Bahan-bahan</Text>
            {recipe.ingredients.map((ing, idx) => (
              <View key={idx} className="mb-2 flex-row items-center">
                <View className="mr-3 h-1.5 w-1.5 rounded-full bg-red-400" />
                <Text className="flex-1 font-visby text-base text-gray-700">{ing}</Text>
              </View>
            ))}
          </View>

          <View className="mb-6">
            <Text className="mb-3 font-visby-bold text-lg text-gray-900">🍳 Cara Memasak</Text>
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
              <Text className="mb-1 font-visby-bold text-yellow-800">💡 Chef Tips</Text>
              <Text className="font-visby text-sm leading-5 text-yellow-700">{recipe.tips}</Text>
            </View>
          )}
        </>
      )}

      {isBrief && (
        <TouchableOpacity
          onPress={() => deleteRecipe(recipe.id!)}
          className="absolute right-0 top-0 p-2"
        >
          <Ionicons name="trash-outline" size={18} color="#ccc" />
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView className="flex-1 px-4 pt-4">
        {/* Header */}
        <View className="mb-6">
          <Text className="font-visby-bold text-3xl text-gray-900">Video Chef 📹</Text>
          <Text className="mt-1 font-visby text-base text-gray-500">
            Paste link TikTok/YouTube atau upload videomu!
          </Text>
        </View>

        {/* Input Card */}
        <View className="mb-6 rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
          {/* Opsi 1: Link Input (Disabled if uploaded file present) */}
          <View
            className={`mb-4 rounded-xl bg-gray-50 px-4 py-3 ${uploadedFileUrl ? 'opacity-50' : ''}`}
          >
            <TextInput
              placeholder="Paste link video masak di sini..."
              placeholderTextColor="#9CA3AF"
              value={videoUrl}
              onChangeText={setVideoUrl}
              editable={!uploadedFileUrl}
              className="font-visby text-base text-gray-900"
            />
          </View>

          <Text className="mb-4 text-center text-xs text-gray-400">ATAU</Text>

          {/* Opsi 2: Upload Button */}
          <TouchableOpacity
            onPress={uploadedFileUrl ? resetUpload : handlePickVideo}
            disabled={uploading}
            className={`mb-6 flex-row items-center justify-center rounded-xl border border-gray-200 py-3 ${uploadedFileUrl ? 'border-green-200 bg-green-50' : 'bg-white'}`}
          >
            {uploading ? (
              <ActivityIndicator color="#666" size="small" />
            ) : uploadedFileUrl ? (
              <>
                <Ionicons
                  name="checkmark-circle"
                  size={20}
                  color="green"
                  style={{ marginRight: 8 }}
                />
                <Text className="font-visby-bold text-green-700">
                  Video Terupload (Klik untuk Batal)
                </Text>
              </>
            ) : (
              <>
                <Ionicons
                  name="cloud-upload-outline"
                  size={20}
                  color="#666"
                  style={{ marginRight: 8 }}
                />
                <Text className="font-visby-bold text-gray-600">Upload Video Sendiri</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Button Generate */}
          <TouchableOpacity
            onPress={handleGenerate}
            disabled={loading}
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
                <Text className="font-visby-bold text-lg text-white">Buat Resep Sekarang</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Result Area */}
        {currentRecipe ? (
          <View>
            <View className="mb-4 flex-row items-center justify-between">
              <Text className="font-visby-bold text-xl text-gray-900">Hasil Analisa AI</Text>
              <TouchableOpacity onPress={() => setCurrentRecipe(null)}>
                <Text className="font-visby text-red-500">Tutup</Text>
              </TouchableOpacity>
            </View>
            {renderRecipeCard(currentRecipe)}
          </View>
        ) : (
          savedRecipes.length > 0 && (
            <View>
              <Text className="mb-3 font-visby-bold text-lg text-gray-900">Riwayat Resep</Text>
              {savedRecipes.map((item) => (
                <TouchableOpacity key={item.id} onPress={() => setCurrentRecipe(item)}>
                  {renderRecipeCard(item, true)}
                </TouchableOpacity>
              ))}
            </View>
          )
        )}

        <View className="h-24" />
      </ScrollView>
    </SafeAreaView>
  );
}
