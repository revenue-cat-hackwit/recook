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
import * as ImagePicker from 'expo-image-picker';
import { PantryService, PantryItem } from '@/lib/services/pantryService';
import { RecipeService } from '@/lib/services/recipeService';

const CATEGORIES = ['Dairy', 'Vegetable', 'Fruit', 'Meat', 'Grain', 'Spice', 'Other'];

export default function PantryScreen() {
  const router = useRouter();
  const [items, setItems] = useState<PantryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  // Add/Edit Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [itemName, setItemName] = useState('');
  const [itemQty, setItemQty] = useState('');
  const [itemCategory, setItemCategory] = useState(CATEGORIES[0]);
  const [daysUntilExpiry, setDaysUntilExpiry] = useState('7'); // Default 7 days

  // Scan Preview Modal
  const [showScanPreview, setShowScanPreview] = useState(false);
  const [scannedItems, setScannedItems] = useState<any[]>([]);
  const [loadingMessage, setLoadingMessage] = useState('');

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

  const handleCameraScan = async () => {
    // 1. Pick Image
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.5,
      allowsEditing: true,
      aspect: [4, 3],
    });

    if (result.canceled || !result.assets[0]) return;

    setAnalyzing(true);
    try {
      // 2. Upload
      setLoadingMessage('Uploading image...');
      const publicUrl = await RecipeService.uploadMedia(result.assets[0].uri);

      // 3. Analyze
      setLoadingMessage('Analyzing with AI...');
      const detectedItems = await PantryService.analyzeFromImage(publicUrl);

      if (!detectedItems || detectedItems.length === 0) {
        Alert.alert(
          'No Items Found',
          "AI couldn't detect any food items. Try a clearer photo with better lighting.",
          [{ text: 'OK' }],
        );
        return;
      }

      // 4. Show Preview Modal
      setScannedItems(detectedItems);
      setShowScanPreview(true);
    } catch (_e: any) {
      console.error('Scan Error:', _e);
      Alert.alert('Scan Failed', _e.message || 'Please try again.', [
        { text: 'Add Manually', onPress: () => setIsModalOpen(true) },
        { text: 'Cancel', style: 'cancel' },
      ]);
    } finally {
      setAnalyzing(false);
      setLoadingMessage('');
    }
  };

  const handleSaveScannedItems = async () => {
    setShowScanPreview(false);
    setAnalyzing(true);

    try {
      let addedCount = 0;
      for (const item of scannedItems) {
        try {
          await PantryService.addItem({
            ingredient_name: item.name || 'Unknown Item',
            quantity: item.quantity || '1',
            category: 'Other',
            expiry_date: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
          });
          addedCount++;
        } catch (itemError) {
          console.error('Failed to add item:', item.name, itemError);
        }
      }

      // TODO: Delete uploaded image after saving (implement RecipeService.deleteMedia)
      // if (uploadedImageUrl) {
      //   try {
      //     await RecipeService.deleteMedia(uploadedImageUrl);
      //     console.log('Uploaded image deleted successfully');
      //   } catch (deleteError) {
      //     console.error('Failed to delete uploaded image:', deleteError);
      //   }
      // }

      if (addedCount > 0) {
        Alert.alert(
          'Success! 🎉',
          `Added ${addedCount} item${addedCount > 1 ? 's' : ''} to your pantry!`,
        );
        loadPantry();
      } else {
        Alert.alert('Error', 'Failed to add items. Please try again.');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to save items.');
    } finally {
      setAnalyzing(false);
      setScannedItems([]);
    }
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
          <Ionicons name="add-circle" size={28} color="#8BD65E" />
        </TouchableOpacity>
      </View>

      <ScrollView
        className="flex-1 px-5 pt-4"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Main Content Area */}
        {loading ? (
          <View className="mt-20 items-center">
            <ActivityIndicator size="large" color="#8BD65E" />
          </View>
        ) : items.length > 0 ? (
          <>
            {/* Expiring Soon Section if any */}
            {items.some((i) => (getDaysUntilExpiry(i.expiry_date) || 100) <= 3) && (
              <View className="mb-6">
                <Text className="mb-2 font-visby-bold text-red-500">⚠️ Expiring Soon</Text>
                {items
                  .filter((i) => (getDaysUntilExpiry(i.expiry_date) || 100) <= 3)
                  .map(renderItem)}
              </View>
            )}

            <Text className="mb-3 font-visby-bold text-gray-800">Inventory ({items.length})</Text>
            {items.filter((i) => (getDaysUntilExpiry(i.expiry_date) || 100) > 3).map(renderItem)}
          </>
        ) : (
          /* SINGLE UNIFIED EMPTY STATE */
          <View className="mt-10 flex-1 items-center justify-center px-4">
            <View className="mb-6 h-32 w-32 items-center justify-center rounded-[40px] bg-green-50 shadow-sm">
              <Ionicons name="camera" size={56} color="#8BD65E" />
            </View>

            <Text className="mb-2 text-center font-visby-bold text-2xl text-gray-900">
              Your Pantry is Empty
            </Text>

            <Text className="mb-8 w-3/4 text-center font-visby text-base leading-6 text-gray-400">
              Start by scanning your fridge or receipt to instantly add ingredients!
            </Text>

            <TouchableOpacity
              onPress={handleCameraScan}
              disabled={analyzing}
              className="w-full flex-row items-center justify-center rounded-3xl bg-[#8BD65E] py-4 shadow-lg shadow-green-200 active:scale-95"
            >
              {analyzing ? (
                <ActivityIndicator color="white" />
              ) : (
                <>
                  <Ionicons name="camera" size={24} color="white" style={{ marginRight: 8 }} />
                  <Text className="font-visby-bold text-lg text-white">Scan Pantry</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setIsModalOpen(true)} className="mt-4 py-2">
              <Text className="font-visby-bold text-gray-400">Add Manually</Text>
            </TouchableOpacity>
          </View>
        )}

        <View className="h-24" />
      </ScrollView>

      {/* Floating Camera Button - Shows when there are items */}
      {items.length > 0 && (
        <TouchableOpacity
          onPress={handleCameraScan}
          disabled={analyzing}
          className="absolute bottom-6 right-6 h-16 w-16 items-center justify-center rounded-full shadow-xl"
          style={{
            backgroundColor: '#8BD65E',
            shadowColor: '#8BD65E',
            shadowOpacity: 0.4,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: 4 },
            elevation: 8,
          }}
        >
          {analyzing ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Ionicons name="camera" size={28} color="white" />
          )}
        </TouchableOpacity>
      )}

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
                    className={`text-center font-visby-bold ${daysUntilExpiry === '7' ? 'text-primary' : 'text-gray-500'}`}
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
                className="items-center rounded-full bg-[#8BD65E] py-4 shadow-lg shadow-green-200"
              >
                <Text className="font-visby-bold text-lg text-white">Save to Pantry</Text>
              </TouchableOpacity>

              <View className="h-20" />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Loading Overlay */}
      {analyzing && (
        <View className="absolute inset-0 z-50 items-center justify-center bg-black/50">
          <View className="w-64 rounded-3xl bg-white p-8 shadow-2xl">
            <ActivityIndicator size="large" color="#8BD65E" />
            <Text className="mt-4 text-center font-visby-bold text-lg text-gray-800">
              {loadingMessage || 'Processing...'}
            </Text>
            <Text className="mt-2 text-center font-visby text-sm text-gray-500">
              This may take a few seconds
            </Text>
          </View>
        </View>
      )}

      {/* Scan Preview Modal */}
      <Modal visible={showScanPreview} animationType="slide" presentationStyle="pageSheet">
        <View className="flex-1 bg-white">
          <View className="border-b border-gray-100 bg-white px-6 pb-4 pt-16">
            <View className="flex-row items-center justify-between">
              <Text className="font-visby-bold text-2xl text-gray-800">Review Items</Text>
              <TouchableOpacity onPress={() => setShowScanPreview(false)}>
                <Ionicons name="close" size={28} color="#666" />
              </TouchableOpacity>
            </View>
            <Text className="mt-2 font-visby text-gray-500">
              {scannedItems.length} item{scannedItems.length > 1 ? 's' : ''} detected - Edit before
              saving
            </Text>
          </View>

          <ScrollView className="flex-1 px-6 pt-4">
            {scannedItems.map((item, index) => (
              <View key={index} className="mb-3 rounded-2xl border border-gray-100 bg-gray-50 p-4">
                <View className="mb-3 flex-row items-center justify-between">
                  <Text className="font-visby-bold text-sm text-gray-500">Item {index + 1}</Text>
                  <TouchableOpacity
                    onPress={() => {
                      const updated = scannedItems.filter((_, i) => i !== index);
                      setScannedItems(updated);
                    }}
                  >
                    <Ionicons name="trash-outline" size={20} color="#EF4444" />
                  </TouchableOpacity>
                </View>

                <TextInput
                  className="mb-2 rounded-xl border border-gray-200 bg-white px-4 py-3 font-visby-bold text-base text-gray-800"
                  placeholder="Item name"
                  value={item.name}
                  onChangeText={(text) => {
                    const updated = [...scannedItems];
                    updated[index].name = text;
                    setScannedItems(updated);
                  }}
                />

                <TextInput
                  className="rounded-xl border border-gray-200 bg-white px-4 py-3 font-visby text-sm text-gray-600"
                  placeholder="Quantity"
                  value={item.quantity}
                  onChangeText={(text) => {
                    const updated = [...scannedItems];
                    updated[index].quantity = text;
                    setScannedItems(updated);
                  }}
                />
              </View>
            ))}

            {scannedItems.length === 0 && (
              <View className="mt-10 items-center">
                <Text className="font-visby text-gray-400">No items to save</Text>
              </View>
            )}

            <View className="my-6 rounded-2xl bg-blue-50 p-4">
              <View className="flex-row items-start">
                <Ionicons name="information-circle" size={20} color="#3B82F6" />
                <Text className="ml-2 flex-1 font-visby text-sm text-blue-600">
                  Items will be saved with category &quot;Other&quot; and 7-day expiry. You can edit
                  them later from your pantry.
                </Text>
              </View>
            </View>
          </ScrollView>

          <View className="border-t border-gray-100 bg-white px-6 py-4">
            <TouchableOpacity
              onPress={handleSaveScannedItems}
              disabled={scannedItems.length === 0}
              className={`items-center rounded-full py-4 shadow-lg ${
                scannedItems.length === 0 ? 'bg-gray-300' : 'bg-[#8BD65E] shadow-green-200'
              }`}
            >
              <Text className="font-visby-bold text-lg text-white">
                {scannedItems.length === 0
                  ? 'No Items to Save'
                  : `Save ${scannedItems.length} Item${scannedItems.length > 1 ? 's' : ''} to Pantry`}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
