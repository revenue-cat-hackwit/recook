import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { showAlert } from '@/lib/utils/globalAlert';
import { Danger, TickCircle } from 'iconsax-react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { useColorScheme } from 'nativewind';
import { Recipe } from '@/lib/types';
import { useShoppingListStore } from '@/lib/store/shoppingListStore';
import { Video, ResizeMode } from 'expo-av';
import { CollectionSelectorModal } from './CollectionSelectorModal';
import { RecipeService } from '@/lib/services/recipeService';

interface RecipeDetailModalProps {
  recipe: Recipe | null;
  visible: boolean;
  onClose: () => void;
  onUpdate: (updatedRecipe: Recipe) => Promise<void>;
  onDelete: (id: string) => void;
  onShare: (recipe: Recipe) => void;
  onGenerateFull?: (recipe: Recipe) => Promise<void>;
  initialMode?: 'view' | 'edit';
  availableCollections?: string[];
}

export const RecipeDetailModal: React.FC<RecipeDetailModalProps> = ({
  recipe,
  visible,
  onClose,
  onUpdate,
  onDelete,
  onShare,
  onGenerateFull,
  initialMode = 'view',
  availableCollections = [],
}) => {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const addToShoppingList = useShoppingListStore((state) => state.addMultiple);

  const [isEditing, setIsEditing] = useState(initialMode === 'edit');
  const [isGenerating, setIsGenerating] = useState(false);
  const [tempRecipe, setTempRecipe] = useState<Recipe | null>(null);

  // Collection Selector State
  const [showCollectionSelector, setShowCollectionSelector] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [isAddingCollection, setIsAddingCollection] = useState(false);
  const [contentReady, setContentReady] = useState(false);

  useEffect(() => {
    if (visible) {
      if (initialMode === 'edit' && recipe) {
        setIsEditing(true);
        setTempRecipe({
          ...recipe,
          ingredients: recipe.ingredients || [],
          steps: recipe.steps || [],
          tips: recipe.tips || '',
        });
      } else {
        setIsEditing(false);
        setTempRecipe(null);
      }
      setIsGenerating(false);
      setShowCollectionSelector(false); // Reset on open

      // Delay content rendering to allow modal animation to be smooth
      const timer = setTimeout(() => {
        setContentReady(true);
      }, 350);
      return () => clearTimeout(timer);
    } else {
      setContentReady(false);
    }
  }, [visible, recipe, initialMode]);

  const toggleCollection = (collectionName: string) => {
    // Determine target recipe (temp if editing, else current recipe)
    const target = isEditing ? tempRecipe : recipe;
    if (!target) return;

    const currentCollections = target.collections || [];
    let newCollections;

    if (currentCollections.includes(collectionName)) {
      newCollections = currentCollections.filter((c) => c !== collectionName);
    } else {
      newCollections = [...currentCollections, collectionName];
    }

    const updated = { ...target, collections: newCollections };

    if (isEditing) {
      setTempRecipe(updated);
    } else {
      // If viewing, save immediately
      onUpdate(updated)
        .then(() => Haptics.selectionAsync())
        .catch((e) => console.error(e));
    }
  };

  const handleAddNewCollection = () => {
    if (!newCollectionName.trim()) {
      setIsAddingCollection(false);
      return;
    }
    toggleCollection(newCollectionName.trim());
    setNewCollectionName('');
    setIsAddingCollection(false);
  };

  const handleGenerateClick = async () => {
    if (onGenerateFull && recipe) {
      setIsGenerating(true);
      try {
        await onGenerateFull(recipe);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (e) {
        console.error(e);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } finally {
        setIsGenerating(false);
      }
    }
  };

  const handleStartEdit = () => {
    if (recipe) {
      setTempRecipe({
        ...recipe,
        ingredients: recipe.ingredients || [],
        steps: recipe.steps || [],
        tips: recipe.tips || '',
      });
      setIsEditing(true);
    }
  };

  const hasUnsavedChanges = () => {
    if (!tempRecipe || !recipe) return false;

    // Compare key fields to detect changes
    return (
      tempRecipe.title !== recipe.title ||
      tempRecipe.description !== recipe.description ||
      JSON.stringify(tempRecipe.ingredients) !== JSON.stringify(recipe.ingredients) ||
      JSON.stringify(tempRecipe.steps) !== JSON.stringify(recipe.steps) ||
      tempRecipe.time_minutes !== recipe.time_minutes ||
      tempRecipe.servings !== recipe.servings ||
      tempRecipe.difficulty !== recipe.difficulty ||
      tempRecipe.calories_per_serving !== recipe.calories_per_serving ||
      tempRecipe.tips !== recipe.tips
    );
  };

  const handleCancelEdit = () => {
    // If creating a new recipe (no ID), cancel means close modal
    if (!recipe?.id) {
      // Check if user has entered any data
      const hasData =
        tempRecipe &&
        (tempRecipe.title?.trim() ||
          tempRecipe.description?.trim() ||
          (tempRecipe.ingredients && tempRecipe.ingredients.some((i) => i.item.trim())) ||
          (tempRecipe.steps && tempRecipe.steps.some((s) => s.instruction?.trim())));

      if (hasData) {
        showAlert(
          'Discard Recipe?',
          'You have unsaved changes. Are you sure you want to discard this recipe?',
          [
            { text: 'Keep Editing', style: 'cancel' },
            {
              text: 'Discard',
              style: 'destructive',
              onPress: () => {
                onClose();
              },
            },
          ],
          {
            icon: <Danger size={32} color="#EF4444" variant="Bold" />,
            type: 'destructive',
          },
        );
        return;
      }

      onClose();
      return;
    }

    // If editing existing recipe, check for unsaved changes
    if (hasUnsavedChanges()) {
      showAlert(
        'Unsaved Changes',
        'You have unsaved changes. Do you want to discard them?',
        [
          { text: 'Keep Editing', style: 'cancel' },
          {
            text: 'Discard Changes',
            style: 'destructive',
            onPress: () => {
              setIsEditing(false);
              setTempRecipe(null);
            },
          },
        ],
        {
          icon: <Danger size={32} color="#EF4444" variant="Bold" />,
          type: 'destructive',
        },
      );
      return;
    }

    setIsEditing(false);
    setTempRecipe(null);
  };

  const handleSaveEdit = async () => {
    if (tempRecipe) {
      if (!tempRecipe.title.trim()) {
        showAlert('Missing Info', 'Please give your recipe a title!', undefined, {
          icon: <Danger size={32} color="#EF4444" variant="Bold" />,
          type: 'destructive',
        });
        return;
      }

      await onUpdate(tempRecipe);
      setIsEditing(false);
    }
  };

  const handleAddIngredientsToShoppingList = async () => {
    if (recipe) {
      const ingredientsData = (recipe.ingredients || []).map((ing) => ({
        name: ing.item,
        quantity:
          typeof ing.quantity === 'number'
            ? ing.quantity
            : parseFloat(String(ing.quantity)) || undefined,
        unit: ing.unit,
      }));

      // Add with pantry check handled by store
      await addToShoppingList(ingredientsData, recipe.title);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showAlert('Success', 'Ingredients added to Shopping List!', undefined, {
        icon: <TickCircle size={32} color="#10B981" variant="Bold" />,
      });
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.7,
    });

    if (!result.canceled && result.assets && result.assets[0].uri) {
      setTempRecipe((prev) => (prev ? { ...prev, imageUrl: result.assets[0].uri } : null));
    }
  };

  const activeRecipe = isEditing ? tempRecipe : recipe;

  if (!recipe && !tempRecipe) return null;
  const displayRecipe = activeRecipe || recipe!;

  // Helper to check for video types
  const isDirectVideo = !!(
    displayRecipe.sourceUrl && displayRecipe.sourceUrl.match(/\.(mp4|mov|webm)(\?.*)?$/i)
  );

  const isYouTube = !!(
    displayRecipe.sourceUrl &&
    displayRecipe.sourceUrl.match(/(youtube\.com|youtu\.be|tiktok\.com|instagram\.com)/i)
  );

  const handleOpenLink = async () => {
    if (displayRecipe.sourceUrl) {
      const supported = await Linking.canOpenURL(displayRecipe.sourceUrl);
      if (supported) {
        await Linking.openURL(displayRecipe.sourceUrl);
      } else {
        showAlert('Error', 'Cannot open this link', undefined, {
          icon: <Danger size={32} color="#EF4444" variant="Bold" />,
          type: 'destructive',
        });
      }
    }
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={() => {
        onClose();
        setIsEditing(false);
      }}
    >
      <View className="flex-1 justify-end bg-black/50">
        <View className="h-[90%] rounded-t-3xl bg-white p-6 dark:bg-[#1A1A1A]">
          <View className="mb-4 flex-row items-center justify-between">
            {isEditing ? (
              <>
                <Text className="flex-1 font-visby-bold text-2xl text-gray-900 dark:text-white">
                  {tempRecipe?.id ? 'Edit Recipe' : 'New Recipe'}
                </Text>
                <View className="flex-row gap-2">
                  <TouchableOpacity
                    onPress={handleSaveEdit}
                    className="rounded-full bg-primary p-2"
                  >
                    <Ionicons name="checkmark" size={24} color="white" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleCancelEdit}
                    className="rounded-full bg-red-100 p-2"
                  >
                    <Ionicons name="close" size={24} color="red" />
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <View className="flex-1 flex-row justify-end">
                <TouchableOpacity
                  onPress={() => {
                    onClose();
                    setIsEditing(false);
                  }}
                  className="rounded-full bg-gray-100 p-2 dark:bg-gray-800"
                >
                  <Ionicons name="close" size={24} color={isDark ? 'white' : 'black'} />
                </TouchableOpacity>
              </View>
            )}
          </View>

          {!contentReady ? (
            <View className="flex-1 items-center justify-center">
              <ActivityIndicator size="large" color="#8BD65E" />
            </View>
          ) : (
            <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
              {/* HERO MEDIA */}
              <View className="mb-6 items-center">
                <TouchableOpacity
                  onPress={isEditing || !displayRecipe.imageUrl ? pickImage : undefined}
                  activeOpacity={1}
                  disabled={!isEditing && isDirectVideo}
                >
                  <View className="relative aspect-video h-56 w-full overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-800">
                    {!isEditing && isDirectVideo ? (
                      <Video
                        source={{ uri: displayRecipe.sourceUrl || '' }}
                        style={{ width: '100%', height: '100%' }}
                        useNativeControls
                        resizeMode={ResizeMode.CONTAIN}
                        isLooping
                        usePoster
                        posterSource={{ uri: displayRecipe.imageUrl }}
                        posterStyle={{ resizeMode: 'cover' }}
                      />
                    ) : !isEditing && isYouTube ? (
                      <TouchableOpacity
                        activeOpacity={0.9}
                        onPress={handleOpenLink}
                        className="absolute inset-0 items-center justify-center bg-black"
                      >
                        {displayRecipe.imageUrl ? (
                          <Image
                            source={{ uri: displayRecipe.imageUrl }}
                            style={{ width: '100%', height: '100%', opacity: 0.6 }}
                            contentFit="cover"
                          />
                        ) : (
                          <View className="absolute inset-0 bg-red-600/20" />
                        )}
                        <View className="items-center justify-center rounded-full bg-white/20 p-4 backdrop-blur-md">
                          <Ionicons name="play" size={40} color="white" />
                        </View>
                        <Text className="mt-2 font-visby-bold text-white shadow-md">
                          Watch Original Video
                        </Text>
                      </TouchableOpacity>
                    ) : (
                      <>
                        {displayRecipe.imageUrl ? (
                          <Image
                            source={{ uri: displayRecipe.imageUrl }}
                            style={{ width: '100%', height: '100%' }}
                            contentFit="cover"
                          />
                        ) : (
                          <View className="h-full w-full items-center justify-center border-2 border-dashed border-gray-300 bg-gray-50 dark:border-gray-600 dark:bg-gray-800">
                            <View className="items-center">
                              <Ionicons name="camera-outline" size={48} color="#9CA3AF" />
                              <Text className="mt-2 font-visby-bold text-sm text-gray-400 dark:text-gray-500">
                                Tap to Add Cover Photo
                              </Text>
                            </View>
                          </View>
                        )}

                        {isEditing && displayRecipe.imageUrl && (
                          <View className="absolute inset-0 items-center justify-center bg-black/30">
                            <Ionicons name="camera" size={30} color="white" />
                            <Text className="mt-1 font-visby-bold text-xs text-white">
                              Change Photo
                            </Text>
                          </View>
                        )}
                      </>
                    )}
                  </View>
                </TouchableOpacity>
              </View>

              {/* VIEW MODE TITLE & ACTIONS */}
              {!isEditing && (
                <View className="mb-6">
                  <Text className="mb-3 font-visby-bold text-3xl leading-tight text-gray-900 dark:text-white">
                    {displayRecipe.title}
                  </Text>

                  <View className="flex-row gap-4">
                    {/* Collection */}
                    <TouchableOpacity
                      onPress={() => setShowCollectionSelector(true)}
                      className="flex-row items-center rounded-xl bg-gray-100 px-4 py-3 dark:bg-gray-800"
                    >
                      <Ionicons
                        name="folder-open-outline"
                        size={20}
                        color={isDark ? 'white' : 'black'}
                      />
                      <Text className="ml-2 font-visby-bold text-gray-900 dark:text-white">
                        Save
                      </Text>
                    </TouchableOpacity>

                    {/* Share */}
                    <TouchableOpacity
                      onPress={() => onShare(displayRecipe)}
                      className="flex-row items-center rounded-xl bg-gray-100 px-4 py-3 dark:bg-gray-800"
                    >
                      <Ionicons
                        name="share-social-outline"
                        size={20}
                        color={isDark ? 'white' : 'black'}
                      />
                      <Text className="ml-2 font-visby-bold text-gray-900 dark:text-white">
                        Share
                      </Text>
                    </TouchableOpacity>

                    {/* Edit */}
                    <TouchableOpacity
                      onPress={handleStartEdit}
                      className="flex-row items-center rounded-xl bg-gray-100 px-4 py-3 dark:bg-gray-800"
                    >
                      <Ionicons
                        name="pencil-outline"
                        size={20}
                        color={isDark ? 'white' : 'black'}
                      />
                      <Text className="ml-2 font-visby-bold text-gray-900 dark:text-white">
                        Edit
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* EDITABLE TITLE */}
              {isEditing && (
                <View className="mb-2 mt-2">
                  <TextInput
                    value={tempRecipe?.title}
                    onChangeText={(txt) =>
                      setTempRecipe((prev) => (prev ? { ...prev, title: txt } : null))
                    }
                    className="font-visby-bold text-3xl text-gray-900 dark:text-white"
                    placeholder="Name your dish..."
                    placeholderTextColor="#9CA3AF"
                    multiline
                  />
                  <View className="mt-2 h-[1px] w-12 bg-[#8BD65E]" />
                </View>
              )}

              {/* DESCRIPTION */}
              {isEditing ? (
                <View className="mb-6">
                  <TextInput
                    value={tempRecipe?.description}
                    onChangeText={(txt) =>
                      setTempRecipe((prev) => (prev ? { ...prev, description: txt } : null))
                    }
                    multiline
                    className="min-h-[60px] font-visby text-base text-gray-600 dark:text-gray-300"
                    textAlignVertical="top"
                    placeholder="Describe the taste, texture, or story behind this recipe..."
                    placeholderTextColor="#9CA3AF"
                  />

                  {/* Quick Actions for New Recipe */}
                  {!tempRecipe?.id && (
                    <View className="mt-4 gap-3">
                      <Text className="font-visby-bold text-xs uppercase tracking-wider text-gray-500">
                        Quick Actions
                      </Text>

                      <View className="flex-row gap-3">
                        {/* Pick from Gallery */}
                        <TouchableOpacity
                          onPress={pickImage}
                          className="flex-1 flex-row items-center justify-center gap-2 rounded-xl border border-blue-100 bg-blue-50 py-4"
                        >
                          <Ionicons name="images" size={20} color="#3B82F6" />
                          <Text className="font-visby-bold text-sm text-blue-700">Add Photo</Text>
                        </TouchableOpacity>

                        {/* Generate with AI */}
                        <TouchableOpacity
                          onPress={async () => {
                            // Validate title and description
                            if (!tempRecipe?.title?.trim()) {
                              showAlert(
                                'Title Required',
                                'Please enter a recipe title first before using AI generation.',
                                undefined,
                                {
                                  icon: <Danger size={32} color="#EF4444" variant="Bold" />,
                                  type: 'destructive',
                                },
                              );
                              return;
                            }

                            if (!tempRecipe?.description?.trim()) {
                              showAlert(
                                'Description Required',
                                'Please add a brief description of your recipe before using AI generation.',
                                undefined,
                                {
                                  icon: <Danger size={32} color="#EF4444" variant="Bold" />,
                                  type: 'destructive',
                                },
                              );
                              return;
                            }

                            // Call AI generation
                            if (onGenerateFull && tempRecipe) {
                              setIsGenerating(true);
                              try {
                                await onGenerateFull(tempRecipe);
                                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                                showAlert(
                                  'Generated! ✨',
                                  'AI has generated ingredients and steps for your recipe. Review and edit as needed.',
                                  undefined,
                                  {
                                    icon: <TickCircle size={32} color="#10B981" variant="Bold" />,
                                  },
                                );
                              } catch (e: any) {
                                console.error(e);
                                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                                showAlert(
                                  'Error',
                                  e.message || 'Failed to generate recipe with AI.',
                                  undefined,
                                  {
                                    icon: <Danger size={32} color="#EF4444" variant="Bold" />,
                                    type: 'destructive',
                                  },
                                );
                              } finally {
                                setIsGenerating(false);
                              }
                            }
                          }}
                          disabled={isGenerating}
                          className="flex-1 flex-row items-center justify-center gap-2 rounded-xl border border-green-100 bg-green-50 py-4"
                          style={{ opacity: isGenerating ? 0.5 : 1 }}
                        >
                          {isGenerating ? (
                            <ActivityIndicator size="small" color="#8BD65E" />
                          ) : (
                            <Ionicons name="sparkles" size={20} color="#8BD65E" />
                          )}
                          <Text className="font-visby-bold text-sm text-green-700">
                            {isGenerating ? 'Generating...' : 'AI Generate'}
                          </Text>
                        </TouchableOpacity>
                      </View>

                      <Text className="text-center font-visby text-xs text-gray-400">
                        Add a photo manually or let AI generate ingredients & steps
                      </Text>
                    </View>
                  )}
                </View>
              ) : (
                <Text className="mb-6 font-visby text-base text-gray-500 dark:text-gray-400">
                  {displayRecipe.description}
                </Text>
              )}

              {/* Stats */}
              {isEditing && (
                <TouchableOpacity
                  onPress={async () => {
                    if (!tempRecipe?.ingredients || tempRecipe.ingredients.length === 0) {
                      showAlert('Error', 'Please add ingredients first!', undefined, {
                        icon: <Danger size={32} color="#EF4444" variant="Bold" />,
                        type: 'destructive',
                      });
                      return;
                    }

                    // Show simple loading feedback
                    Haptics.selectionAsync();

                    try {
                      showAlert(
                        'Calculating...',
                        'AI is estimating nutrition facts based on ingredients...',
                        undefined,
                        {
                          icon: <TickCircle size={32} color="#10B981" variant="Bold" />,
                        },
                      );
                      const result = await RecipeService.calculateNutrition(
                        tempRecipe.ingredients.map(
                          (ing) => `${ing.quantity} ${ing.unit} ${ing.item}`,
                        ),
                        tempRecipe.servings || '1',
                      );

                      setTempRecipe((prev) =>
                        prev
                          ? {
                              ...prev,
                              time_minutes: result.time_minutes,
                              calories_per_serving: result.calories_per_serving,
                            }
                          : null,
                      );

                      showAlert(
                        'Done',
                        `Estimated: ${result.calories_per_serving} kcal, ${result.time_minutes} mins`,
                        undefined,
                        {
                          icon: <TickCircle size={32} color="#10B981" variant="Bold" />,
                        },
                      );
                      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    } catch {
                      showAlert('Error', 'Failed to calculate nutrition', undefined, {
                        icon: <Danger size={32} color="#EF4444" variant="Bold" />,
                        type: 'destructive',
                      });
                    }
                  }}
                  className="mb-2 flex-row items-center justify-center rounded-lg bg-indigo-50 py-2 dark:bg-indigo-900/20"
                >
                  <Ionicons
                    name="calculator-outline"
                    size={16}
                    color="#4F46E5"
                    style={{ marginRight: 6 }}
                  />
                  <Text className="font-visby-bold text-xs text-indigo-600 dark:text-indigo-400">
                    Auto-Calculate Nutrition (AI)
                  </Text>
                </TouchableOpacity>
              )}

              <View className="mb-6 flex-row justify-between rounded-2xl bg-gray-50 p-4 dark:bg-gray-800">
                <View className="flex-1 items-center">
                  {isEditing ? (
                    <TextInput
                      value={String(tempRecipe?.time_minutes || '')}
                      onChangeText={(txt) =>
                        setTempRecipe((prev) => (prev ? { ...prev, time_minutes: txt } : null))
                      }
                      keyboardType="numeric"
                      className="w-16 border-b border-gray-300 text-center font-visby-bold text-gray-800 dark:text-gray-200"
                      placeholder="15"
                    />
                  ) : (
                    <Text className="font-visby-bold text-gray-800 dark:text-gray-200">
                      {displayRecipe.time_minutes}m
                    </Text>
                  )}
                  <Text className="text-xs text-gray-400">Time</Text>
                </View>
                <View className="w-[1px] bg-gray-200 dark:bg-gray-700" />
                <View className="flex-1 items-center">
                  {isEditing ? (
                    <TextInput
                      value={String(tempRecipe?.calories_per_serving || '')}
                      onChangeText={(txt) =>
                        setTempRecipe((prev) =>
                          prev ? { ...prev, calories_per_serving: txt } : null,
                        )
                      }
                      keyboardType="numeric"
                      className="w-16 border-b border-gray-300 text-center font-visby-bold text-gray-800 dark:text-gray-200"
                      placeholder="0"
                    />
                  ) : (
                    <Text className="font-visby-bold text-gray-800 dark:text-gray-200">
                      {displayRecipe.calories_per_serving}
                    </Text>
                  )}
                  <Text className="text-xs text-gray-400">Calories</Text>
                </View>
                <View className="w-[1px] bg-gray-200 dark:bg-gray-700" />
                <View className="flex-1 items-center">
                  {isEditing ? (
                    <TextInput
                      value={String(tempRecipe?.servings || '')}
                      onChangeText={(txt) =>
                        setTempRecipe((prev) => (prev ? { ...prev, servings: txt } : null))
                      }
                      keyboardType="numeric"
                      className="w-16 border-b border-gray-300 text-center font-visby-bold text-gray-800 dark:text-gray-200"
                      placeholder="1"
                    />
                  ) : (
                    <Text className="font-visby-bold text-gray-800 dark:text-gray-200">
                      {displayRecipe.servings}
                    </Text>
                  )}
                  <Text className="text-xs text-gray-400">Servings</Text>
                </View>
              </View>

              {/* Collections - Only show when editing existing recipes or viewing */}
              <View className="mb-6">
                {isEditing && tempRecipe?.id ? (
                  <View>
                    <Text className="mb-2 font-visby-bold text-lg text-gray-900 dark:text-white">
                      Collections
                    </Text>
                    <View className="mb-2 flex-row flex-wrap gap-2">
                      {tempRecipe?.collections?.map((name, index) => (
                        <TouchableOpacity
                          key={index}
                          onPress={() => {
                            // Remove collection
                            const newCol = tempRecipe.collections?.filter((_, i) => i !== index);
                            setTempRecipe((prev) =>
                              prev ? { ...prev, collections: newCol } : null,
                            );
                          }}
                          className="flex-row items-center rounded-full bg-green-100 px-3 py-1 dark:bg-green-900/30"
                        >
                          <Text className="mr-1 text-sm text-green-600 dark:text-green-400">
                            {name}
                          </Text>
                          <Ionicons name="close" size={12} color="#8BD65E" />
                        </TouchableOpacity>
                      ))}
                    </View>
                    <View className="flex-row items-center gap-2">
                      <TextInput
                        placeholder="Add to collection"
                        placeholderTextColor="#9CA3AF"
                        className="flex-1 rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                        onSubmitEditing={(e) => {
                          const newCol = e.nativeEvent.text.trim();
                          if (newCol && !tempRecipe?.collections?.includes(newCol)) {
                            setTempRecipe((prev) =>
                              prev
                                ? { ...prev, collections: [...(prev.collections || []), newCol] }
                                : null,
                            );
                          }
                        }}
                      />
                      <TouchableOpacity
                        className="rounded-lg bg-gray-200 p-3 dark:bg-gray-700"
                        onPress={() =>
                          showAlert(
                            'Tip',
                            'Type a collection name and press enter on keyboard to add.',
                            undefined,
                            {
                              icon: <TickCircle size={32} color="#10B981" variant="Bold" />,
                            },
                          )
                        }
                      >
                        <Ionicons name="add" size={20} color={isDark ? 'white' : 'black'} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  displayRecipe.collections &&
                  displayRecipe.collections.length > 0 && (
                    <View className="flex-row flex-wrap gap-2">
                      {displayRecipe.collections.map((name, index) => (
                        <View
                          key={index}
                          className="rounded-full bg-orange-100 px-3 py-1 dark:bg-orange-900/30"
                        >
                          <Text className="text-xs text-orange-700 dark:text-orange-300">
                            {name}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )
                )}
              </View>

              {/* Cooking Mode Button */}
              {/* Cooking Mode Button */}
              {!isEditing && (
                <TouchableOpacity
                  disabled={!displayRecipe.steps || displayRecipe.steps.length === 0}
                  onPress={() => {
                    onClose();
                    router.push({
                      pathname: '/cooking-mode',
                      params: { recipe: JSON.stringify(displayRecipe) },
                    });
                  }}
                  className={`mb-6 flex-row items-center justify-center rounded-xl py-4 shadow-md ${
                    !displayRecipe.steps || displayRecipe.steps.length === 0
                      ? 'bg-gray-300 dark:bg-gray-800'
                      : 'bg-gray-900 dark:bg-white'
                  }`}
                >
                  <Ionicons
                    name="play-circle"
                    size={24}
                    color={
                      !displayRecipe.steps || displayRecipe.steps.length === 0
                        ? '#9CA3AF'
                        : isDark
                          ? 'black'
                          : 'white'
                    }
                    style={{ marginRight: 8 }}
                  />
                  <Text
                    className={`font-visby-bold text-base ${
                      !displayRecipe.steps || displayRecipe.steps.length === 0
                        ? 'text-gray-500'
                        : 'text-white dark:text-black'
                    }`}
                  >
                    Start Cooking Mode
                  </Text>
                </TouchableOpacity>
              )}

              {/* Ingredients */}
              <View className="mb-6">
                <View className="mb-3 flex-row items-center justify-between border-b border-gray-100 pb-2 dark:border-gray-800">
                  <View className="flex-row items-center gap-2">
                    <Ionicons name="cart-outline" size={24} color={isDark ? '#FFF' : '#111827'} />
                    <Text className="font-visby-bold text-lg text-gray-900 dark:text-white">
                      Ingredients
                    </Text>
                  </View>
                  {!isEditing && (
                    <TouchableOpacity onPress={handleAddIngredientsToShoppingList}>
                      <Text className="font-visby-bold text-xs text-[#8BD65E]">+ Add to List</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {isEditing
                  ? (tempRecipe?.ingredients || []).map((item, i) => (
                      <View key={i} className="mb-3 flex-row items-center gap-2">
                        <TextInput
                          value={String(item.quantity)}
                          onChangeText={(txt) => {
                            setTempRecipe((prev) => {
                              if (!prev) return null;
                              const newIng = [...(prev.ingredients || [])];
                              newIng[i] = { ...newIng[i], quantity: txt };
                              return { ...prev, ingredients: newIng };
                            });
                          }}
                          placeholder="Qty"
                          className="w-16 rounded border border-gray-200 bg-gray-50 p-2 text-center text-black dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                          keyboardType="numeric"
                        />
                        <TextInput
                          value={item.unit}
                          onChangeText={(txt) => {
                            setTempRecipe((prev) => {
                              if (!prev) return null;
                              const newIng = [...(prev.ingredients || [])];
                              newIng[i] = { ...newIng[i], unit: txt };
                              return { ...prev, ingredients: newIng };
                            });
                          }}
                          placeholder="Unit"
                          className="w-16 rounded border border-gray-200 bg-gray-50 p-2 text-center text-black dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                        />
                        <TextInput
                          value={item.item}
                          onChangeText={(txt) => {
                            setTempRecipe((prev) => {
                              if (!prev) return null;
                              const newIng = [...(prev.ingredients || [])];
                              newIng[i] = { ...newIng[i], item: txt };
                              return { ...prev, ingredients: newIng };
                            });
                          }}
                          placeholder="Ingredient name"
                          className="mr-2 flex-1 rounded border border-gray-200 bg-gray-50 p-2 text-black dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                        />
                        <TouchableOpacity
                          onPress={() => {
                            setTempRecipe((prev) => {
                              if (!prev) return null;
                              const newIng = (prev.ingredients || []).filter((_, idx) => idx !== i);
                              return { ...prev, ingredients: newIng };
                            });
                          }}
                        >
                          <Ionicons name="remove-circle" size={20} color="red" />
                        </TouchableOpacity>
                      </View>
                    ))
                  : (displayRecipe.ingredients || []).map((item, i) => (
                      <View key={i} className="mb-2 flex-row items-start">
                        <Text className="mr-2 text-[#8BD65E]">•</Text>
                        <Text className="font-visby text-base text-gray-700 dark:text-gray-300">
                          <Text className="font-visby-semibold">
                            {item.quantity} {item.unit}
                          </Text>{' '}
                          {item.item}
                        </Text>
                      </View>
                    ))}

                {isEditing && (
                  <TouchableOpacity
                    onPress={() => {
                      setTempRecipe((prev) =>
                        prev
                          ? {
                              ...prev,
                              ingredients: [
                                ...(prev.ingredients || []),
                                { item: '', quantity: '', unit: '' },
                              ],
                            }
                          : null,
                      );
                    }}
                    className="mt-3 flex-row items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 py-3 active:bg-gray-100"
                  >
                    <Ionicons name="add" size={20} color="#6B7280" />
                    <Text className="ml-2 font-visby-bold text-sm text-gray-600">
                      Add Ingredient
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* GENERATE FULL BUTTON for Placeholder Recipes */}
              {!isEditing && displayRecipe.steps.length === 0 && onGenerateFull && (
                <View className="mb-6 rounded-xl bg-orange-50 p-4 dark:bg-orange-900/20">
                  <View className="mb-2 flex-row items-center justify-center gap-2">
                    <Ionicons name="sparkles" size={20} color={isDark ? '#FB923C' : '#EA580C'} />
                    <Text className="font-visby-bold text-lg text-orange-600 dark:text-orange-400">
                      Incomplete Recipe
                    </Text>
                  </View>
                  <Text className="mb-4 text-center font-visby text-sm text-gray-500 dark:text-gray-400">
                    This recipe was part of your weekly plan but details haven&apos;t been generated
                    yet.
                  </Text>
                  <TouchableOpacity
                    onPress={handleGenerateClick}
                    disabled={isGenerating}
                    className="flex-row items-center justify-center rounded-full bg-orange-500 py-3 shadow-md active:bg-orange-600"
                  >
                    {isGenerating ? (
                      <>
                        <ActivityIndicator size="small" color="white" className="mr-2" />
                        <Text className="font-visby-bold text-white">Generating...</Text>
                      </>
                    ) : (
                      <>
                        <Ionicons
                          name="sparkles"
                          size={20}
                          color="white"
                          style={{ marginRight: 8 }}
                        />
                        <Text className="font-visby-bold text-white">Generate Full Details</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              )}

              {/* Steps */}
              <View className="mb-8">
                <View className="mb-3 flex-row items-center justify-between border-b border-gray-100 pb-2 dark:border-gray-800">
                  <View className="flex-row items-center gap-2">
                    <Ionicons
                      name="restaurant-outline"
                      size={24}
                      color={isDark ? '#FFF' : '#111827'}
                    />
                    <Text className="font-visby-bold text-lg text-gray-900 dark:text-white">
                      Instructions
                    </Text>
                  </View>
                </View>

                {isEditing
                  ? (tempRecipe?.steps || []).map((step, i) => (
                      <View key={i} className="mb-4 flex-row items-start">
                        <View className="mr-2 mt-2 h-6 w-6 items-center justify-center rounded-full bg-blue-100">
                          <Text className="font-visby-bold text-xs text-blue-600">{i + 1}</Text>
                        </View>
                        <TextInput
                          value={step.instruction}
                          multiline
                          onChangeText={(txt) => {
                            setTempRecipe((prev) => {
                              if (!prev) return null;
                              const newSteps = [...(prev.steps || [])];
                              newSteps[i] = { ...newSteps[i], instruction: txt };
                              return { ...prev, steps: newSteps };
                            });
                          }}
                          className="min-h-[60px] flex-1 rounded border border-gray-200 bg-gray-50 p-2 text-black dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                          textAlignVertical="top"
                        />
                        <TouchableOpacity
                          onPress={() => {
                            setTempRecipe((prev) => {
                              if (!prev) return null;
                              const newSteps = (prev.steps || []).filter((_, idx) => idx !== i);
                              const reindexed = newSteps.map((s, idx) => ({
                                ...s,
                                step: String(idx + 1),
                              }));
                              return { ...prev, steps: reindexed };
                            });
                          }}
                          className="ml-2 mt-2"
                        >
                          <Ionicons name="remove-circle" size={20} color="red" />
                        </TouchableOpacity>
                      </View>
                    ))
                  : (displayRecipe.steps || []).map((step, i) => (
                      <View key={i} className="mb-4 flex-row">
                        <View className="mr-3 h-6 w-6 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/40">
                          <Text className="font-visby-bold text-xs text-red-600 dark:text-red-400">
                            {step.step}
                          </Text>
                        </View>
                        <Text className="flex-1 font-visby text-base leading-6 text-gray-700 dark:text-gray-300">
                          {step.instruction}
                        </Text>
                      </View>
                    ))}

                {isEditing && (
                  <TouchableOpacity
                    onPress={() => {
                      const nextStep = (tempRecipe?.steps?.length || 0) + 1;
                      setTempRecipe((prev) =>
                        prev
                          ? {
                              ...prev,
                              steps: [
                                ...(prev.steps || []),
                                {
                                  step: String(nextStep),
                                  instruction: '',
                                },
                              ],
                            }
                          : null,
                      );
                    }}
                    className="mt-3 flex-row items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 py-3 active:bg-gray-100"
                  >
                    <Ionicons name="add" size={20} color="#6B7280" />
                    <Text className="ml-2 font-visby-bold text-sm text-gray-600">
                      Add Instruction Step
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Tips: Redesigned for Premium Feel */}
              {(isEditing || (displayRecipe.tips && displayRecipe.tips.length > 0)) && (
                <View className="mb-8 overflow-hidden rounded-2xl bg-gray-50 dark:bg-gray-800">
                  <View className="flex-row items-center gap-3 border-l-4 border-yellow-500 bg-yellow-500/10 px-4 py-3 dark:bg-yellow-500/20">
                    <Ionicons name="star" size={18} color="#EAB308" />
                    <Text className="font-visby-bold text-base text-gray-900 dark:text-white">
                      Chef&apos;s Secret
                    </Text>
                  </View>

                  <View className="p-4 pt-3">
                    {isEditing ? (
                      <TextInput
                        value={tempRecipe?.tips}
                        onChangeText={(txt) =>
                          setTempRecipe((prev) => (prev ? { ...prev, tips: txt } : null))
                        }
                        multiline
                        placeholder="Add a pro tip for this recipe..."
                        placeholderTextColor="#9CA3AF"
                        className="min-h-[60px] font-visby text-base leading-relaxed text-gray-600 dark:text-gray-300"
                      />
                    ) : (
                      <Text className="font-visby-italic text-base leading-relaxed text-gray-600 dark:text-gray-300">
                        &quot;{displayRecipe.tips}&quot;
                      </Text>
                    )}
                  </View>
                </View>
              )}

              {/* DELETE */}
              {!isEditing && (
                <TouchableOpacity
                  onPress={() => {
                    if (!displayRecipe.id) {
                      showAlert('Error', 'Recipe ID missing!', undefined, {
                        icon: <Danger size={32} color="#EF4444" variant="Bold" />,
                        type: 'destructive',
                      });
                      return;
                    }
                    onDelete(displayRecipe.id);
                  }}
                  className="mb-8 flex-row items-center justify-center rounded-xl border border-red-100 bg-red-50 py-4 dark:border-red-900/30 dark:bg-red-900/20"
                >
                  <Ionicons
                    name="trash-outline"
                    size={20}
                    color="#EF4444"
                    style={{ marginRight: 8 }}
                  />
                  <Text className="font-visby-bold text-red-500">Delete Recipe</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          )}
        </View>
      </View>
      <CollectionSelectorModal
        visible={showCollectionSelector}
        onClose={() => setShowCollectionSelector(false)}
        recipe={recipe}
        availableCollections={availableCollections}
        onToggleCollection={toggleCollection}
        onCreateCollection={(name) => toggleCollection(name)}
      />
    </Modal>
  );
};
