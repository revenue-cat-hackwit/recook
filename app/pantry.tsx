import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { PantryService, PantryItem } from '@/lib/services/pantryService';

const CATEGORIES = ['Dairy', 'Vegetable', 'Fruit', 'Meat', 'Grain', 'Spice', 'Other'];

export default function PantryScreen() {
  const router = useRouter();
  const [items, setItems] = useState<PantryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Add/Edit Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [itemName, setItemName] = useState('');
  const [itemQty, setItemQty] = useState('');
  const [itemCategory, setItemCategory] = useState(CATEGORIES[0]);
  const [daysUntilExpiry, setDaysUntilExpiry] = useState('7'); // Default 7 days

  const loadPantry = useCallback(async () => {
    try {
      const data = await PantryService.getPantryItems();
      setItems(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadPantry();
  }, [loadPantry]);

  const onRefresh = () => {
    setRefreshing(true);
    loadPantry();
  };

  const handleAddItem = async () => {
    if (!itemName) {
      Alert.alert('Error', 'Please enter a name');
      return;
    }

    try {
      // Calculate date
      const days = parseInt(daysUntilExpiry) || 7;
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + days);

      await PantryService.addItem({
        ingredient_name: itemName,
        quantity: itemQty || '1',
        category: itemCategory,
        expiry_date: expiryDate.toISOString().split('T')[0],
      });

      // Reset
      setIsModalOpen(false);
      setItemName('');
      setItemQty('');
      setDaysUntilExpiry('7');
      loadPantry(); // Refresh list to get real IDs
    } catch (e) {
      Alert.alert('Error', 'Failed to add item');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await PantryService.deleteItem(id);
      setItems((prev) => prev.filter((i) => i.id !== id));
    } catch (e) {
      console.error(e);
    }
  };

  const getDaysUntilExpiry = (dateStr: string | null) => {
    if (!dateStr) return null;
    const today = new Date();
    const exp = new Date(dateStr);
    const diffTime = exp.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const renderItem = (item: PantryItem) => {
    const daysLeft = getDaysUntilExpiry(item.expiry_date);
    let expiryColor = 'text-gray-500';
    let expiryText = daysLeft ? `${daysLeft} days left` : 'No expiry';
    let bgClass = 'bg-white border-gray-100';

    if (daysLeft !== null) {
      if (daysLeft < 0) {
        expiryColor = 'text-red-500 font-visby-bold';
        expiryText = 'Expired';
        bgClass = 'bg-red-50 border-red-100';
      } else if (daysLeft <= 3) {
        expiryColor = 'text-orange-500 font-visby-bold';
        expiryText = `Expiring soon (${daysLeft}d)`;
        bgClass = 'bg-orange-50 border-orange-100';
      }
    }

    return (
      <View
        key={item.id}
        className={`mb-3 flex-row items-center justify-between rounded-xl border p-4 shadow-sm ${bgClass}`}
      >
        <View className="flex-1 flex-row items-center">
          <View className={`mr-3 h-10 w-10 items-center justify-center rounded-full bg-white`}>
            <Text className="text-lg">
              {item.category === 'Dairy'
                ? '🥛'
                : item.category === 'Vegetable'
                  ? '🥬'
                  : item.category === 'Meat'
                    ? '🥩'
                    : item.category === 'Fruit'
                      ? '🍎'
                      : '📦'}
            </Text>
          </View>
          <View>
            <Text className="font-visby-bold text-gray-900">{item.ingredient_name}</Text>
            <Text className="text-xs text-gray-500">
              {item.quantity} • {item.category}
            </Text>
          </View>
        </View>

        <View className="items-end">
          <Text className={`font-visby text-xs ${expiryColor} mb-1`}>{expiryText}</Text>
          <TouchableOpacity onPress={() => handleDelete(item.id)}>
            <Ionicons name="trash-outline" size={18} color="#999" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-[#F9FAFB]">
      <View className="flex-row items-center justify-between border-b border-gray-100 bg-white px-5 py-4">
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="black" />
        </TouchableOpacity>
        <Text className="font-visby-bold text-xl text-gray-900">My Pantry 🍎</Text>
        <TouchableOpacity onPress={() => setIsModalOpen(true)}>
          <Ionicons name="add-circle" size={28} color="#CC5544" />
        </TouchableOpacity>
      </View>

      <ScrollView
        className="flex-1 px-5 pt-4"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Expiring Soon Section if any */}
        {items.some((i) => (getDaysUntilExpiry(i.expiry_date) || 100) <= 3) && (
          <View className="mb-6">
            <Text className="mb-2 font-visby-bold text-red-500">⚠️ Expiring Soon</Text>
            {items.filter((i) => (getDaysUntilExpiry(i.expiry_date) || 100) <= 3).map(renderItem)}
          </View>
        )}

        <Text className="mb-3 font-visby-bold text-gray-800">Inventory ({items.length})</Text>

        {loading ? (
          <ActivityIndicator color="#CC5544" />
        ) : items.length === 0 ? (
          <View className="items-center justify-center py-10 opacity-50">
            <Ionicons name="basket-outline" size={64} color="#ccc" />
            <Text className="mt-4 font-visby text-gray-500">Your pantry is empty.</Text>
          </View>
        ) : (
          items.filter((i) => (getDaysUntilExpiry(i.expiry_date) || 100) > 3).map(renderItem)
        )}

        <View className="h-20" />
      </ScrollView>

      {/* ADD ITEM MODAL */}
      <Modal visible={isModalOpen} animationType="slide" transparent>
        <View className="flex-1 justify-end bg-black/50">
          <View className="h-[75%] rounded-t-3xl bg-white p-6">
            <View className="mb-6 flex-row justify-between">
              <Text className="font-visby-bold text-2xl">Add Item</Text>
              <TouchableOpacity onPress={() => setIsModalOpen(false)}>
                <Ionicons name="close" size={24} color="black" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text className="mb-1 font-visby-bold text-xs text-gray-500">NAME</Text>
              <TextInput
                className="mb-4 rounded-xl border border-gray-200 bg-gray-50 p-4 font-visby text-base"
                placeholder="e.g. Milk, Eggs"
                value={itemName}
                onChangeText={setItemName}
                autoFocus
              />

              <Text className="mb-1 font-visby-bold text-xs text-gray-500">QUANTITY</Text>
              <TextInput
                className="mb-4 rounded-xl border border-gray-200 bg-gray-50 p-4 font-visby text-base"
                placeholder="e.g. 1 liter, 6 pcs"
                value={itemQty}
                onChangeText={setItemQty}
              />

              <Text className="mb-1 font-visby-bold text-xs text-gray-500">CATEGORY</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                className="mb-4 flex-row"
              >
                {CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    onPress={() => setItemCategory(cat)}
                    className={`mr-2 rounded-full border px-4 py-2 ${itemCategory === cat ? 'border-black bg-black' : 'border-gray-200 bg-white'}`}
                  >
                    <Text className={itemCategory === cat ? 'text-white' : 'text-gray-600'}>
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text className="mb-1 font-visby-bold text-xs text-gray-500">Expires in (Days)</Text>
              <View className="mb-8 flex-row items-center gap-4">
                <TouchableOpacity
                  onPress={() => setDaysUntilExpiry('3')}
                  className={`flex-1 rounded-xl border p-3 ${daysUntilExpiry === '3' ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-white'}`}
                >
                  <Text
                    className={`text-center font-visby-bold ${daysUntilExpiry === '3' ? 'text-red-500' : 'text-gray-500'}`}
                  >
                    3 Days
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setDaysUntilExpiry('7')}
                  className={`flex-1 rounded-xl border p-3 ${daysUntilExpiry === '7' ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-white'}`}
                >
                  <Text
                    className={`text-center font-visby-bold ${daysUntilExpiry === '7' ? 'text-green-500' : 'text-gray-500'}`}
                  >
                    1 Week
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setDaysUntilExpiry('14')}
                  className={`flex-1 rounded-xl border p-3 ${daysUntilExpiry === '14' ? 'border-blue-200 bg-blue-50' : 'border-gray-200 bg-white'}`}
                >
                  <Text
                    className={`text-center font-visby-bold ${daysUntilExpiry === '14' ? 'text-blue-500' : 'text-gray-500'}`}
                  >
                    2 Weeks
                  </Text>
                </TouchableOpacity>
              </View>
              <TextInput
                className="mb-6 rounded-xl border border-gray-200 bg-gray-50 p-4 font-visby text-base"
                placeholder="Custom days (e.g. 5)"
                keyboardType="numeric"
                value={daysUntilExpiry}
                onChangeText={setDaysUntilExpiry}
              />

              <TouchableOpacity
                onPress={handleAddItem}
                className="items-center rounded-full bg-[#CC5544] py-4 shadow-lg shadow-red-200"
              >
                <Text className="font-visby-bold text-lg text-white">Save to Pantry</Text>
              </TouchableOpacity>

              <View className="h-20" />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
