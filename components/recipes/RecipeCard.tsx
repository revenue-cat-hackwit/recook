import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Recipe } from '@/lib/types';
import { useColorScheme } from 'nativewind';

interface RecipeCardProps {
  recipe: Recipe;
  onPress: () => void;
  onCollectionPress?: () => void;
}

export const RecipeCard: React.FC<RecipeCardProps> = ({ recipe, onPress, onCollectionPress }) => {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <TouchableOpacity
      onPress={onPress}
      className="mb-6 overflow-hidden rounded-2xl bg-white p-0 shadow-sm dark:bg-[#1A1A1A]"
    >
        {/* HERO IMAGE */}
        <View className="relative h-56 w-full bg-gray-200 dark:bg-gray-800">
            {recipe.imageUrl ? (
                <Image
                    source={{ uri: recipe.imageUrl }}
                    style={{ width: '100%', height: '100%' }}
                    contentFit="cover"
                    transition={500}
                />
            ) : (
                <View className="h-full w-full items-center justify-center">
                    <Text className="text-6xl">🍲</Text>
                </View>
            )}
            
            {/* Video Indicator */}
            {recipe.sourceUrl?.match(/\.(mp4|mov|webm)(\?.*)?$/i) && (
                <View className="absolute bottom-3 left-3 flex-row items-center rounded-full bg-black/50 px-3 py-1 backdrop-blur-sm">
                     <Ionicons name="play" size={12} color="white" />
                     <Text className="ml-1 font-visby-bold text-xs text-white">Video</Text>
                </View>
            )}

            {/* Save / Collection Button */}
            {onCollectionPress && (
                <TouchableOpacity 
                    onPress={(e) => {
                        e.stopPropagation();
                        onCollectionPress();
                    }}
                    className="absolute right-3 top-3 rounded-full bg-white/90 p-2 shadow-sm backdrop-blur-sm dark:bg-black/50"
                >
                    <Ionicons 
                        name={recipe.collections && recipe.collections.length > 0 ? "bookmark" : "bookmark-outline"} 
                        size={20} 
                        color={recipe.collections && recipe.collections.length > 0 ? "#F59E0B" : (isDark ? "white" : "black")} 
                    />
                </TouchableOpacity>
            )}
        </View>

        {/* CONTENT */}
        <View className="p-4">
            <View className="mb-1 flex-row items-start justify-between">
                <Text
                    numberOfLines={1}
                    className="flex-1 font-visby-bold text-lg text-gray-900 dark:text-white"
                >
                    {recipe.title}
                </Text>
                <View className="flex-row items-center">
                    <Ionicons name="star" size={14} color="#F59E0B" />
                    <Text className="ml-1 font-visby-bold text-xs text-gray-700 dark:text-gray-300">4.8</Text>
                </View>
            </View>

            <Text
                numberOfLines={2}
                className="mb-3 font-visby text-sm text-gray-500 dark:text-gray-400"
            >
                {recipe.description || 'No description available for this recipe.'}
            </Text>

            <View className="flex-row items-center space-x-4">
                <View className="flex-row items-center">
                    <Ionicons name="time-outline" size={14} color="gray" />
                    <Text className="ml-1 text-xs text-gray-500 dark:text-gray-400">
                    {recipe.time_minutes} min
                    </Text>
                </View>
                <View className="flex-row items-center">
                    <Ionicons name="flame-outline" size={14} color="gray" />
                    <Text className="ml-1 text-xs text-gray-500 dark:text-gray-400">
                    {recipe.calories_per_serving} kcal
                    </Text>
                </View>
                <View className="flex-row items-center">
                    <Ionicons name="people-outline" size={14} color="gray" />
                    <Text className="ml-1 text-xs text-gray-500 dark:text-gray-400">
                    {recipe.servings} serv
                    </Text>
                </View>
            </View>
        </View>
    </TouchableOpacity>
  );
};
