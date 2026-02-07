import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { ArrowLeft, Clock, Flash, Profile2User } from 'iconsax-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Recipe } from '@/lib/types';
import { RecipeService } from '@/lib/services/recipeService';
import { useViewRecipeStore } from '@/lib/store/viewRecipeStore';

export default function RecipeDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const sharedRecipe = useViewRecipeStore((s) => s.recipe);

  useEffect(() => {
    const fetchRecipe = async () => {
      const recipeId = Array.isArray(id) ? id[0] : id;

      // 1. Check if viewing a shared recipe from memory
      if (recipeId === 'shared') {
        if (sharedRecipe) {
          setRecipe(sharedRecipe);
          setLoading(false);
        } else {
          setError('Recipe data missing. Please open from feed again.');
          setLoading(false);
        }
        return;
      }

      // 2. Fetch by ID
      if (!recipeId) return;
      try {
        setLoading(true);
        const data = await RecipeService.getRecipeById(recipeId);
        if (data) {
          setRecipe(data);
        } else {
          setError('Recipe not found');
        }
      } catch (err) {
        console.error(err);
        setError('Failed to load recipe');
      } finally {
        setLoading(false);
      }
    };

    fetchRecipe();
  }, [id]);

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center dark:bg-[#0F0F0F]">
        <ActivityIndicator size="large" color="#8BD65E" />
      </SafeAreaView>
    );
  }

  if (error || !recipe) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center px-6 dark:bg-[#0F0F0F]">
        <Text className="font-visby-bold text-lg text-gray-900 dark:text-white">{error || 'Recipe not found'}</Text>
        <TouchableOpacity onPress={() => router.back()} className="mt-4">
          <Text className="font-visby-bold text-[#8BD65E]">Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-[#0F0F0F]" edges={['top']}>
      <View className="flex-row items-center px-4 py-2 border-b border-gray-100 dark:border-gray-800">
        <TouchableOpacity onPress={() => router.back()} className="mr-3 p-2">
          <ArrowLeft size={24} color="#8BD65E" />
        </TouchableOpacity>
        <Text className="font-visby-bold text-lg text-gray-900 dark:text-white flex-1" numberOfLines={1}>
          {recipe.title}
        </Text>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Image */}
        {recipe.imageUrl && (
          <Image
            source={{ uri: recipe.imageUrl }}
            style={{ width: '100%', height: 250 }}
            contentFit="cover"
          />
        )}

        <View className="px-5 pt-5">
          <Text className="font-visby-bold text-2xl text-gray-900 dark:text-white mb-2">{recipe.title}</Text>
          {recipe.description && (
            <Text className="font-visby text-base text-gray-500 dark:text-gray-400 mb-4 leading-6">
              {recipe.description}
            </Text>
          )}

          {/* Stats */}
          <View className="flex-row justify-between bg-gray-50 dark:bg-gray-800 p-4 rounded-xl mb-6">
            <View className="items-center flex-1">
              <Clock size={20} color="#8BD65E" variant="Bold" />
              <Text className="font-visby-bold mt-1 text-gray-800 dark:text-gray-200">{recipe.time_minutes}m</Text>
              <Text className="text-xs text-gray-400">Time</Text>
            </View>
            <View className="w-[1px] bg-gray-200 dark:bg-gray-700" />
            <View className="items-center flex-1">
              <Flash size={20} color="#F97316" variant="Bold" />
              <Text className="font-visby-bold mt-1 text-gray-800 dark:text-gray-200">{recipe.calories_per_serving}</Text>
              <Text className="text-xs text-gray-400">Cal</Text>
            </View>
            <View className="w-[1px] bg-gray-200 dark:bg-gray-700" />
            <View className="items-center flex-1">
              <Profile2User size={20} color="#3B82F6" variant="Bold" />
              <Text className="font-visby-bold mt-1 text-gray-800 dark:text-gray-200">{recipe.servings}</Text>
              <Text className="text-xs text-gray-400">Servings</Text>
            </View>
          </View>

          {/* Ingredients */}
          <Text className="font-visby-bold text-lg text-gray-900 dark:text-white mb-3">Ingredients</Text>
          <View className="mb-6 gap-2">
            {recipe.ingredients.map((ing, i) => (
              <View key={i} className="flex-row items-center bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                <View className="h-2 w-2 rounded-full bg-[#8BD65E] mr-3" />
                <Text className="font-visby text-gray-700 dark:text-gray-300 flex-1">
                  {ing.quantity} {ing.unit} {ing.item}
                </Text>
              </View>
            ))}
          </View>

          {/* Steps */}
          <Text className="font-visby-bold text-lg text-gray-900 dark:text-white mb-3">Instructions</Text>
          <View className="gap-4">
            {recipe.steps.map((step, i) => (
              <View key={i} className="flex-row">
                <View className="h-8 w-8 items-center justify-center rounded-full bg-[#8BD65E]/20 mr-3 mt-1">
                  <Text className="font-visby-bold text-[#8BD65E]">{step.step}</Text>
                </View>
                <View className="flex-1 bg-gray-50 dark:bg-gray-800 p-4 rounded-xl">
                  <Text className="font-visby text-gray-700 dark:text-gray-300 leading-6">{step.instruction}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
