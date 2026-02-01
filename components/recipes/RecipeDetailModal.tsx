import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Linking,
  ActivityIndicator,
} from 'react-native';
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
    }
  }, [visible, recipe, initialMode]);

  const toggleCollection = (collectionName: string) => {
      // Determine target recipe (temp if editing, else current recipe)
      const target = isEditing ? tempRecipe : recipe;
      if (!target) return;

      const currentCollections = target.collections || [];
      let newCollections;
      
      if (currentCollections.includes(collectionName)) {
          newCollections = currentCollections.filter(c => c !== collectionName);
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
            .catch(e => console.error(e));
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

  const handleCancelEdit = () => {
    setIsEditing(false);
    setTempRecipe(null);
  };

  const handleSaveEdit = async () => {
    if (tempRecipe) {
      if (!tempRecipe.title.trim()) {
        Alert.alert('Missing Info', 'Please give your recipe a title!');
        return;
      }
      
      await onUpdate(tempRecipe);
      setIsEditing(false);
    }
  };

  const handleAddIngredientsToShoppingList = () => {
    if (recipe) {
      addToShoppingList(recipe.ingredients || [], recipe.title);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success', 'Ingredients added to Shopping List!');
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
        Alert.alert('Error', 'Cannot open this link');
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
                  <Text className="flex-1 font-visby-bold text-xl text-gray-900 dark:text-white">
                    Editing Recipe...
                  </Text>
                  <View className="flex-row gap-2">
                    <TouchableOpacity
                      onPress={handleSaveEdit}
                      className="rounded-full bg-green-500 p-2"
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

          <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
            {/* HERO MEDIA */}
            <View className="mb-6 items-center">
              <TouchableOpacity
                onPress={isEditing ? pickImage : undefined}
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
                        <View className="h-full w-full items-center justify-center bg-orange-50 dark:bg-orange-900/20">
                          <Ionicons name="restaurant" size={40} color="#F97316" />
                        </View>
                      )}

                      {isEditing && (
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
                    <Text className="mb-3 font-visby-bold text-3xl text-gray-900 dark:text-white leading-tight">
                        {displayRecipe.title}
                    </Text>
                    
                    <View className="flex-row gap-4">
                        {/* Collection */}
                        <TouchableOpacity 
                            onPress={() => setShowCollectionSelector(true)}
                            className="flex-row items-center rounded-xl bg-gray-100 px-4 py-3 dark:bg-gray-800"
                        >
                            <Ionicons name="folder-open-outline" size={20} color={isDark ? "white" : "black"} />
                            <Text className="ml-2 font-visby-bold text-gray-900 dark:text-white">Save</Text>
                        </TouchableOpacity>

                        {/* Share */}
                        <TouchableOpacity 
                            onPress={() => onShare(displayRecipe)}
                            className="flex-row items-center rounded-xl bg-gray-100 px-4 py-3 dark:bg-gray-800"
                        >
                            <Ionicons name="share-social-outline" size={20} color={isDark ? "white" : "black"} />
                            <Text className="ml-2 font-visby-bold text-gray-900 dark:text-white">Share</Text>
                        </TouchableOpacity>

                        {/* Edit */}
                        <TouchableOpacity 
                            onPress={handleStartEdit}
                            className="flex-row items-center rounded-xl bg-gray-100 px-4 py-3 dark:bg-gray-800"
                        >
                            <Ionicons name="pencil-outline" size={20} color={isDark ? "white" : "black"} />
                            <Text className="ml-2 font-visby-bold text-gray-900 dark:text-white">Edit</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            {/* EDITABLE TITLE */}
            {isEditing && (
              <View className="mb-4">
                <Text className="mb-1 font-visby-bold text-xs text-gray-400">TITLE</Text>
                <TextInput
                  value={tempRecipe?.title}
                  onChangeText={(txt) =>
                    setTempRecipe((prev) => (prev ? { ...prev, title: txt } : null))
                  }
                  className="rounded-lg border border-gray-300 p-3 font-visby-bold text-lg text-black dark:border-gray-700 dark:text-white"
                  placeholderTextColor="#9CA3AF"
                />
              </View>
            )}

            {/* DESCRIPTION */}
            {isEditing ? (
              <View className="mb-6">
                <Text className="mb-1 font-visby-bold text-xs text-gray-400">DESCRIPTION</Text>
                <TextInput
                  value={tempRecipe?.description}
                  onChangeText={(txt) =>
                    setTempRecipe((prev) => (prev ? { ...prev, description: txt } : null))
                  }
                  multiline
                  className="h-24 rounded-lg border border-gray-300 p-3 font-visby text-base text-black dark:border-gray-700 dark:text-white"
                  textAlignVertical="top"
                  placeholderTextColor="#9CA3AF"
                />
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
                            Alert.alert('Error', 'Please add ingredients first!');
                            return;
                        }
                        
                        // Show simple loading feedback (could be better state)
                        const originalText = "Calculating..."; 
                        // You might want a dedicated loading state, but let's use Haptics for now
                        Haptics.selectionAsync();
                        
                        try {
                            // Find 'RecipeService' import - (Assuming it's available or need to add logic)
                            // Since we didn't import RecipeService in the scope above in the original file view, 
                            // we need to ensure it is imported. 
                            // *Wait*, RecipeService is NOT imported in the file currently (based on previous ViewFile).
                            // I need to add the import in a separate edit or assume it's there.
                            // I will use a separate edit to add the import first if needed but let's assume I can dynamic import or use existing.
                            // Actually, I should check imports. 
                            
                            // Let's assume I'll add the logic inside the button for now or define the handler outside.
                            const { RecipeService } = require('@/lib/services/recipeService');
                            
                            Alert.alert('Calculating...', 'AI is estimating nutrition facts based on ingredients...');
                            const result = await RecipeService.calculateNutrition(tempRecipe.ingredients, tempRecipe.servings || '1');
                            
                            setTempRecipe(prev => prev ? ({
                                ...prev,
                                time_minutes: result.time_minutes,
                                calories_per_serving: result.calories_per_serving
                            }) : null);
                            
                            Alert.alert('Done', `Estimated: ${result.calories_per_serving} kcal, ${result.time_minutes} mins`);
                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        } catch (e) {
                             Alert.alert('Error', 'Failed to calculate nutrition');
                        }
                    }}
                    className="mb-2 flex-row items-center justify-center rounded-lg bg-indigo-50 py-2 dark:bg-indigo-900/20"
                >
                    <Ionicons name="calculator-outline" size={16} color="#4F46E5" style={{marginRight: 6}} />
                    <Text className="font-visby-bold text-xs text-indigo-600 dark:text-indigo-400">
                        Auto-Calculate Nutrition (AI)
                    </Text>
                </TouchableOpacity>
            )}

            <View className="mb-6 flex-row justify-between rounded-2xl bg-gray-50 p-4 dark:bg-gray-800">
              <View className="items-center flex-1">
                {isEditing ? (
                  <TextInput
                    value={String(tempRecipe?.time_minutes || '')}
                    onChangeText={(txt) =>
                      setTempRecipe((prev) => (prev ? { ...prev, time_minutes: txt } : null))
                    }
                    keyboardType="numeric"
                    className="font-visby-bold text-center text-gray-800 dark:text-gray-200 border-b border-gray-300 w-16"
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
              <View className="items-center flex-1">
                {isEditing ? (
                  <TextInput
                    value={String(tempRecipe?.calories_per_serving || '')}
                    onChangeText={(txt) =>
                      setTempRecipe((prev) => (prev ? { ...prev, calories_per_serving: txt } : null))
                    }
                    keyboardType="numeric"
                    className="font-visby-bold text-center text-gray-800 dark:text-gray-200 border-b border-gray-300 w-16"
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
              <View className="items-center flex-1">
                {isEditing ? (
                  <TextInput
                    value={String(tempRecipe?.servings || '')}
                    onChangeText={(txt) =>
                      setTempRecipe((prev) => (prev ? { ...prev, servings: txt } : null))
                    }
                    keyboardType="numeric"
                    className="font-visby-bold text-center text-gray-800 dark:text-gray-200 border-b border-gray-300 w-16"
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

            {/* Collections */}
            <View className="mb-6">
                 {isEditing ? (
                    <View>
                        <Text className="mb-2 font-visby-bold text-lg text-gray-900 dark:text-white">Collections</Text>
                        <View className="flex-row flex-wrap gap-2 mb-2">
                            {tempRecipe?.collections?.map((name, index) => (
                                <TouchableOpacity 
                                    key={index}
                                    onPress={() => {
                                        // Remove collection
                                        const newCol = tempRecipe.collections?.filter((_, i) => i !== index);
                                        setTempRecipe(prev => prev ? ({ ...prev, collections: newCol }) : null);
                                    }}
                                    className="flex-row items-center rounded-full bg-red-100 px-3 py-1 dark:bg-red-900/30"
                                >
                                    <Text className="mr-1 text-sm text-red-600 dark:text-red-400">{name}</Text>
                                    <Ionicons name="close" size={12} color="#EF4444" />
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
                                        setTempRecipe(prev => prev ? ({ ...prev, collections: [...(prev.collections || []), newCol] }) : null);
                                    }
                                }}
                            />
                            <TouchableOpacity 
                                className="rounded-lg bg-gray-200 p-3 dark:bg-gray-700"
                                onPress={() => Alert.alert('Tip', 'Type a collection name and press enter on keyboard to add.')}
                            >
                                <Ionicons name="add" size={20} color={isDark ? "white" : "black"} />
                            </TouchableOpacity>
                        </View>
                    </View>
                 ) : (
                    displayRecipe.collections && displayRecipe.collections.length > 0 && (
                        <View className="flex-row flex-wrap gap-2">
                            {displayRecipe.collections.map((name, index) => (
                                <View key={index} className="rounded-full bg-orange-100 px-3 py-1 dark:bg-orange-900/30">
                                    <Text className="text-xs text-orange-700 dark:text-orange-300">{name}</Text>
                                </View>
                            ))}
                        </View>
                    )
                 )}
            </View>

            {/* Cooking Mode Button */}
            {!isEditing && (
              <TouchableOpacity
                onPress={() => {
                  onClose();
                  router.push({
                    pathname: '/cooking-mode',
                    params: { recipe: JSON.stringify(displayRecipe) },
                  });
                }}
                className="mb-6 flex-row items-center justify-center rounded-xl bg-gray-900 py-4 shadow-md dark:bg-white"
              >
                <Ionicons
                  name="play-circle"
                  size={24}
                  color={isDark ? 'black' : 'white'}
                  style={{ marginRight: 8 }}
                />
                <Text className="font-visby-bold text-base text-white dark:text-black">
                  Start Cooking Mode
                </Text>
              </TouchableOpacity>
            )}

            {/* Ingredients */}
            <View className="mb-6">
              <View className="mb-3 flex-row items-center justify-between border-b border-gray-100 pb-2 dark:border-gray-800">
                <Text className="font-visby-bold text-lg text-gray-900 dark:text-white">
                  🛒 Ingredients
                </Text>
                {!isEditing ? (
                  <TouchableOpacity onPress={handleAddIngredientsToShoppingList}>
                    <Text className="font-visby-bold text-xs text-[#CC5544]">+ Add to List</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    onPress={() => {
                      setTempRecipe((prev) =>
                        prev
                          ? {
                              ...prev,
                              ingredients: [...(prev.ingredients || []), 'New Ingredient'],
                            }
                          : null,
                      );
                    }}
                  >
                    <Text className="font-visby-bold text-xs text-blue-500">+ Add Item</Text>
                  </TouchableOpacity>
                )}
              </View>

              {isEditing
                ? (tempRecipe?.ingredients || []).map((item, i) => (
                    <View key={i} className="mb-2 flex-row items-center">
                      <TextInput
                        value={item}
                        onChangeText={(txt) => {
                          setTempRecipe((prev) => {
                            if (!prev) return null;
                            const newIng = [...(prev.ingredients || [])];
                            newIng[i] = txt;
                            return { ...prev, ingredients: newIng };
                          });
                        }}
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
                      <Text className="mr-2 text-red-500">•</Text>
                      <Text className="font-visby text-base text-gray-700 dark:text-gray-300">
                        {item}
                      </Text>
                    </View>
                  ))}
            </View>

            {/* GENERATE FULL BUTTON for Placeholder Recipes */}
            {!isEditing && displayRecipe.steps.length === 0 && onGenerateFull && (
              <View className="mb-6 rounded-xl bg-orange-50 p-4 dark:bg-orange-900/20">
                <Text className="mb-2 text-center font-visby-bold text-lg text-orange-600 dark:text-orange-400">
                  ✨ Incomplete Recipe
                </Text>
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
                <Text className="font-visby-bold text-lg text-gray-900 dark:text-white">
                  👨‍🍳 Instructions
                </Text>
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
                                  instruction: 'New Step',
                                },
                              ],
                            }
                          : null,
                      );
                    }}
                  >
                    <Text className="font-visby-bold text-xs text-blue-500">+ Add Step</Text>
                  </TouchableOpacity>
                )}
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
            </View>

            {/* Tips */}
            {(isEditing || (displayRecipe.tips && displayRecipe.tips.length > 0)) && (
              <View className="mb-8 rounded-xl border border-amber-100 bg-amber-50 p-4 dark:border-amber-900/30 dark:bg-amber-900/20">
                <Text className="mb-1 font-visby-bold text-amber-800 dark:text-amber-500">
                  💡 Chef&apos;s Tips
                </Text>
                {isEditing ? (
                  <TextInput
                    value={tempRecipe?.tips}
                    onChangeText={(txt) =>
                      setTempRecipe((prev) => (prev ? { ...prev, tips: txt } : null))
                    }
                    multiline
                    className="rounded border border-amber-200 bg-white/50 p-2 text-amber-900 dark:border-amber-900/50 dark:bg-black/20 dark:text-amber-300"
                  />
                ) : (
                  <Text className="font-visby text-amber-700 dark:text-amber-300">
                    {displayRecipe.tips}
                  </Text>
                )}
              </View>
            )}

            {/* DELETE */}
            {!isEditing && (
              <TouchableOpacity
                onPress={() => onDelete(displayRecipe.id!)}
                className="mb-8 flex-row items-center justify-center rounded-xl border border-red-100 bg-red-50 py-4 dark:border-red-900/30 dark:bg-red-900/20"
              >
                <Ionicons name="trash-outline" size={20} color="#EF4444" className="mr-2" />
                <Text className="ml-2 font-visby-bold text-red-500">Delete This Recipe</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>
      </View>
      <CollectionSelectorModal
        visible={showCollectionSelector}
        onClose={() => setShowCollectionSelector(false)}
        recipe={recipe}
        availableCollections={availableCollections}
        onToggleCollection={toggleCollection}
        onCreateCollection={(name) => {
           toggleCollection(name);
           // Modal handles clearing its own input, we just close it or keep it open?
           // User usually wants to close after creating? Or maybe check multiple?
           // The Modal implementation I wrote closes itself? No, it calls onCreateCollection.
           // I'll leave it open unless user closes it? Or close it?
           // "Add to collection" usually means add and done? But maybe add to multiple.
           // The `toggleCollection` adds it.
           // If I want to close, I call `setShowCollectionSelector(false)`.
           // Let's keep it open to verify checkmark, or close it?
           // Based on `handleAddNewCollection` it closed it.
           // I'll close it.
           // Actually, `toggleCollection` updates the recipe.
        }}
      />
    </Modal>
  );
};
