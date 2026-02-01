import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, FlatList, Alert, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useShoppingListStore } from '@/lib/store/shoppingListStore';
import { ShoppingItem } from '@/lib/types';
import * as Haptics from 'expo-haptics';
import { CustomAlertModal } from '@/components/CustomAlertModal';
import { EditShoppingItemModal } from '@/components/shopping/EditShoppingItemModal';

export default function ShoppingListScreen() {
  const router = useRouter();
  const { items, toggleItem, removeItem, clearAll, sync, addItem, updateItem } =
    useShoppingListStore();

  // Split input state
  const [newItemName, setNewItemName] = useState('');
  const [newItemQty, setNewItemQty] = useState('');
  const [newItemUnit, setNewItemUnit] = useState('');

  const [clearAlertVisible, setClearAlertVisible] = useState(false);

  // Edit State
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [itemToEdit, setItemToEdit] = useState<ShoppingItem | null>(null);

  // Sorting
  const sortedItems = React.useMemo(() => {
    // Sort by: Unchecked first, then Checked. Within groups, sort by creation (implicitly order in array but typically reverse chrono)
    const unchecked = items.filter((i) => !i.isChecked);
    const checked = items.filter((i) => i.isChecked);
    return [...unchecked, ...checked];
  }, [items]);

  useEffect(() => {
    // Sync on load
    sync();
  }, []);

  const handleToggle = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    toggleItem(id);
  };

  const parseItemText = (text: string) => {
    // Basic parser: "2 kg rice" -> qty: 2, unit: kg, name: rice
    // "3 apples" -> qty: 3, unit: pcs (implicit), name: apples
    const parts = text.trim().split(' ');
    const qty = parseFloat(parts[0]);

    if (!isNaN(qty)) {
      if (parts.length > 2) {
        // Assume second part is unit if there are more parts
        const unit = parts[1];
        const name = parts.slice(2).join(' ');
        return { name, quantity: qty, unit };
      } else if (parts.length === 2) {
        // "3 apples" -> 3 pcs apples
        return { name: parts[1], quantity: qty, unit: 'pcs' };
      }
    }
    return { name: text.trim() };
  };

  const handleAddManual = async () => {
    if (!newItemName.trim()) return;
    Haptics.selectionAsync();

    await addItem(
      newItemName.trim(),
      undefined,
      newItemQty ? parseFloat(newItemQty) : undefined,
      newItemUnit.trim() || undefined,
    );

    setNewItemName('');
    setNewItemQty('');
    setNewItemUnit('');
  };

  const handleClear = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    setClearAlertVisible(true);
  };

  const confirmClear = () => {
    clearAll();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleEdit = (item: ShoppingItem) => {
    Haptics.selectionAsync();
    setItemToEdit(item);
    setEditModalVisible(true);
  };

  const handleUpdateItem = async (id: string, updates: Partial<ShoppingItem>) => {
    await updateItem(id, updates);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const renderItem = ({ item }: { item: ShoppingItem }) => (
    <View
      className={`mb-2 flex-row items-center border-b border-gray-100 py-3 ${
        item.isChecked ? 'opacity-50' : ''
      }`}
    >
      <TouchableOpacity onPress={() => handleToggle(item.id)} className="mr-3">
        <View
          className={`h-5 w-5 items-center justify-center rounded border ${
            item.isChecked ? 'border-primary bg-primary' : 'border-gray-300'
          }`}
        >
          {item.isChecked && <Ionicons name="checkmark" size={14} color="white" />}
        </View>
      </TouchableOpacity>

      <TouchableOpacity className="flex-1 flex-row items-center" onPress={() => handleEdit(item)}>
        {/* Item Name Column */}
        <View className="flex-[3] pr-2">
          <Text
            className={`font-visby text-base ${
              item.isChecked ? 'text-gray-400 line-through' : 'text-gray-900'
            }`}
            numberOfLines={2}
          >
            {item.name}
          </Text>
          {item.fromRecipe && (
            <Text className="text-[10px] text-gray-400" numberOfLines={1}>
              {item.fromRecipe}
            </Text>
          )}
        </View>

        {/* Quantity Column */}
        <View className="flex-1 items-center justify-center border-l border-gray-100 px-1">
          <Text className="font-visby-bold text-sm text-gray-700">{item.quantity || '-'}</Text>
        </View>

        {/* Unit Column */}
        <View className="flex-1 items-center justify-center border-l border-gray-100 px-1">
          <Text className="font-visby text-sm text-gray-500">{item.unit || '-'}</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => removeItem(item.id)} className="ml-2 p-2">
        <Ionicons name="trash-outline" size={18} color="#EF4444" />
      </TouchableOpacity>
    </View>
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

      {/* Add Item Input - Split Columns */}
      <View className="flex-row items-center gap-2 border-b border-gray-100 bg-white px-4 py-4 shadow-sm">
        {/* Name Input */}
        <TextInput
          value={newItemName}
          onChangeText={setNewItemName}
          placeholder="Item Name"
          placeholderTextColor="#9CA3AF"
          className="flex-[3] rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 font-visby text-sm text-gray-900"
          onSubmitEditing={() => {}}
          returnKeyType="next"
        />

        {/* Qty Input */}
        <TextInput
          value={newItemQty}
          onChangeText={setNewItemQty}
          placeholder="Qty"
          placeholderTextColor="#9CA3AF"
          keyboardType="numeric"
          className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-2 py-2 text-center font-visby text-sm text-gray-900"
        />

        {/* Unit Input */}
        <TextInput
          value={newItemUnit}
          onChangeText={setNewItemUnit}
          placeholder="Unit"
          placeholderTextColor="#9CA3AF"
          className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-2 py-2 text-center font-visby text-sm text-gray-900"
          onSubmitEditing={handleAddManual}
          returnKeyType="done"
        />

        <TouchableOpacity
          onPress={handleAddManual}
          disabled={!newItemName.trim()}
          className={`h-10 w-10 items-center justify-center rounded-full ${newItemName.trim() ? 'bg-black' : 'bg-gray-200'}`}
        >
          <Ionicons name="add" size={24} color={newItemName.trim() ? 'white' : '#999'} />
        </TouchableOpacity>
      </View>

      {/* List Header */}
      {items.length > 0 && (
        <View className="flex-row items-center border-b border-gray-200 bg-gray-50 px-4 py-2">
          <View className="w-8" />
          <Text className="flex-[3] font-visby-bold text-xs text-gray-500">ITEM</Text>
          <Text className="flex-1 text-center font-visby-bold text-xs text-gray-500">QTY</Text>
          <Text className="flex-1 text-center font-visby-bold text-xs text-gray-500">UNIT</Text>
          <View className="w-8" />
        </View>
      )}

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
          data={sortedItems}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
        />
      )}

      <CustomAlertModal
        visible={clearAlertVisible}
        title="Clear List"
        message="Are you sure you want to remove all items?"
        onClose={() => setClearAlertVisible(false)}
        onConfirm={confirmClear}
        confirmText="Clear All"
        type="destructive"
        icon="trash-outline"
      />

      <EditShoppingItemModal
        visible={editModalVisible}
        item={itemToEdit}
        onClose={() => setEditModalVisible(false)}
        onUpdate={handleUpdateItem}
      />
    </SafeAreaView>
  );
}
