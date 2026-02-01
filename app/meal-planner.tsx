import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  Pressable,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, router as Router, useFocusEffect } from 'expo-router';
import { MealPlannerService, MealPlan } from '@/lib/services/mealPlannerService';
import { AutoPlanModal, AutoPlanPreferences } from '@/components/mealplanner/AutoPlanModal';
import { RecipeService } from '@/lib/services/recipeService';
import { Recipe } from '@/lib/types';
import { Image } from 'expo-image';
import { RecipeDetailModal } from '@/components/recipes/RecipeDetailModal';
import { useRecipeGenerator } from '@/lib/hooks/useRecipeGenerator';
import * as Haptics from 'expo-haptics';

// Format Date Utils
const getDayName = (date: Date) => {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return days[date.getDay()];
};

const formatDate = (date: Date) => {
  return date.toISOString().split('T')[0];
};

export default function MealPlannerScreen() {
  const [isReady, setIsReady] = useState(false);

  // Wait for navigation to be ready - use useFocusEffect instead of useEffect
  useFocusEffect(
    useCallback(() => {
      setIsReady(true);
      return () => setIsReady(false);
    }, []),
  );

  // Don't render until navigation is ready - EARLY RETURN
  if (!isReady) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-gray-50">
        <ActivityIndicator size="large" color="#8BD65E" />
      </SafeAreaView>
    );
  }

  return <MealPlannerContent />;
}

