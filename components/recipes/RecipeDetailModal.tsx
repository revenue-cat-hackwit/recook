import React, { useState, useEffect } from 'react';
import { View, Text, Modal, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { useColorScheme } from 'nativewind';
import { Recipe } from '@/lib/types';
import { useShoppingListStore } from '@/lib/store/shoppingListStore';

interface RecipeDetailModalProps {
  recipe: Recipe | null;
  visible: boolean;
  onClose: () => void;
  onUpdate: (updatedRecipe: Recipe) => Promise<void>;
  onDelete: (id: string) => void;
  onShare: (recipe: Recipe) => void;
}

export const RecipeDetailModal: React.FC<RecipeDetailModalProps> = ({
  recipe,
  visible,
  onClose,
  onUpdate,
  onDelete,
  onShare,
}) => {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const addToShoppingList = useShoppingListStore((state) => state.addMultiple);

  const [isEditing, setIsEditing] = useState(false);
  const [tempRecipe, setTempRecipe] = useState<Recipe | null>(null);

  // Reset state when recipe changes or modal opens
  useEffect(() => {
    if (visible) {
      setIsEditing(false);
      setTempRecipe(null);
    }
  }, [visible, recipe]);

  const handleStartEdit = () => {
    if (recipe) {
      setTempRecipe({ ...recipe });
      setIsEditing(true);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setTempRecipe(null);
  };

  const handleSaveEdit = async () => {
    if (tempRecipe) {
      await onUpdate(tempRecipe);
      setIsEditing(false);
    }
  };

  const handleAddIngredientsToShoppingList = () => {
    if (recipe) {
      addToShoppingList(recipe.ingredients, recipe.title);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Sukses', 'Bahan masakan telah ditambahkan ke Daftar Belanja!');
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

  // Determine which data to show: Editing vs View
  const activeRecipe = isEditing ? tempRecipe : recipe;

  if (!recipe && !tempRecipe) return null;
  // Fallback for types
  const displayRecipe = activeRecipe || recipe!;

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
              <Text className="flex-1 font-visby-bold text-xl text-gray-900 dark:text-white">
                Editing Recipe...
              </Text>
            ) : (
              <Text
                className="flex-1 pr-2 font-visby-bold text-2xl text-gray-900 dark:text-white"
                numberOfLines={2}
              >
                {displayRecipe.title}
              </Text>
            )}

            <View className="flex-row gap-2">
              {isEditing ? (
                <TouchableOpacity
                  onPress={handleSaveEdit}
                  className="rounded-full bg-green-500 p-2"
                >
                  <Ionicons name="checkmark" size={24} color="white" />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  onPress={() => onShare(displayRecipe)}
                  className="rounded-full bg-blue-50 p-2 dark:bg-blue-900/30"
                >
                  <Ionicons name="share-social" size={24} color="#3B82F6" />
                </TouchableOpacity>
              )}

              {isEditing ? (
                <TouchableOpacity
                  onPress={handleCancelEdit}
                  className="rounded-full bg-red-100 p-2"
                >
                  <Ionicons name="close" size={24} color="red" />
                </TouchableOpacity>
              ) : (
                <>
                  <TouchableOpacity
                    onPress={handleStartEdit}
                    className="rounded-full bg-amber-50 p-2 dark:bg-amber-900/20"
                  >
                    <Ionicons name="pencil" size={24} color="#F59E0B" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => {
                      onClose();
                      setIsEditing(false);
                    }}
                    className="rounded-full bg-gray-100 p-2 dark:bg-gray-800"
                  >
                    <Ionicons name="close" size={24} color={isDark ? 'white' : 'black'} />
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>

          <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
            {/* IMAGE */}
            <View className="mb-6 items-center">
              <TouchableOpacity
                onPress={isEditing ? pickImage : undefined}
                activeOpacity={isEditing ? 0.7 : 1}
              >
                <View className="relative aspect-video h-40 w-full overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-800">
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
                      <Text className="mt-1 font-visby-bold text-xs text-white">Change Photo</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            </View>

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
            <View className="mb-6 flex-row justify-between rounded-2xl bg-gray-50 p-4 dark:bg-gray-800">
              <View className="items-center">
                <Text className="font-visby-bold text-gray-800 dark:text-gray-200">
                  {displayRecipe.time_minutes}m
                </Text>
                <Text className="text-xs text-gray-400">Waktu</Text>
              </View>
              <View className="w-[1px] bg-gray-200 dark:bg-gray-700" />
              <View className="items-center">
                <Text className="font-visby-bold text-gray-800 dark:text-gray-200">
                  {displayRecipe.calories_per_serving}
                </Text>
                <Text className="text-xs text-gray-400">Kalori</Text>
              </View>
              <View className="w-[1px] bg-gray-200 dark:bg-gray-700" />
              <View className="items-center">
                <Text className="font-visby-bold text-gray-800 dark:text-gray-200">
                  {displayRecipe.servings}
                </Text>
                <Text className="text-xs text-gray-400">Porsi</Text>
              </View>
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
                  🛒 Bahan Utama{' '}
                  {isEditing && <Text className="text-xs text-blue-500">(Tap to Edit)</Text>}
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
                              ingredients: [...prev.ingredients, 'New Ingredient'],
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
                ? tempRecipe?.ingredients.map((item, i) => (
                    <View key={i} className="mb-2 flex-row items-center">
                      <TextInput
                        value={item}
                        onChangeText={(txt) => {
                          const newIng = [...tempRecipe.ingredients];
                          newIng[i] = txt;
                          setTempRecipe({ ...tempRecipe, ingredients: newIng });
                        }}
                        className="mr-2 flex-1 rounded border border-gray-200 bg-gray-50 p-2 text-black dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                      />
                      <TouchableOpacity
                        onPress={() => {
                          const newIng = tempRecipe.ingredients.filter((_, idx) => idx !== i);
                          setTempRecipe({
                            ...tempRecipe,
                            ingredients: newIng,
                          });
                        }}
                      >
                        <Ionicons name="remove-circle" size={20} color="red" />
                      </TouchableOpacity>
                    </View>
                  ))
                : displayRecipe.ingredients.map((item, i) => (
                    <View key={i} className="mb-2 flex-row items-start">
                      <Text className="mr-2 text-red-500">•</Text>
                      <Text className="font-visby text-base text-gray-700 dark:text-gray-300">
                        {item}
                      </Text>
                    </View>
                  ))}
            </View>

            {/* Steps */}
            <View className="mb-8">
              <View className="mb-3 flex-row items-center justify-between border-b border-gray-100 pb-2 dark:border-gray-800">
                <Text className="font-visby-bold text-lg text-gray-900 dark:text-white">
                  👨‍🍳 Cara Membuat{' '}
                  {isEditing && <Text className="text-xs text-blue-500">(Tap to Edit)</Text>}
                </Text>
                {isEditing && (
                  <TouchableOpacity
                    onPress={() => {
                      const nextStep = (tempRecipe?.steps.length || 0) + 1;
                      setTempRecipe((prev) =>
                        prev
                          ? {
                              ...prev,
                              steps: [
                                ...prev.steps,
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
                ? tempRecipe?.steps.map((step, i) => (
                    <View key={i} className="mb-4 flex-row items-start">
                      <View className="mr-2 mt-2 h-6 w-6 items-center justify-center rounded-full bg-blue-100">
                        <Text className="font-visby-bold text-xs text-blue-600">{i + 1}</Text>
                      </View>
                      <TextInput
                        value={step.instruction}
                        multiline
                        onChangeText={(txt) => {
                          const newSteps = [...tempRecipe.steps];
                          newSteps[i] = { ...newSteps[i], instruction: txt };
                          setTempRecipe({ ...tempRecipe, steps: newSteps });
                        }}
                        className="min-h-[60px] flex-1 rounded border border-gray-200 bg-gray-50 p-2 text-black dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                        textAlignVertical="top"
                      />
                      <TouchableOpacity
                        onPress={() => {
                          const newSteps = tempRecipe.steps.filter((_, idx) => idx !== i);
                          const reindexed = newSteps.map((s, idx) => ({
                            ...s,
                            step: String(idx + 1),
                          }));
                          setTempRecipe({ ...tempRecipe, steps: reindexed });
                        }}
                        className="ml-2 mt-2"
                      >
                        <Ionicons name="remove-circle" size={20} color="red" />
                      </TouchableOpacity>
                    </View>
                  ))
                : displayRecipe.steps.map((step, i) => (
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
            {(isEditing || displayRecipe.tips) && (
              <View className="mb-8 rounded-xl border border-amber-100 bg-amber-50 p-4 dark:border-amber-900/30 dark:bg-amber-900/20">
                <Text className="mb-1 font-visby-bold text-amber-800 dark:text-amber-500">
                  💡 Tips Chef
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
                <Text className="ml-2 font-visby-bold text-red-500">Hapus Resep Ini</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};
