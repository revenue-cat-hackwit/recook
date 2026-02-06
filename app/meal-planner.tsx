import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Modal,
  FlatList,
  ActivityIndicator,
  Pressable,
  Share,
  TextInput,
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
import { useShoppingListStore } from '@/lib/store/shoppingListStore';
import { PantryService, PantryItem } from '@/lib/services/pantryService';
import * as Haptics from 'expo-haptics';
import { CustomAlertModal } from '@/components/CustomAlertModal';
import Toast, { ToastRef } from '@/components/Toast';
import { LoadingModal } from '@/components/LoadingModal';
import { TickCircle, Danger, Trash, ShoppingCart, MagicStar } from 'iconsax-react-native';
import Animated, { ZoomIn, ZoomOut, Easing } from 'react-native-reanimated';
import { AuthApiService } from '@/lib/services/authApiService';

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
  const [rawPersonalization, setRawPersonalization] = useState<any>(null); // Store full personalization data

  // Recipe Detail Modal State
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [initialModalMode, setInitialModalMode] = useState<'view' | 'edit'>('view');

  // Toast ref for error handling
  const toastRef = useRef<ToastRef>(null);

  // Recipe Generator for completing placeholder recipes
  const {
    completeRecipe,
    loading: generatorLoading,
    loadingMessage,
  } = useRecipeGenerator({
    toastRef,
  });

  console.log('🍳🍳🍳 completeRecipe exists:', !!completeRecipe);
  console.log('🍳🍳🍳 completeRecipe type:', typeof completeRecipe);

  // Track image generation per recipe ID
  const [generatingImages, setGeneratingImages] = useState<Set<string>>(new Set());

  // Pantry Integration
  const addToShoppingList = useShoppingListStore((state) => state.addMultiple);
  const [pantryItems, setPantryItems] = useState<PantryItem[]>([]);

  // Custom Alert State
  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type?: 'default' | 'destructive';
    icon?: any;
    confirmText?: string;
    showCancel?: boolean;
    onConfirm?: () => void;
  }>({
    visible: false,
    title: '',
    message: '',
    confirmText: 'OK',
    showCancel: false,
  });

  const showAlert = (config: {
    title: string;
    message: string;
    type?: 'default' | 'destructive';
    icon?: any;
    confirmText?: string;
    cancelText?: string;
    showCancel?: boolean;
    onConfirm?: () => void;
    onCancel?: () => void;
  }) => {
    setAlertConfig({
      visible: true,
      confirmText: 'OK',
      cancelText: 'Cancel',
      showCancel: false,
      ...config,
    });
  };

  const closeAlert = () => {
    setAlertConfig((prev) => ({ ...prev, visible: false }));
  };

  // Generate 14 days - moved to useMemo to avoid recreation on every render
  const dates = useMemo(() => {
    return Array.from({ length: 14 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() + i);
      return d;
    });
  }, []);

  const loadData = useCallback(
    async (isRefresh = false) => {
      if (!isRefresh) {
        setLoading(true);
      }
      try {
        const start = formatDate(dates[0]);
        const end = formatDate(dates[dates.length - 1]);
        const plans = await MealPlannerService.getMealPlans(start, end);
        setMealPlans(plans);

        // Also fetch recipes for picker
        const recipes = await RecipeService.getUserRecipes();
        setMyRecipes(recipes);

        // Load pantry items for availability check
        try {
          const pantry = await PantryService.getPantryItems();
          setPantryItems(pantry);
        } catch (e) {
          console.error('Failed to load pantry:', e);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [dates],
  );

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
      loadData(true); // Refresh
    } catch (e: any) {
      showAlert({ title: 'Error', message: e.message, type: 'destructive', icon: 'alert-circle' });
    }
  };

  const handleDeleteMeal = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    showAlert({
      title: 'Remove Meal?',
      message: 'Are you sure you want to remove this meal from your plan?',
      type: 'destructive',
      icon: <Trash size={32} color="#EF4444" variant="Bold" />,
      showCancel: true,
      confirmText: 'Remove',
      onConfirm: async () => {
        try {
          await MealPlannerService.deleteMealPlan(id);
          loadData(true);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (e: any) {
          showAlert({
            title: 'Error',
            message: 'Failed to remove meal',
            type: 'destructive',
            icon: <Danger size={32} color="#EF4444" variant="Bold" />,
          });
        }
      },
    });
  };

  // completeRecipe is already destuctured from useRecipeGenerator at the top of the component

  const handleWriteRecipe = () => {
    const blankRecipe: Recipe = {
      title: '',
      description: '',
      ingredients: [],
      steps: [],
      time_minutes: '15',
      calories_per_serving: '0',
      servings: '1',
      difficulty: 'Easy',
      createdAt: new Date().toISOString(),
      collections: [],
    };
    setInitialModalMode('edit');
    setSelectedRecipe(blankRecipe);
    setIsAddModalOpen(false);
  };

  const handleUseAI = () => {
    setIsAddModalOpen(false);
    // Ideally open a specific AI suggestions modal for this meal slot
    // For now, redirecting to Generate tab or opening AutoPlan but scoped?
    // Let's redirect to Generate page which handles AI recipe creation
    Router.push('/(tabs)/generate');
  };

  // Auto Plan Modal State
  const [isAutoPlanModalOpen, setIsAutoPlanModalOpen] = useState(false);
  const [generationMode, setGenerationMode] = useState<'replace' | 'fill'>('replace');
  const [showGenerationModeModal, setShowGenerationModeModal] = useState(false);
  const [existingMealsCount, setExistingMealsCount] = useState(0);
  const [userPreferences, setUserPreferences] = useState<Partial<AutoPlanPreferences>>({});

  const handleGeneratePlan = async () => {
    // Check for existing meals
    const today = new Date();
    const next7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      return formatDate(d);
    });

    const existingMeals = mealPlans.filter((plan) => next7Days.includes(plan.date));

    // Try to pre-fetch user preferences (Allergies specifically)
    try {
        const personalizationRes = await AuthApiService.getPersonalization();
        
        // Check if personalization exists and has data based on backend response shape
        const personalization = personalizationRes?.data?.personalization; // Based on route.ts response structure

        if (personalization) {
            setRawPersonalization(personalization);
            setUserPreferences({
                // Backend 'foodAllergies' is string[]
                allergies: personalization.foodAllergies && Array.isArray(personalization.foodAllergies) 
                  ? personalization.foodAllergies.join(', ') 
                  : '',
                // Backend currently doesn't store dietGoal, dietType, or calories. 
                // Leaving them undefined means modal will use its internal defaults.
            });
        }
    } catch (err) {
        console.log("Failed to fetch preferences, using defaults", err);
    }

    if (existingMeals.length > 0) {
      // Show custom modal with options
      setExistingMealsCount(existingMeals.length);
      setShowGenerationModeModal(true);
    } else {
      // No existing meals, proceed directly with replace mode
      setGenerationMode('replace');
      setIsAutoPlanModalOpen(true);
    }
  };

  const handleConfirmPlan = async (prefs: any) => {
    setLoading(true);
    try {
      // Merge with raw personalization data if available
      const finalPrefs = {
        ...prefs,
        foodAllergies: rawPersonalization?.foodAllergies || [],
        favoriteCuisines: rawPersonalization?.favoriteCuisines || [],
        whatsInYourKitchen: rawPersonalization?.whatsInYourKitchen || [],
        otherTools: rawPersonalization?.otherTools || [],
        tastePreferences: rawPersonalization?.tastePreferences || [],
      };

      await MealPlannerService.generateWeeklyPlan(formatDate(new Date()), finalPrefs, generationMode);
      showAlert({
        title: 'Success',
        message: 'Weekly meal plan created!',
        icon: <TickCircle size={32} color="#10B981" variant="Bold" />,
        type: 'default',
      });
      setIsAutoPlanModalOpen(false);
      loadData(true);
    } catch (e: any) {
      console.error('Auto Plan Error:', e);
      let errorMsg = e.message || 'Something went wrong.';

      // Clean up common technical prefixes if present
      errorMsg = errorMsg.replace('Server Error: ', '');

      showAlert({
        title: 'Oops!',
        message: errorMsg,
        type: 'destructive',
        icon: <Danger size={32} color="#EF4444" variant="Bold" />,
      });
    } finally {
      setLoading(false);
    }
  };

  // Recipe Detail Modal Handlers
  const handleMealPress = (recipe: Recipe) => {
    setInitialModalMode('view');
    setSelectedRecipe(recipe);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleUpdateRecipe = async (updatedRecipe: Recipe) => {
    try {
      if (updatedRecipe.id) {
        await RecipeService.updateRecipe(updatedRecipe);
        setSelectedRecipe(updatedRecipe);
        showAlert({
          title: 'Success',
          message: 'Recipe updated!',
          icon: <TickCircle size={32} color="#10B981" variant="Bold" />,
        });
      } else {
        // Create new recipe
        const result = await RecipeService.saveRecipe(updatedRecipe);
        const savedRecipe = (result as any).data || result;

        if (savedRecipe?.id) {
          await MealPlannerService.addMealPlan(
            savedRecipe.id,
            formatDate(selectedDate),
            targetMealType,
          );
          setSelectedRecipe(null); // Close modal
          showAlert({
            title: 'Success',
            message: 'Recipe created and added to meal plan!',
            icon: <TickCircle size={32} color="#10B981" variant="Bold" />,
          });
        }
      }

      loadData(true); // Refresh meal plans
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      showAlert({
        title: 'Error',
        message: e.message,
        type: 'destructive',
        icon: <Danger size={32} color="#EF4444" variant="Bold" />,
      });
    }
  };

  const handleDeleteRecipe = async (id: string) => {
    showAlert({
      title: 'Delete Recipe',
      message:
        'This will delete the recipe from your collection. The meal plan entry will remain but show as "Recipe Deleted".',
      type: 'destructive',
      icon: <Trash size={32} color="#EF4444" variant="Bold" />,
      showCancel: true,
      confirmText: 'Delete',
      onConfirm: async () => {
        try {
          await RecipeService.deleteRecipe(id);
          setSelectedRecipe(null);
          loadData(true);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (e: any) {
          showAlert({
            title: 'Error',
            message: e.message,
            type: 'destructive',
            icon: <Danger size={32} color="#EF4444" variant="Bold" />,
          });
        }
      },
    });
  };

  const handleShareRecipe = async (recipe: Recipe) => {
    const ingredientsList = recipe.ingredients
      .map((i) => `• ${i.quantity} ${i.unit} ${i.item}`)
      .join('\n');
    const stepsList = recipe.steps.map((s) => `${s.step}. ${s.instruction}`).join('\n\n');

    const message =
      `🍳 *${recipe.title}*\n\n` +
      `⏱️ Time: ${recipe.time_minutes}m | 🔥 Calories: ${recipe.calories_per_serving}\n\n` +
      `🛒 *Ingredients:*\n${ingredientsList}\n\n` +
      `👨‍🍳 *Instructions:*\n${stepsList}\n\n` +
      `_Made with Recook App_ 📲`;

    try {
      await Share.share({ message });
    } catch (error) {
      console.error(error);
    }
  };

  const handleGenerateFull = useCallback(
    async (recipe: Recipe) => {
      console.log('🍳🍳🍳 ===== handleGenerateFull START =====');
      console.log('🍳 handleGenerateFull called in meal-planner with recipe:', recipe.id);
      console.log('🍳 completeRecipe available:', !!completeRecipe);
      try {
        console.log('🍳 Calling completeRecipe...');
        const result = await completeRecipe(recipe);
        console.log('🍳 completeRecipe result:', result);

        // Check if quota exceeded
        if (result && !result.success && result.needsPaywall) {
          console.log('🍳 Quota exceeded - showing paywall alert');
          showAlert({
            title: 'Daily Limit Reached 🍳',
            message:
              'You have used your 3 free recipes for today. Upgrade to Pro for unlimited access!',
            confirmText: 'Upgrade to Pro',
            cancelText: 'Cancel',
            showCancel: true,
            type: 'default',
            onConfirm: async () => {
              const RevenueCatUI = require('react-native-purchases-ui').default;
              const paywallResult = await RevenueCatUI.presentPaywall();
              console.log('Paywall result:', paywallResult);
            },
          });
          return;
        }

        if (result && result.success && result.data) {
          console.log('🍳 Setting selectedRecipe with new data:', result.data);

          // Close and reopen modal with new data to force refresh
          setSelectedRecipe(null);
          setTimeout(() => {
            setSelectedRecipe(result.data);
          }, 100);

          loadData(true); // Refresh to show completed recipe in meal plan
          showAlert({
            title: 'Recipe Completed',
            message: 'Your recipe details are ready! 👨‍🍳',
            icon: <MagicStar size={32} color="#8BD65E" variant="Bold" />,
          });
        } else {
          console.log('🍳 completeRecipe failed or returned no data');
          console.log('🍳 Error from result:', result?.error);

          // Show error to user
          showAlert({
            title: 'Generation Failed',
            message: result?.error || 'Could not generate recipe details. Please try again.',
            icon: <Danger size={32} color="#EF4444" variant="Bold" />,
            type: 'destructive',
          });
        }
      } catch (error: any) {
        console.error('🍳 Error in handleGenerateFull:', error);
        showAlert({
          title: 'Error',
          message: error?.message || 'Failed to generate recipe',
          icon: <Danger size={32} color="#EF4444" variant="Bold" />,
          type: 'destructive',
        });
      }
      console.log('🍳🍳🍳 ===== handleGenerateFull END =====');
    },
    [completeRecipe, loadData, showAlert],
  );

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
      loadData(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Image generation failed:', error);
      showAlert({
        title: 'Failed',
        message: 'Could not generate image. Please try again.',
        type: 'destructive',
        icon: <Danger size={32} color="#EF4444" variant="Bold" />,
      });
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
              <View key={item.id} className="relative mx-4 mb-3">
                <Pressable
                  onPress={() => handleMealPress(item.recipe)}
                  className="overflow-hidden rounded-2xl bg-white shadow-md"
                  style={({ pressed }) => [
                    {
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.1,
                      shadowRadius: 8,
                      elevation: 3,
                      opacity: pressed ? 0.8 : 1,
                    },
                  ]}
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
                      ) : generatingImages.has(item.recipe.id || '') ? (
                        <View
                          className="h-[120px] w-[120px] items-center justify-center"
                          style={{ backgroundColor: colors.bg }}
                        >
                          <ActivityIndicator size="small" color={colors.accent} />
                          <Text
                            className="mt-1 font-visby-bold text-xs"
                            style={{ color: colors.accent }}
                          >
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
                          <Text
                            className="font-visby-bold text-base text-gray-900"
                            numberOfLines={2}
                          >
                            {item.recipe.title}
                          </Text>
                          {item.recipe.description && (
                            <Text
                              className="mt-1 font-visby text-xs text-gray-500"
                              numberOfLines={2}
                            >
                              {item.recipe.description}
                            </Text>
                          )}
                        </View>
                        {/* Spacer for floating buttons */}
                        <View style={{ width: 70 }} />
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

                        {/* Pantry Availability Indicator */}
                        {(() => {
                          const totalIngredients = item.recipe.ingredients?.length || 0;
                          const availableInPantry =
                            item.recipe.ingredients?.filter((ing) => {
                              const lowerIng = ing.item?.toLowerCase().trim() || '';
                              return pantryItems.some(
                                (pantryItem) =>
                                  pantryItem.ingredient_name.toLowerCase().includes(lowerIng) ||
                                  lowerIng.includes(pantryItem.ingredient_name.toLowerCase()),
                              );
                            }).length || 0;

                          if (totalIngredients > 0 && availableInPantry > 0) {
                            return (
                              <View className="mb-1.5 flex-row items-center">
                                <View className="flex-row items-center rounded-full bg-green-50 px-2 py-0.5">
                                  <Ionicons name="checkmark-circle" size={12} color="#10B981" />
                                  <Text className="ml-1 font-visby-bold text-[10px] text-green-600">
                                    {availableInPantry}/{totalIngredients} in pantry
                                  </Text>
                                </View>
                              </View>
                            );
                          }
                          return null;
                        })()}

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
                </Pressable>

                {/* Floating Action Buttons - Outside Pressable */}
                <View className="absolute right-3 top-3 flex-row gap-1" style={{ zIndex: 999 }}>
                  <TouchableOpacity
                    onPress={() => {
                      console.log('Cart button pressed for:', item.recipe.title);

                      const ingredients = item.recipe.ingredients || [];

                      // Check if recipe has no ingredients
                      if (ingredients.length === 0) {
                        showAlert({
                          title: 'Recipe Incomplete',
                          message:
                            'This recipe has no ingredients yet. Please complete the recipe details first.',
                          icon: <Danger size={32} color="#F59E0B" variant="Bold" />,
                          type: 'default',
                        });
                        return;
                      }

                      const ingredientsToAdd = ingredients
                        .map((ing) => ({
                          name: ing.item,
                          quantity: ing.quantity,
                          unit: ing.unit,
                        }))
                        .filter((ing) => {
                          const lowerIng = ing.name.toLowerCase().trim();
                          return !pantryItems.some(
                            (pantryItem) =>
                              pantryItem.ingredient_name.toLowerCase().includes(lowerIng) ||
                              lowerIng.includes(pantryItem.ingredient_name.toLowerCase()),
                          );
                        });

                      if (ingredientsToAdd.length > 0) {
                        const normalizedIngredients = ingredientsToAdd.map((ing) => ({
                          name: ing.name,
                          quantity:
                            typeof ing.quantity === 'string'
                              ? parseFloat(ing.quantity) || undefined
                              : ing.quantity,
                          unit: ing.unit,
                        }));
                        addToShoppingList(normalizedIngredients, item.recipe.title);
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        showAlert({
                          title: 'Added! 🛒',
                          message: `${ingredientsToAdd.length} ingredients from "${item.recipe.title}" added to shopping list.`,
                          icon: <ShoppingCart size={32} color="#3B82F6" variant="Bold" />,
                          type: 'default',
                        });
                      } else {
                        showAlert({
                          title: 'All Set!',
                          message: 'All ingredients are already in your pantry.',
                          icon: <TickCircle size={32} color="#10B981" variant="Bold" />,
                          type: 'default',
                        });
                      }
                    }}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    className="rounded-full bg-blue-50 p-1.5 shadow-sm"
                    style={{
                      elevation: 10,
                      shadowColor: '#3B82F6',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.3,
                      shadowRadius: 4,
                    }}
                  >
                    <Ionicons name="cart-outline" size={14} color="#3B82F6" />
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => handleDeleteMeal(item.id)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    className="rounded-full bg-gray-100 p-1.5 shadow-sm"
                    style={{
                      elevation: 10,
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.2,
                      shadowRadius: 4,
                    }}
                  >
                    <Ionicons name="close" size={14} color="#999" />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </View>
    );
  };

  return (
    <>
      {/* Loading Overlay */}
      <LoadingModal visible={generatorLoading} message="Generating Meal Plan..." subMessage={loadingMessage} />

      <RecipeDetailModal
        recipe={selectedRecipe}
        visible={!!selectedRecipe}
        onClose={() => setSelectedRecipe(null)}
        onUpdate={handleUpdateRecipe}
        onDelete={handleDeleteRecipe}
        onShare={handleShareRecipe}
        onGenerateFull={(recipe) => {
          console.log('🍳🍳🍳 WRAPPER onGenerateFull called with recipe:', recipe.id);
          return handleGenerateFull(recipe);
        }}
        initialMode={initialModalMode}
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
                <MagicStar size={20} color="white" variant="Bold" />
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
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                loadData(true);
              }}
            />
          }
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

          {loading ? (
            <View className="flex-1 items-center justify-center py-20">
              <ActivityIndicator size="large" color="#8BD65E" />
              <Text className="mt-4 font-visby text-sm text-gray-500">
                Loading your meal plan...
              </Text>
            </View>
          ) : (
            <>
              {renderMealSection('breakfast', '🍳', 'Breakfast')}
              {renderMealSection('lunch', '🍱', 'Lunch')}
              {renderMealSection('dinner', '🍽️', 'Dinner')}
            </>
          )}

          <View className="h-20" />
        </ScrollView>

        {/* Add Modal */}
        <Modal visible={isAddModalOpen} animationType="slide" presentationStyle="pageSheet">
          <SafeAreaView className="flex-1 bg-gray-50">
            <View className="border-b border-gray-100 bg-white px-6 py-5 shadow-sm">
              <View className="flex-row items-center justify-between">
                <View className="flex-1">
                  <Text className="font-visby-bold text-2xl tracking-tight text-gray-900">
                    Add to {targetMealType}
                  </Text>
                  <Text className="mt-1 font-visby text-xs text-gray-400">
                    What are we eating today?
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => {
                    setIsAddModalOpen(false);
                  }}
                  className="rounded-full border border-gray-100 bg-gray-50 p-2"
                >
                  <Ionicons name="close" size={20} color="#666" />
                </TouchableOpacity>
              </View>
            </View>

            <View className="px-6 pt-6">
              {/* Quick Actions Grid */}
              <View className="mb-6 flex-row gap-4">
                <TouchableOpacity
                  onPress={handleWriteRecipe}
                  className="flex-1 flex-row items-center justify-center gap-2 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-all active:scale-95"
                  style={{
                    shadowColor: '#000',
                    shadowOpacity: 0.05,
                    shadowOffset: { width: 0, height: 2 },
                    elevation: 2,
                  }}
                >
                  <View className="rounded-full bg-orange-50 p-2">
                    <Ionicons name="pencil" size={18} color="#F97316" />
                  </View>
                  <Text className="font-visby-bold text-xs text-gray-700">Write Recipe</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleUseAI}
                  className="flex-1 flex-row items-center justify-center gap-2 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-all active:scale-95"
                  style={{
                    shadowColor: '#000',
                    shadowOpacity: 0.05,
                    shadowOffset: { width: 0, height: 2 },
                    elevation: 2,
                  }}
                >
                  <View className="rounded-full bg-green-50 p-2">
                    <Image
                      source={require('@/assets/images/cooki.png')}
                      style={{ width: 24, height: 24 }}
                      contentFit="contain"
                    />
                  </View>
                  <Text className="font-visby-bold text-xs text-gray-700">Ask AI Chef</Text>
                </TouchableOpacity>
              </View>
            </View>

            <Text className="mb-2 px-6 font-visby-bold text-sm uppercase tracking-wider text-gray-500">
              Saved Recipes
            </Text>

            {myRecipes.length === 0 ? (
              <View className="flex-1 items-center justify-center p-6 opacity-70">
                <Ionicons name="book-outline" size={48} color="#D1D5DB" />
                <Text className="mt-4 font-visby-bold text-lg text-gray-400">No Saved Recipes</Text>
                <Text className="text-center font-visby text-sm text-gray-400">
                  Your saved recipes will appear here for easy adding.
                </Text>
              </View>
            ) : (
              <FlatList
                data={myRecipes}
                keyExtractor={(item) => item.id!}
                contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40, gap: 12 }}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    onPress={() => handleAddMeal(item)}
                    className="active:scale-98 flex-row overflow-hidden rounded-2xl border border-gray-100 bg-white p-3 shadow-sm"
                  >
                    <Image
                      source={{ uri: item.imageUrl || 'https://via.placeholder.com/100' }}
                      style={{ width: 70, height: 70, borderRadius: 12 }}
                      contentFit="cover"
                    />
                    <View className="flex-1 justify-center px-3">
                      <Text className="font-visby-bold text-sm text-gray-900" numberOfLines={1}>
                        {item.title}
                      </Text>
                      <View className="mt-1 flex-row items-center gap-3">
                        <View className="flex-row items-center">
                          <Ionicons name="flame-outline" size={12} color="#F97316" />
                          <Text className="ml-1 font-visby text-xs text-gray-500">
                            {item.calories_per_serving || 0}
                          </Text>
                        </View>
                        <View className="flex-row items-center">
                          <Ionicons name="time-outline" size={12} color="#8BD65E" />
                          <Text className="ml-1 font-visby text-xs text-gray-500">
                            {item.time_minutes || 0}m
                          </Text>
                        </View>
                      </View>
                    </View>
                    <View className="items-center justify-center">
                      <View className="h-8 w-8 items-center justify-center rounded-full bg-green-50">
                        <Ionicons name="add" size={20} color="#10B981" />
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
          initialPreferences={userPreferences}
        />

        {/* Generation Mode Selection Modal */}
        <Modal
          visible={showGenerationModeModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowGenerationModeModal(false)}
        >
          <View className="flex-1 items-center justify-center bg-black/50 px-6">
            <Animated.View
              entering={ZoomIn.duration(200).easing(Easing.out(Easing.quad))}
              exiting={ZoomOut.duration(200).easing(Easing.in(Easing.quad))}
              className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl"
            >
              <Text className="mb-2 font-visby-bold text-xl text-gray-900">
                Existing Meals Found
              </Text>
              <Text className="mb-6 font-visby text-base leading-6 text-gray-600">
                You have {existingMealsCount} meal(s) already planned for the next 7 days.
                {'\n\n'}
                How would you like to proceed?
              </Text>

              {/* Action Buttons */}
              <View className="gap-3">
                <TouchableOpacity
                  onPress={() => {
                    setShowGenerationModeModal(false);
                    setGenerationMode('replace');
                    setIsAutoPlanModalOpen(true);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  }}
                  className="active:scale-98 items-center rounded-2xl bg-red-500 py-4"
                  style={{
                    shadowColor: '#EF4444',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.3,
                    shadowRadius: 8,
                    elevation: 4,
                  }}
                >
                  <Text className="font-visby-bold text-base uppercase tracking-wide text-white">
                    Replace All
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    setShowGenerationModeModal(false);
                    setGenerationMode('fill');
                    setIsAutoPlanModalOpen(true);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  }}
                  className="active:scale-98 items-center rounded-2xl bg-[#8BD65E] py-4"
                  style={{
                    shadowColor: '#8BD65E',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.3,
                    shadowRadius: 8,
                    elevation: 4,
                  }}
                >
                  <Text className="font-visby-bold text-base uppercase tracking-wide text-white">
                    Fill Empty Only
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    setShowGenerationModeModal(false);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                  className="active:scale-98 items-center rounded-2xl border-2 border-gray-200 bg-white py-4"
                >
                  <Text className="font-visby-bold text-base uppercase tracking-wide text-gray-600">
                    Cancel
                  </Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          </View>
        </Modal>

        <CustomAlertModal
          visible={alertConfig.visible}
          title={alertConfig.title}
          message={alertConfig.message}
          type={alertConfig.type}
          icon={alertConfig.icon}
          confirmText={alertConfig.confirmText}
          showCancel={alertConfig.showCancel}
          onClose={closeAlert}
          onConfirm={alertConfig.onConfirm || closeAlert}
        />

        {/* Toast for error/success notifications */}
        <Toast ref={toastRef} />
      </SafeAreaView>
    </>
  );
}
