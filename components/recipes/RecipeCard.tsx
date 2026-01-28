import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Recipe } from '@/lib/types';
import { useColorScheme } from 'nativewind';

interface RecipeCardProps {
  recipe: Recipe;
  onPress: () => void;
}

export const RecipeCard: React.FC<RecipeCardProps> = ({ recipe, onPress }) => {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <TouchableOpacity
      onPress={onPress}
      className="mb-4 flex-row items-center rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900 dark:shadow-none"
    >
      <View className="mr-4 h-16 w-16 items-center justify-center rounded-xl bg-orange-100 dark:bg-orange-900/30">
        <Text className="text-3xl">🍲</Text>
      </View>
      <View className="flex-1">
        <Text
          numberOfLines={1}
          className="mb-1 font-visby-bold text-lg text-gray-900 dark:text-white"
        >
          {recipe.title}
        </Text>
        <Text
          numberOfLines={2}
          className="mb-2 font-visby text-xs text-gray-500 dark:text-gray-400"
        >
          {recipe.description}
        </Text>
        <View className="flex-row items-center space-x-3">
          <View className="flex-row items-center">
            <Ionicons name="time-outline" size={12} color="gray" />
            <Text className="ml-1 text-xs text-gray-500 dark:text-gray-400">
              {recipe.time_minutes}m
            </Text>
          </View>
          <View className="flex-row items-center">
            <Ionicons name="flame-outline" size={12} color="gray" />
            <Text className="ml-1 text-xs text-gray-500 dark:text-gray-400">
              {recipe.calories_per_serving} kcal
            </Text>
          </View>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#ddd" />
    </TouchableOpacity>
  );
};
