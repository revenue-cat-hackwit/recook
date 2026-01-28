import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, FlatList, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useShoppingListStore } from '@/lib/store/shoppingListStore';
import { ShoppingItem } from '@/lib/types';
import * as Haptics from 'expo-haptics';

export default function ShoppingListScreen() {
  const router = useRouter();
  const { items, toggleItem, removeItem, clearAll, sync } = useShoppingListStore();

  useEffect(() => {
    // Sync on load
    sync();
  }, []);

  const handleToggle = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    toggleItem(id);
  };

  const handleClear = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert('Clear List', 'Are you sure you want to remove all items?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear All',
        style: 'destructive',
        onPress: () => {
          clearAll();
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        },
      },
    ]);
  };

  const renderItem = ({ item }: { item: ShoppingItem }) => (
    <TouchableOpacity
      className={`mb-3 flex-row items-center rounded-xl border p-4 shadow-sm ${
        item.isChecked ? 'border-gray-100 bg-gray-50' : 'border-gray-100 bg-white'
      }`}
      onPress={() => handleToggle(item.id)}
    >
      <View
        className={`mr-3 h-6 w-6 items-center justify-center rounded-full border ${
          item.isChecked ? 'border-green-500 bg-green-500' : 'border-gray-300'
        }`}
      >
        {item.isChecked && <Ionicons name="checkmark" size={16} color="white" />}
      </View>

      <View className="flex-1">
        <Text
          className={`font-visby text-base ${
            item.isChecked ? 'text-gray-400 line-through' : 'text-gray-900'
          }`}
        >
          {item.name}
        </Text>
        {item.fromRecipe && (
          <Text className="mt-1 text-xs text-gray-400">From: {item.fromRecipe}</Text>
        )}
      </View>

      <TouchableOpacity onPress={() => removeItem(item.id)} className="p-2">
        <Ionicons name="trash-outline" size={18} color="#ddd" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView className="flex-1 bg-[#F9FAFB]">
      {/* Header */}
      <View className="flex-row items-center justify-between border-b border-gray-50 bg-white px-6 py-4">
        <TouchableOpacity onPress={() => router.back()} className="-ml-2 p-2">
          <Ionicons name="arrow-back" size={24} color="black" />
        </TouchableOpacity>
        <Text className="font-visby-bold text-xl text-gray-900">Shopping List 🛒</Text>
        <TouchableOpacity onPress={handleClear} disabled={items.length === 0}>
          <Text
            className={`font-visby-bold text-sm ${items.length > 0 ? 'text-red-500' : 'text-gray-300'}`}
          >
            Clear
          </Text>
        </TouchableOpacity>
      </View>

      {items.length === 0 ? (
        <View className="flex-1 items-center justify-center px-10">
          <View className="mb-6 h-24 w-24 items-center justify-center rounded-full bg-gray-100">
            <Ionicons name="cart-outline" size={40} color="#9CA3AF" />
          </View>
          <Text className="mb-2 font-visby-bold text-xl text-gray-900">Basket Empty</Text>
          <Text className="text-center font-visby text-gray-500">
            Your shopping list is currently empty. Go to your saved recipes and add ingredients!
          </Text>
          <TouchableOpacity
            onPress={() => router.back()}
            className="mt-8 rounded-full bg-black px-8 py-3"
          >
            <Text className="font-visby-bold text-white">Go to Recipes</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={items}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}
