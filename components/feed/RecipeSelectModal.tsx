import React, { useState, useMemo } from 'react';
import { View, Text, Modal, FlatList, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { useRecipeStorage } from '@/lib/hooks/useRecipeStorage';
import { Image } from 'expo-image';
import { CloseCircle, SearchNormal1, Book } from 'iconsax-react-native';
import { useColorScheme } from 'nativewind';
import { Recipe } from '@/lib/types';
import { SafeAreaView } from 'react-native-safe-area-context';

interface RecipeSelectModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (recipe: Recipe) => void;
}

export const RecipeSelectModal: React.FC<RecipeSelectModalProps> = ({ visible, onClose, onSelect }) => {
  const { savedRecipes, isLoading } = useRecipeStorage();
  const [searchQuery, setSearchQuery] = useState('');
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const filteredRecipes = useMemo(() => {
    if (!searchQuery) return savedRecipes;
    return savedRecipes.filter(r => 
      r.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [savedRecipes, searchQuery]);

  const renderItem = ({ item }: { item: Recipe }) => (
    <TouchableOpacity
      onPress={() => onSelect(item)}
      className="flex-row items-center p-3 mb-2 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700"
    >
      <Image
        source={item.imageUrl ? { uri: item.imageUrl } : { uri: 'https://placehold.co/100x100/png?text=Recipe' }}
        style={{ width: 50, height: 50, borderRadius: 8 }}
        contentFit="cover"
      />
      <View className="ml-3 flex-1">
        <Text className="font-visby-bold text-gray-900 dark:text-white" numberOfLines={1}>{item.title}</Text>
        <Text className="text-xs text-gray-500 dark:text-gray-400" numberOfLines={1}>
          {item.time_minutes}m • {item.calories_per_serving} kcal
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView className="flex-1 bg-white dark:bg-[#0F0F0F]">
        {/* Header */}
        <View className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex-row items-center justify-between">
          <Text className="font-visby-bold text-lg text-gray-900 dark:text-white">Attach Recipe</Text>
          <TouchableOpacity onPress={onClose}>
            <CloseCircle size={28} color={isDark ? '#9CA3AF' : '#6B7280'} />
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View className="p-4">
          <View className="flex-row items-center bg-gray-100 dark:bg-gray-800 px-4 py-3 rounded-xl">
            <SearchNormal1 size={20} color="#9CA3AF" />
            <TextInput
              placeholder="Search your recipes..."
              placeholderTextColor="#9CA3AF"
              className="flex-1 ml-2 font-visby text-base text-gray-900 dark:text-white h-full"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        </View>

        {/* List */}
        {isLoading ? (
          <ActivityIndicator size="large" color="#8BD65E" className="mt-10" />
        ) : (
          <FlatList
            data={filteredRecipes}
            keyExtractor={(item) => item.id || `temp-${Math.random()}`}
            renderItem={renderItem}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20 }}
            ListEmptyComponent={
              <View className="items-center justify-center mt-10 opacity-60">
                <Book size={48} color="#ccc" />
                <Text className="mt-4 font-visby-bold text-gray-400">No recipes found</Text>
              </View>
            }
          />
        )}
      </SafeAreaView>
    </Modal>
  );
};
