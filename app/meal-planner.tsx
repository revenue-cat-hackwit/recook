import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Modal,
  FlatList,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { MealPlannerService, MealPlan } from '@/lib/services/mealPlannerService';
import { RecipeService } from '@/lib/services/recipeService';
import { Recipe } from '@/lib/types';
import { Image } from 'expo-image';

// Format Date Utils
const getDayName = (date: Date) => {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return days[date.getDay()];
};

const formatDate = (date: Date) => {
  return date.toISOString().split('T')[0];
};

export default function MealPlannerScreen() {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [mealPlans, setMealPlans] = useState<MealPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Add Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [targetMealType, setTargetMealType] = useState('lunch');
  const [myRecipes, setMyRecipes] = useState<Recipe[]>([]);

  // Generate 7 days
  const dates = Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return d;
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const start = formatDate(dates[0]);
      const end = formatDate(dates[dates.length - 1]);
      const plans = await MealPlannerService.getMealPlans(start, end);
      setMealPlans(plans);

      // Also fetch recipes for picker
      const recipes = await RecipeService.getUserRecipes();
      setMyRecipes(recipes);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAddMeal = async (recipe: Recipe) => {
    try {
      await MealPlannerService.addMealPlan(recipe.id!, formatDate(selectedDate), targetMealType);
      setIsAddModalOpen(false);
      loadData(); // Refresh
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  const handleDeleteMeal = async (id: string) => {
    try {
      await MealPlannerService.deleteMealPlan(id);
      loadData();
    } catch (e) {
      console.error(e);
    }
  };

  const renderMealSection = (type: string, emoji: string, title: string) => {
    const dateStr = formatDate(selectedDate);
    const meals = mealPlans.filter((p) => p.date === dateStr && p.meal_type === type);

    return (
      <View className="mb-6">
        <View className="mb-3 flex-row items-center justify-between px-4">
          <Text className="font-visby-bold text-lg text-gray-800">
            {emoji} {title}
          </Text>
          <TouchableOpacity
            onPress={() => {
              setTargetMealType(type);
              setIsAddModalOpen(true);
            }}
          >
            <Ionicons name="add-circle" size={24} color="#CC5544" />
          </TouchableOpacity>
        </View>

        {meals.length === 0 ? (
          <View className="mx-4 items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4">
            <Text className="font-visby text-xs text-gray-400">Nothing planned</Text>
          </View>
        ) : (
          meals.map((item) => (
            <View
              key={item.id}
              className="mx-4 mb-3 flex-row items-center rounded-xl border border-gray-100 bg-white p-3 shadow-sm"
            >
              <Image
                source={{ uri: item.recipe.imageUrl }}
                style={{ width: 50, height: 50, borderRadius: 8 }}
                contentFit="cover"
              />
              <View className="ml-3 flex-1">
                <Text className="font-visby-bold text-sm text-gray-900" numberOfLines={1}>
                  {item.recipe.title}
                </Text>
                <View className="mt-1 flex-row items-center">
                  <Ionicons name="time-outline" size={12} color="gray" />
                  <Text className="ml-1 text-xs text-gray-500">
                    {item.recipe.time_minutes || '15m'}
                  </Text>
                  <Text className="mx-1 text-gray-300">|</Text>
                  <Text className="text-xs text-gray-500">
                    {item.recipe.calories_per_serving || '200kcal'}
                  </Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => handleDeleteMeal(item.id)} className="p-2">
                <Ionicons name="close" size={18} color="#999" />
              </TouchableOpacity>
            </View>
          ))
        )}
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-[#F9FAFB]">
      {/* Header */}
      <View className="flex-row items-center justify-between px-5 py-4">
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="black" />
        </TouchableOpacity>
        <Text className="font-visby-bold text-xl text-gray-900">Meal Planner</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Date Strips */}
      <View className="mb-4">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16 }}
        >
          {dates.map((date, i) => {
            const isSelected = formatDate(date) === formatDate(selectedDate);
            return (
              <TouchableOpacity
                key={i}
                onPress={() => setSelectedDate(date)}
                className={`mr-3 h-20 w-16 items-center justify-center rounded-2xl ${isSelected ? 'bg-[#CC5544] shadow-md shadow-red-200' : 'border border-gray-100 bg-white'}`}
              >
                <Text
                  className={`mb-1 font-visby text-xs ${isSelected ? 'text-white/80' : 'text-gray-400'}`}
                >
                  {getDayName(date)}
                </Text>
                <Text
                  className={`font-visby-bold text-xl ${isSelected ? 'text-white' : 'text-gray-800'}`}
                >
                  {date.getDate()}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView
        className="flex-1"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadData} />}
      >
        <Text className="mb-4 px-5 font-visby-bold text-xs uppercase tracking-wider text-gray-400">
          {selectedDate.toDateString()}
        </Text>

        {renderMealSection('breakfast', '🍳', 'Breakfast')}
        {renderMealSection('lunch', '🍱', 'Lunch')}
        {renderMealSection('dinner', '🍽️', 'Dinner')}
        {renderMealSection('snack', '🍪', 'Snacks')}

        <View className="h-20" />
      </ScrollView>

      {/* Add Modal */}
      <Modal visible={isAddModalOpen} animationType="slide" presentationStyle="pageSheet">
        <View className="flex-1 bg-white p-6">
          <View className="mb-6 flex-row items-center justify-between">
            <Text className="font-visby-bold text-2xl">Add onto {targetMealType}</Text>
            <TouchableOpacity onPress={() => setIsAddModalOpen(false)}>
              <Ionicons name="close-circle" size={32} color="#ddd" />
            </TouchableOpacity>
          </View>

          {myRecipes.length === 0 ? (
            <View className="flex-1 items-center justify-center">
              <Text className="mb-4 font-visby text-gray-500">No saved recipes yet.</Text>
              <TouchableOpacity
                onPress={() => {
                  setIsAddModalOpen(false);
                  router.push('/(tabs)/generate');
                }}
                className="rounded-full bg-black px-6 py-3"
              >
                <Text className="font-visby-bold text-white">Create New Recipe</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={myRecipes}
              keyExtractor={(item) => item.id!}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => handleAddMeal(item)}
                  className="mb-4 flex-row items-center rounded-xl border border-gray-100 p-3"
                >
                  {/* Fallback image logic needed in real app */}
                  <View className="mr-4 h-16 w-16 items-center justify-center rounded-lg bg-gray-200">
                    <Text>🥘</Text>
                  </View>
                  <View className="flex-1">
                    <Text className="font-visby-bold text-gray-900">{item.title}</Text>
                    <Text className="text-xs text-gray-500" numberOfLines={1}>
                      {item.description}
                    </Text>
                  </View>
                  <Ionicons name="add-circle-outline" size={24} color="#CC5544" />
                </TouchableOpacity>
              )}
            />
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}
