import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Share,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Recipe } from '@/lib/types';
import { useFocusEffect, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useColorScheme } from 'nativewind';

// Import extracted components
import { RecipeCard } from '@/components/recipes/RecipeCard';
import { RecipeDetailModal } from '@/components/recipes/RecipeDetailModal';

const RECIPES_STORAGE_KEY = 'pirinku_local_recipes_v1';

export default function SavedRecipesScreen() {
  const router = useRouter();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const loadRecipes = async () => {
    try {
      const jsonValue = await AsyncStorage.getItem(RECIPES_STORAGE_KEY);
      if (jsonValue != null) {
        setRecipes(JSON.parse(jsonValue));
      } else {
        setRecipes([]);
      }
    } catch (e) {
      console.error('Failed to load recipes', e);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadRecipes();
    }, []),
  );

  const onRefresh = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRefreshing(true);
    await loadRecipes();
    setRefreshing(false);
  };

  // --- Handlers passed to Modal/Components ---

  const handleUpdateRecipe = async (updatedRecipe: Recipe) => {
    const newRecipes = recipes.map((r) => (r.id === updatedRecipe.id ? updatedRecipe : r));
    setRecipes(newRecipes);
    await AsyncStorage.setItem(RECIPES_STORAGE_KEY, JSON.stringify(newRecipes));
    setSelectedRecipe(updatedRecipe); // Update modal view
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('Sukses', 'Resep berhasil diperbarui!');
  };

  const handleDeleteRecipe = async (id: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert('Hapus Resep', 'Yakin ingin menghapus resep ini?', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Hapus',
        style: 'destructive',
        onPress: async () => {
          const newRecipes = recipes.filter((r) => r.id !== id);
          setRecipes(newRecipes);
          await AsyncStorage.setItem(RECIPES_STORAGE_KEY, JSON.stringify(newRecipes));
          if (selectedRecipe?.id === id) setSelectedRecipe(null); // Close modal
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        },
      },
    ]);
  };

  const handleShareRecipe = async (recipe: Recipe) => {
    const ingredientsList = recipe.ingredients.map((i) => `• ${i}`).join('\n');
    const stepsList = recipe.steps.map((s) => `${s.step}. ${s.instruction}`).join('\n\n');

    const message =
      `🍳 *${recipe.title}*\n\n` +
      `⏱️ Waktu: ${recipe.time_minutes}m | 🔥 Kalori: ${recipe.calories_per_serving}\n\n` +
      `🛒 *Bahan-bahan:*\n${ingredientsList}\n\n` +
      `👨‍🍳 *Cara Membuat:*\n${stepsList}\n\n` +
      `_Dibuat dengan Aplikasi Pirinku_ 📲`;

    try {
      await Share.share({
        message: message,
      });
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-[#0F0F0F]">
      <RecipeDetailModal
        recipe={selectedRecipe}
        visible={!!selectedRecipe}
        onClose={() => setSelectedRecipe(null)}
        onUpdate={handleUpdateRecipe}
        onDelete={handleDeleteRecipe}
        onShare={handleShareRecipe}
      />

      <View className="flex-row items-center justify-between px-5 pb-2 pt-4">
        <Text className="font-visby-bold text-3xl text-gray-900 dark:text-white">
          Koleksi Resep 📚
        </Text>
        <View className="flex-row gap-3">
          <TouchableOpacity
            onPress={() => router.push('/meal-planner')}
            className="rounded-full border border-gray-100 bg-white p-2 shadow-sm dark:border-gray-800 dark:bg-gray-900"
          >
            <Ionicons name="calendar-outline" size={20} color="#CC5544" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push('/pantry')}
            className="rounded-full border border-gray-100 bg-white p-2 shadow-sm dark:border-gray-800 dark:bg-gray-900"
          >
            <Ionicons name="basket-outline" size={20} color="#CC5544" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push('/shopping-list')}
            className="rounded-full border border-gray-100 bg-white p-2 shadow-sm dark:border-gray-800 dark:bg-gray-900"
          >
            <Ionicons name="cart-outline" size={20} color="#CC5544" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        className="flex-1 px-5 pt-2"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {recipes.length === 0 ? (
          <View className="mt-20 items-center justify-center opacity-70">
            <Ionicons name="book-outline" size={80} color="#ccc" />
            <Text className="mt-4 font-visby-bold text-lg text-gray-500 dark:text-gray-400">
              No recipes saved yet
            </Text>
            <Text className="mb-6 w-3/4 text-center font-visby text-gray-400 dark:text-gray-500">
              Create your first AI-powered recipe from any video or photo!
            </Text>
            <TouchableOpacity
              onPress={() => router.push('/(tabs)/generate')}
              className="flex-row items-center rounded-full bg-red-500 px-6 py-3 shadow-lg shadow-red-200 dark:shadow-none"
            >
              <Ionicons name="add-circle" size={20} color="white" style={{ marginRight: 8 }} />
              <Text className="font-visby-bold text-white">Create My First Recipe</Text>
            </TouchableOpacity>
          </View>
        ) : (
          recipes.map((recipe) => (
            <RecipeCard key={recipe.id} recipe={recipe} onPress={() => setSelectedRecipe(recipe)} />
          ))
        )}
        <View className="h-24" />
      </ScrollView>
    </SafeAreaView>
  );
}
