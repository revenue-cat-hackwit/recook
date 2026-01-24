import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal,
  FlatList,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, supabaseUrl, supabaseAnonKey } from '@/lib/supabase';
import { Recipe } from '@/lib/types';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

const RECIPES_STORAGE_KEY = 'pirinku_local_recipes_v1';

export default function GenerateScreen() {
  const [videoUrl, setVideoUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentRecipe, setCurrentRecipe] = useState<Recipe | null>(null);
  const [savedRecipes, setSavedRecipes] = useState<Recipe[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    loadSavedRecipes();
  }, []);

  const loadSavedRecipes = async () => {
    try {
      const jsonValue = await AsyncStorage.getItem(RECIPES_STORAGE_KEY);
      if (jsonValue != null) {
        setSavedRecipes(JSON.parse(jsonValue));
      }
    } catch (e) {
      console.error('Failed to load recipes', e);
    }
  };

  const handleGenerate = async () => {
    if (!videoUrl.trim()) {
      Alert.alert(
        'Link Kosong',
        'Mohon setidaknya masukkan link video yang ingin dibuatkan resepnya.',
      );
      return;
    }

    setLoading(true);
    setCurrentRecipe(null);
    setShowHistory(false);

    try {
      console.log('Generating recipe from:', videoUrl);

      // FORCE USE ANON KEY
      const token = supabaseAnonKey;

      const response = await fetch(`${supabaseUrl}/functions/v1/generate-recipe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          videoUrl: videoUrl,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Function failed with status ${response.status}: ${errorText}`);
      }

      const data = await response.json();

      console.log('Recipe Data:', data);

      if (data.success && data.data) {
        const newRecipe: Recipe = {
          ...data.data,
          sourceUrl: videoUrl,
          id: Date.now().toString(),
          createdAt: new Date().toISOString(),
        };
        setCurrentRecipe(newRecipe);
      } else {
        Alert.alert('Gagal', 'AI tidak dapat menghasilkan resep valid dari link tersebut.');
      }
    } catch (error: any) {
      console.error('Error generating recipe:', error);
      Alert.alert('Error', 'Gagal menghubungi Chef Bot. Pastikan koneksi lancar.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveRecipe = async () => {
    if (!currentRecipe) return;

    try {
      const newHistory = [currentRecipe, ...savedRecipes];
      setSavedRecipes(newHistory);
      await AsyncStorage.setItem(RECIPES_STORAGE_KEY, JSON.stringify(newHistory));
      Alert.alert('Tersimpan!', 'Resep berhasil disimpan di HP kamu.');
    } catch (e) {
      Alert.alert('Error', 'Gagal menyimpan resep.');
    }
  };

  const handleDeleteRecipe = async (id: string) => {
    const newHistory = savedRecipes.filter((r) => r.id !== id);
    setSavedRecipes(newHistory);
    await AsyncStorage.setItem(RECIPES_STORAGE_KEY, JSON.stringify(newHistory));
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
          onPress={() => (isBrief ? setCurrentRecipe(recipe) : handleSaveRecipe())}
          className="rounded-full bg-gray-50 p-2"
        >
          <Ionicons
            name={isBrief ? 'chevron-forward' : 'bookmark-outline'}
            size={22}
            color="#FF6B6B"
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
          onPress={() => handleDeleteRecipe(recipe.id!)}
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
          <Text className="font-visby-bold text-3xl text-gray-900">Magic Kitchen ✨</Text>
          <Text className="mt-1 font-visby text-base text-gray-500">
            Ubah video TikTok/Shorts jadi resep instan.
          </Text>
        </View>

        {/* Input Card */}
        <View className="mb-6 rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
          <Text className="mb-2 font-visby-bold text-gray-700">Link Video Masak</Text>
          <View className="mb-4 flex-row items-center rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
            <Ionicons name="link" size={20} color="#999" style={{ marginRight: 10 }} />
            <TextInput
              className="flex-1 font-visby text-base text-gray-900"
              placeholder="https://tiktok.com/..."
              placeholderTextColor="#ccc"
              value={videoUrl}
              onChangeText={setVideoUrl}
              autoCapitalize="none"
            />
            {videoUrl.length > 0 && (
              <TouchableOpacity onPress={() => setVideoUrl('')}>
                <Ionicons name="close-circle" size={18} color="#ccc" />
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            onPress={handleGenerate}
            disabled={loading}
            className={`w-full flex-row items-center justify-center rounded-xl py-4 ${loading ? 'bg-gray-300' : 'bg-red-500 shadow-lg shadow-red-200'}`}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <Ionicons name="sparkles" size={20} color="white" style={{ marginRight: 8 }} />
                <Text className="font-visby-bold text-lg text-white">Generate Resep</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Toggle History */}
        {!currentRecipe && savedRecipes.length > 0 && (
          <View className="mb-4 flex-row items-center justify-between">
            <Text className="font-visby-bold text-lg text-gray-900">
              Buku Resep Saya ({savedRecipes.length})
            </Text>
          </View>
        )}

        {/* Result Area */}
        {currentRecipe ? (
          <View>
            <View className="mb-4 flex-row items-center justify-between">
              <Text className="font-visby-bold text-xl text-gray-900">Hasil Generate</Text>
              <TouchableOpacity onPress={() => setCurrentRecipe(null)}>
                <Text className="font-visby text-red-500">Tutup</Text>
              </TouchableOpacity>
            </View>
            {renderRecipeCard(currentRecipe)}
          </View>
        ) : (
          <View>
            {savedRecipes.map((item) => (
              <View key={item.id}>
                {/* Render saved items as brief cards. Clicking them sets currentRecipe */}
                <TouchableOpacity onPress={() => setCurrentRecipe(item)}>
                  {renderRecipeCard(item, true)}
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        <View className="h-24" />
      </ScrollView>
    </SafeAreaView>
  );
}