// Separate component that only renders when navigation is ready
function MealPlannerContent() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [mealPlans, setMealPlans] = useState<MealPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Add Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [targetMealType, setTargetMealType] = useState('lunch');
  const [myRecipes, setMyRecipes] = useState<Recipe[]>([]);

  // Recipe Detail Modal State
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);

  // Recipe Generator for completing placeholder recipes
  const { completeRecipe } = useRecipeGenerator();

  // Track image generation per recipe ID
  const [generatingImages, setGeneratingImages] = useState<Set<string>>(new Set());

  // Generate 14 days - moved to useMemo to avoid recreation on every render
  const dates = useMemo(() => {
    return Array.from({ length: 14 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() + i);
      return d;
    });
  }, []);

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

  // Calculate Daily Calories
  const dailyCalories = useMemo(() => {
    const targetDate = formatDate(selectedDate);
    return mealPlans
      .filter((p) => p.date === targetDate)
      .reduce((acc, curr) => {
        // Extract number from string like "400 kcal" or just "400"
        const calString = curr.recipe.calories_per_serving?.replace(/[^0-9]/g, '') || '0';
        const cal = parseInt(calString, 10);
        return acc + (isNaN(cal) ? 0 : cal);
      }, 0);
  }, [mealPlans, selectedDate]);

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

  // Auto Plan Modal State
  const [isAutoPlanModalOpen, setIsAutoPlanModalOpen] = useState(false);

  const handleGeneratePlan = () => {
    setIsAutoPlanModalOpen(true);
  };

  const handleConfirmPlan = async (prefs: any) => {
    setLoading(true);
    try {
      await MealPlannerService.generateWeeklyPlan(formatDate(new Date()), prefs);
      Alert.alert('Success', 'Weekly meal plan created!');
      setIsAutoPlanModalOpen(false);
      loadData();
    } catch (e: any) {
      console.error('Auto Plan Error:', e);
      let errorMsg = e.message || 'Something went wrong.';

      // Clean up common technical prefixes if present
      errorMsg = errorMsg.replace('Server Error: ', '');

      Alert.alert('Oops!', errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // Recipe Detail Modal Handlers
  const handleMealPress = (recipe: Recipe) => {
    setSelectedRecipe(recipe);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleUpdateRecipe = async (updatedRecipe: Recipe) => {
    try {
      await RecipeService.updateRecipe(updatedRecipe);
      setSelectedRecipe(updatedRecipe);
      loadData(); // Refresh meal plans to show updated recipe
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success', 'Recipe updated!');
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  const handleDeleteRecipe = async (id: string) => {
    Alert.alert(
      'Delete Recipe',
      'This will delete the recipe from your collection. The meal plan entry will remain but show as "Recipe Deleted".',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await RecipeService.deleteRecipe(id);
              setSelectedRecipe(null);
              loadData();
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch (e: any) {
              Alert.alert('Error', e.message);
            }
          },
        },
      ],
    );
  };

  const handleShareRecipe = async (recipe: Recipe) => {
    const ingredientsList = recipe.ingredients.map((i) => `• ${i}`).join('\n');
    const stepsList = recipe.steps.map((s) => `${s.step}. ${s.instruction}`).join('\n\n');

    const message =
      `🍳 *${recipe.title}*\n\n` +
      `⏱️ Time: ${recipe.time_minutes}m | 🔥 Calories: ${recipe.calories_per_serving}\n\n` +
      `🛒 *Ingredients:*\n${ingredientsList}\n\n` +
      `👨‍🍳 *Instructions:*\n${stepsList}\n\n` +
      `_Made with Pirinku App_ 📲`;

    try {
      await Share.share({ message });
    } catch (error) {
      console.error(error);
    }
  };

  const handleGenerateFull = async (recipe: Recipe) => {
    const result = await completeRecipe(recipe);
    if (result && result.success && result.data) {
      setSelectedRecipe(result.data);
      loadData(); // Refresh to show completed recipe in meal plan
      Alert.alert('Recipe Completed', 'Your recipe details are ready! 👨‍🍳');
    }
  };

  // Auto-generate image for recipe if missing
  const handleGenerateImage = async (recipe: Recipe) => {
    if (!recipe.id || generatingImages.has(recipe.id)) return;

    setGeneratingImages((prev) => new Set(prev).add(recipe.id!));
    try {
      const imageUrl = await RecipeService.generateImage(recipe.title);

      // Update recipe with new image
      const updatedRecipe = { ...recipe, imageUrl };
      await RecipeService.updateRecipe(updatedRecipe);

      // Refresh meal plans to show new image
      loadData();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Image generation failed:', error);
      Alert.alert('Failed', 'Could not generate image. Please try again.');
    } finally {
      setGeneratingImages((prev) => {
        const newSet = new Set(prev);
        newSet.delete(recipe.id!);
        return newSet;
      });
    }
  };

  const renderMealSection = (type: string, emoji: string, title: string) => {
    const dateStr = formatDate(selectedDate);
    const meals = mealPlans.filter((p) => p.date === dateStr && p.meal_type === type);

    // Color scheme for each meal type
    const colorSchemes = {
      breakfast: {
        bg: 'bg-orange-50',
        border: 'border-orange-200',
        accent: '#FF6B35',
        icon: '#FF6B35',
      },
      lunch: {
        bg: 'bg-emerald-50',
        border: 'border-emerald-200',
        accent: '#10B981',
        icon: '#10B981',
      },
      dinner: {
        bg: 'bg-purple-50',
        border: 'border-purple-200',
        accent: '#8B5CF6',
        icon: '#8B5CF6',
      },
    };

    const colors = colorSchemes[type as keyof typeof colorSchemes] || colorSchemes.breakfast;

    return (
      <View className="mb-6">
        <View className="mb-3 flex-row items-center justify-between px-4">
          <View className="flex-row items-center">
            <Text className="mr-2 text-2xl">{emoji}</Text>
            <Text className="font-visby-bold text-lg text-gray-800">{title}</Text>
          </View>
          <TouchableOpacity
            onPress={() => {
              setTargetMealType(type);
              setIsAddModalOpen(true);
            }}
            className="rounded-full bg-white p-2 shadow-sm"
            style={{ shadowColor: colors.accent, shadowOpacity: 0.2, shadowRadius: 4 }}
          >
            <Ionicons name="add-circle" size={24} color={colors.accent} />
          </TouchableOpacity>
        </View>

        {meals.length === 0 ? (
          <View
            className={`mx-4 items-center justify-center rounded-2xl border-2 border-dashed ${colors.border} ${colors.bg} p-6`}
          >
            <Ionicons name="restaurant-outline" size={32} color="#D1D5DB" />
            <Text className="mt-2 font-visby text-sm text-gray-400">Nothing planned yet</Text>
            <Text className="font-visby text-xs text-gray-400">Tap + to add a meal</Text>
          </View>
        ) : (
          meals.map((item) => {
            const isGenerating = item.recipe.id && generatingImages.has(item.recipe.id);

            return (
              <TouchableOpacity
                key={item.id}
                onPress={() => handleMealPress(item.recipe)}
                className="active:scale-98 mx-4 mb-3 overflow-hidden rounded-2xl bg-white shadow-md"
                style={{
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.1,
                  shadowRadius: 8,
                  elevation: 3,
                }}
              >
                <View className="flex-row">
                  {/* Image Section */}
                  <View className="relative">
                    {item.recipe.imageUrl ? (
                      <Image
                        source={{ uri: item.recipe.imageUrl }}
                        style={{ width: 120, height: 120 }}
                        contentFit="cover"
                      />
                    ) : isGenerating ? (
                      <View
                        className="h-[120px] w-[120px] items-center justify-center"
                        style={{ backgroundColor: colors.bg }}
                      >
                        <ActivityIndicator size="small" color={colors.accent} />
                        <Text className="mt-2 font-visby text-xs" style={{ color: colors.accent }}>
                          Generating...
                        </Text>
                      </View>
                    ) : (
                      <TouchableOpacity
                        onPress={(e) => {
                          e.stopPropagation();
                          handleGenerateImage(item.recipe);
                        }}
                        className="h-[120px] w-[120px] items-center justify-center"
                        style={{ backgroundColor: colors.bg }}
                      >
                        <Ionicons name="image-outline" size={32} color={colors.accent} />
                        <Text
                          className="mt-1 font-visby-bold text-xs"
                          style={{ color: colors.accent }}
                        >
                          Generate
                        </Text>
                        <Text className="font-visby text-[10px]" style={{ color: colors.accent }}>
                          Image
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Content Section */}
                  <View className="flex-1 p-4">
                    <View className="mb-2 flex-row items-start justify-between">
                      <View className="flex-1 pr-2">
                        <Text className="font-visby-bold text-base text-gray-900" numberOfLines={2}>
                          {item.recipe.title}
                        </Text>
                        {item.recipe.description && (
                          <Text className="mt-1 font-visby text-xs text-gray-500" numberOfLines={2}>
                            {item.recipe.description}
                          </Text>
                        )}
                      </View>
                      <TouchableOpacity
                        onPress={(e) => {
                          e.stopPropagation();
                          handleDeleteMeal(item.id);
                        }}
                        className="rounded-full bg-gray-100 p-1.5"
                      >
                        <Ionicons name="close" size={16} color="#999" />
                      </TouchableOpacity>
                    </View>

                    {/* Meta Info */}
                    <View className="mt-auto">
                      {/* Type/Collections */}
                      {item.recipe.collections && item.recipe.collections.length > 0 && (
                        <View className="mb-1.5 flex-row flex-wrap">
                          {item.recipe.collections.slice(0, 3).map((tag, idx) => (
                            <View
                              key={idx}
                              className="mb-1 mr-1.5 rounded-md bg-gray-100 px-1.5 py-0.5"
                            >
                              <Text className="font-visby text-[10px] uppercase tracking-wide text-gray-500">
                                {tag}
                              </Text>
                            </View>
                          ))}
                        </View>
                      )}

                      <View className="flex-row items-center justify-between">
                        <View className="flex-row items-center">
                          <View className="mr-3 flex-row items-center">
                            <Ionicons name="time-outline" size={14} color={colors.accent} />
                            <Text
                              className="ml-1 font-visby-bold text-xs"
                              style={{ color: colors.accent }}
                            >
                              {item.recipe.time_minutes || 30}m
                            </Text>
                          </View>
                          <View className="flex-row items-center">
                            <Ionicons name="flame-outline" size={14} color={colors.accent} />
                            <Text
                              className="ml-1 font-visby-bold text-xs"
                              style={{ color: colors.accent }}
                            >
                              {item.recipe.calories_per_serving || 200} cal{' '}
                              <Text className="font-visby text-[10px] opacity-80">/ 1 srv</Text>
                            </Text>
                          </View>
                        </View>

                        {/* Yield/Difficulty */}
                        {item.recipe.difficulty && (
                          <View className={`rounded-full px-2 py-0.5 ${colors.bg}`}>
                            <Text
                              className="font-visby text-[10px]"
                              style={{ color: colors.accent }}
                            >
                              {item.recipe.difficulty}
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </View>
    );
  };

  return (
    <>
      <RecipeDetailModal
        recipe={selectedRecipe}
        visible={!!selectedRecipe}
        onClose={() => setSelectedRecipe(null)}
        onUpdate={handleUpdateRecipe}
        onDelete={handleDeleteRecipe}
        onShare={handleShareRecipe}
        onGenerateFull={handleGenerateFull}
      />

      <SafeAreaView className="flex-1 bg-[#F9FAFB]">
        {/* Header with Gradient Background */}
        <View className="bg-white pb-4 pt-2 shadow-sm">
          <View className="flex-row items-center justify-between px-5 py-3">
            <TouchableOpacity
              onPress={() => Router.back()}
              className="rounded-full bg-gray-100 p-2"
            >
              <Ionicons name="arrow-back" size={22} color="black" />
            </TouchableOpacity>

            <View className="items-center">
              <Text className="font-visby-bold text-2xl text-gray-900">Meal Planner</Text>
              <Text className="font-visby text-xs text-gray-500">Plan your perfect week</Text>
            </View>

            <TouchableOpacity
              onPress={handleGeneratePlan}
              disabled={loading}
              className="rounded-full bg-gradient-to-r from-green-400 to-green-600 p-2.5 shadow-md"
              style={{
                backgroundColor: loading ? '#E5E7EB' : '#8BD65E',
                shadowColor: '#8BD65E',
                shadowOpacity: 0.3,
                shadowRadius: 6,
              }}
            >
              {loading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Ionicons name="sparkles" size={20} color="white" />
              )}
            </TouchableOpacity>
          </View>

          {/* Date Strips */}
          <View className="mt-2">
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
            >
              {dates.map((date) => {
                const dateStr = formatDate(date);
                const isSelected = dateStr === formatDate(selectedDate);
                const isToday = dateStr === formatDate(new Date());

                return (
                  <Pressable
                    key={dateStr}
                    onPress={() => {
                      setSelectedDate(date);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                    className={`h-20 w-16 items-center justify-center rounded-2xl ${
                      isSelected
                        ? 'border-2 border-[#8BD65E] bg-green-50'
                        : 'border border-gray-200 bg-white'
                    }`}
                    style={
                      isSelected
                        ? {
                            shadowColor: '#8BD65E',
                            shadowOpacity: 0.2,
                            shadowRadius: 6,
                            shadowOffset: { width: 0, height: 2 },
                            elevation: 3,
                          }
                        : {}
                    }
                  >
                    <Text
                      className={`mb-1 font-visby text-xs ${
                        isSelected ? 'text-[#8BD65E]' : 'text-gray-500'
                      }`}
                    >
                      {getDayName(date)}
                    </Text>
                    <Text
                      className={`font-visby-bold text-2xl ${
                        isSelected ? 'text-[#8BD65E]' : isToday ? 'text-[#8BD65E]' : 'text-gray-800'
                      }`}
                    >
                      {date.getDate()}
                    </Text>
                    {isToday && !isSelected && (
                      <View className="mt-1 h-1.5 w-1.5 rounded-full bg-[#8BD65E]" />
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>

        <ScrollView
          className="flex-1"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadData} />}
        >
          <View className="flex-row items-center justify-between bg-gradient-to-b from-white to-transparent px-5 pb-2 pt-4">
            <Text className="font-visby-bold text-xs uppercase tracking-wider text-gray-400">
              {selectedDate.toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })}
            </Text>

            {dailyCalories > 0 && (
              <View className="flex-row items-center rounded-full bg-orange-100 px-3 py-1">
                <Ionicons name="flame" size={14} color="#F97316" />
                <Text className="ml-1 font-visby-bold text-xs text-orange-600">
                  {dailyCalories} kcal
                </Text>
              </View>
            )}
          </View>

          {renderMealSection('breakfast', '🍳', 'Breakfast')}
          {renderMealSection('lunch', '🍱', 'Lunch')}
          {renderMealSection('dinner', '🍽️', 'Dinner')}

          <View className="h-20" />
        </ScrollView>

        {/* Add Modal */}
        <Modal visible={isAddModalOpen} animationType="slide" presentationStyle="pageSheet">
          <SafeAreaView className="flex-1 bg-gray-50">
            <View className="border-b border-gray-100 bg-white px-6 py-4">
              <View className="flex-row items-center justify-between">
                <View className="flex-1">
                  <Text className="font-visby-bold text-2xl text-gray-900">
                    Add to {targetMealType}
                  </Text>
                  <Text className="font-visby text-sm text-gray-500">
                    Choose from your saved recipes
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setIsAddModalOpen(false)}
                  className="rounded-full bg-gray-100 p-2"
                >
                  <Ionicons name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>
            </View>

            {myRecipes.length === 0 ? (
              <View className="flex-1 items-center justify-center p-6">
                <View className="items-center rounded-3xl bg-white p-8 shadow-sm">
                  <Ionicons name="restaurant-outline" size={64} color="#D1D5DB" />
                  <Text className="mb-2 mt-4 font-visby-bold text-lg text-gray-700">
                    No recipes yet
                  </Text>
                  <Text className="mb-6 text-center font-visby text-sm text-gray-500">
                    Create your first AI-powered recipe to start planning meals
                  </Text>
                  <TouchableOpacity
                    onPress={() => {
                      setIsAddModalOpen(false);
                      Router.push('/(tabs)/generate');
                    }}
                    className="rounded-full bg-[#8BD65E] px-8 py-3.5 shadow-lg"
                    style={{
                      shadowColor: '#8BD65E',
                      shadowOpacity: 0.3,
                      shadowRadius: 8,
                    }}
                  >
                    <View className="flex-row items-center">
                      <Ionicons
                        name="add-circle-outline"
                        size={20}
                        color="white"
                        style={{ marginRight: 8 }}
                      />
                      <Text className="font-visby-bold text-white">Create Recipe</Text>
                    </View>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <FlatList
                data={myRecipes}
                keyExtractor={(item) => item.id!}
                contentContainerStyle={{ padding: 16, gap: 12 }}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    onPress={() => handleAddMeal(item)}
                    className="active:scale-98 overflow-hidden rounded-2xl bg-white shadow-sm"
                    style={{
                      shadowColor: '#000',
                      shadowOpacity: 0.05,
                      shadowRadius: 6,
                      elevation: 2,
                    }}
                  >
                    <View className="flex-row">
                      <Image
                        source={{ uri: item.imageUrl || 'https://via.placeholder.com/100' }}
                        style={{ width: 100, height: 100 }}
                        contentFit="cover"
                      />
                      <View className="flex-1 p-4">
                        <Text className="font-visby-bold text-base text-gray-900" numberOfLines={2}>
                          {item.title}
                        </Text>
                        <Text className="mt-1 font-visby text-xs text-gray-500" numberOfLines={2}>
                          {item.description || 'No description'}
                        </Text>
                        <View className="mt-2 flex-row items-center">
                          <View className="mr-3 flex-row items-center">
                            <Ionicons name="time-outline" size={12} color="#CC5544" />
                            <Text className="ml-1 font-visby text-xs text-gray-600">
                              {item.time_minutes || 30}m
                            </Text>
                          </View>
                          <View className="flex-row items-center">
                            <Ionicons name="flame-outline" size={12} color="#CC5544" />
                            <Text className="ml-1 font-visby text-xs text-gray-600">
                              {item.calories_per_serving || 200} cal
                            </Text>
                          </View>
                        </View>
                      </View>
                      <View className="items-center justify-center px-4">
                        <View className="rounded-full bg-[#8BD65E] p-2">
                          <Ionicons name="add" size={20} color="white" />
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>
                )}
              />
            )}
          </SafeAreaView>
        </Modal>

        <AutoPlanModal
          visible={isAutoPlanModalOpen}
          onClose={() => setIsAutoPlanModalOpen(false)}
          onSubmit={handleConfirmPlan}
          isLoading={loading}
        />
      </SafeAreaView>
    </>
  );
}
