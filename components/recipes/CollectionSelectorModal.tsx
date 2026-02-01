import React, { useState } from 'react';
import { View, Text, Modal, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'nativewind';
import { Recipe } from '@/lib/types';

interface CollectionSelectorModalProps {
  visible: boolean;
  onClose: () => void;
  recipe: Recipe | null;
  availableCollections: string[];
  onToggleCollection: (collectionName: string) => void;
  onCreateCollection: (collectionName: string) => void;
}

export const CollectionSelectorModal: React.FC<CollectionSelectorModalProps> = ({
  visible,
  onClose,
  recipe,
  availableCollections,
  onToggleCollection,
  onCreateCollection,
}) => {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [newCollectionName, setNewCollectionName] = useState('');

  const handleCreate = () => {
    if (!newCollectionName.trim()) return;
    onCreateCollection(newCollectionName.trim());
    setNewCollectionName('');
  };

  return (
    <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/60">
        <TouchableOpacity className="flex-1" onPress={onClose} />
        <View className="h-2/3 rounded-t-3xl bg-white p-6 dark:bg-[#252525]">
          <View className="mb-4 flex-row items-center justify-between">
            <Text className="font-visby-bold text-xl text-gray-900 dark:text-white">
              Add to Collection
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={isDark ? 'white' : 'black'} />
            </TouchableOpacity>
          </View>

          <ScrollView className="mb-4 flex-1">
            {/* Existing Collections */}
            {availableCollections.map((name) => {
              const isSelected = (recipe?.collections || []).includes(name);
              return (
                <TouchableOpacity
                  key={name}
                  onPress={() => onToggleCollection(name)}
                  className="mb-3 flex-row items-center justify-between rounded-xl bg-gray-50 p-4 dark:bg-gray-800"
                >
                  <View className="flex-row items-center">
                    <View className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900/30">
                      <Ionicons name="folder-open" size={20} color="#F97316" />
                    </View>
                    <Text className="font-visby-bold text-base text-gray-800 dark:text-gray-200">
                      {name}
                    </Text>
                  </View>
                  {isSelected && <Ionicons name="checkmark-circle" size={24} color="#8BD65E" />}
                </TouchableOpacity>
              );
            })}

            {availableCollections.length === 0 && (
              <View className="items-center py-8">
                <Text className="text-center font-visby text-gray-400">
                  No collections yet. Create one!
                </Text>
              </View>
            )}
          </ScrollView>

          {/* Create New Collection */}
          <View>
            <Text className="mb-2 font-visby-bold text-sm text-gray-500">
              Create New Collection
            </Text>
            <View className="flex-row gap-2">
              <TextInput
                value={newCollectionName}
                onChangeText={setNewCollectionName}
                placeholder="Collection Name (e.g. Breakfast)"
                placeholderTextColor="#9CA3AF"
                className="flex-1 rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
              <TouchableOpacity
                onPress={handleCreate}
                className={`items-center justify-center rounded-xl p-4 ${newCollectionName.trim() ? 'bg-black dark:bg-white' : 'bg-gray-300 dark:bg-gray-700'}`}
                disabled={!newCollectionName.trim()}
              >
                <Ionicons
                  name="add"
                  size={24}
                  color={newCollectionName.trim() ? (isDark ? 'black' : 'white') : '#888'}
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};
