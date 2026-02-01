import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'nativewind';
import { Recipe } from '@/lib/types';

interface CreateCollectionModalProps {
  visible: boolean;
  onClose: () => void;
  recipes: Recipe[];
  onCreate: (name: string, selectedIds: string[]) => void;
}

export const CreateCollectionModal: React.FC<CreateCollectionModalProps> = ({
  visible,
  onClose,
  recipes,
  onCreate,
}) => {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [collectionName, setCollectionName] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleSelection = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const handleSubmit = () => {
    if (!collectionName.trim()) {
      Alert.alert('Missing Name', 'Please enter a name for your collection.');
      return;
    }
    if (selectedIds.size === 0) {
      Alert.alert('No Recipes', 'Please select at least one recipe to start this collection.');
      return;
    }
    onCreate(collectionName.trim(), Array.from(selectedIds));
    // Reset state
    setCollectionName('');
    setSelectedIds(new Set());
    onClose();
  };

  return (
    <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
      <View className="flex-1 bg-gray-50 dark:bg-[#0F0F0F]">
        {/* Simple Header */}
        <View className="z-10 flex-row items-center justify-between bg-white px-5 pb-4 pt-12 shadow-sm dark:bg-[#1A1A1A]">
          <TouchableOpacity onPress={onClose} className="p-2">
            <Ionicons name="close" size={24} color={isDark ? 'white' : 'black'} />
          </TouchableOpacity>
          <Text className="font-visby-bold text-xl text-gray-900 dark:text-white">
            New Collection
          </Text>
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={!collectionName.trim() || selectedIds.size === 0}
            className={`rounded-full px-4 py-2 ${!collectionName.trim() || selectedIds.size === 0 ? 'bg-gray-200 dark:bg-gray-800' : 'bg-black dark:bg-white'}`}
          >
            <Text
              className={`font-visby-bold ${!collectionName.trim() || selectedIds.size === 0 ? 'text-gray-400' : 'text-white dark:text-black'}`}
            >
              Create
            </Text>
          </TouchableOpacity>
        </View>

        <View className="flex-1 px-5">
          {/* Input Name (Fixed) */}
          <View className="my-6">
            <Text className="mb-2 font-visby-bold text-sm text-gray-500">COLLECTION NAME</Text>
            <TextInput
              value={collectionName}
              onChangeText={setCollectionName}
              placeholder="e.g. Summer Dinner Ideas"
              placeholderTextColor="#9CA3AF"
              className="rounded-xl border border-gray-200 bg-white p-4 font-visby-bold text-lg text-gray-900 dark:border-gray-800 dark:bg-[#1A1A1A] dark:text-white"
            />
          </View>

          {/* Scrollable Recipe List */}
          <View className="flex-1">
            <Text className="mb-4 font-visby-bold text-sm text-gray-500">
              SELECT RECIPES ({selectedIds.size})
            </Text>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 40 }}
            >
              {recipes.length === 0 ? (
                <Text className="py-10 text-center text-gray-400">
                  No recipes available to add.
                </Text>
              ) : (
                recipes.map((recipe) => {
                  const isSelected = selectedIds.has(recipe.id!);
                  return (
                    <TouchableOpacity
                      key={recipe.id}
                      onPress={() => toggleSelection(recipe.id!)}
                      className={`mb-3 flex-row items-center rounded-xl border p-3 ${isSelected ? 'border-orange-500 bg-orange-50 dark:border-orange-500 dark:bg-orange-900/20' : 'border-gray-100 bg-white dark:border-gray-800 dark:bg-[#1A1A1A]'}`}
                    >
                      {/* Checkbox */}
                      <View
                        className={`mr-4 h-6 w-6 items-center justify-center rounded-full border ${isSelected ? 'border-orange-500 bg-orange-500' : 'border-gray-300 dark:border-gray-600'}`}
                      >
                        {isSelected && <Ionicons name="checkmark" size={16} color="white" />}
                      </View>

                      {/* Image */}
                      <View className="mr-3 h-16 w-16 overflow-hidden rounded-lg bg-gray-200 dark:bg-gray-700">
                        {recipe.imageUrl ? (
                          <Image
                            source={{ uri: recipe.imageUrl }}
                            className="h-full w-full"
                            resizeMode="cover"
                          />
                        ) : (
                          <View className="h-full w-full items-center justify-center">
                            <Text>🍲</Text>
                          </View>
                        )}
                      </View>

                      {/* Info */}
                      <View className="flex-1">
                        <Text
                          numberOfLines={1}
                          className="mb-1 font-visby-bold text-base text-gray-900 dark:text-white"
                        >
                          {recipe.title}
                        </Text>
                        <Text numberOfLines={1} className="font-visby text-xs text-gray-500">
                          {recipe.time_minutes} min • {recipe.calories_per_serving} kcal
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
          </View>
        </View>
      </View>
    </Modal>
  );
};
