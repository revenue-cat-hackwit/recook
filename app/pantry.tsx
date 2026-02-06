import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Container } from '@/components/Container';
import * as ImagePicker from 'expo-image-picker';
import { PantryService, PantryItem } from '@/lib/services/pantryService';
import { RecipeService } from '@/lib/services/recipeService';
import { PantryRecommendationService, RecipeWithPantryMatch } from '@/lib/services/pantryRecommendationService';
import { CustomCameraModal } from '@/components/CustomCameraModal';
import { RecipeDetailModal } from '@/components/recipes/RecipeDetailModal';
import { LoadingModal } from '@/components/LoadingModal';
import { showAlert } from '@/lib/utils/globalAlert';
import { Danger, TickCircle, MagicStar } from 'iconsax-react-native';

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

  // Custom Camera State
  const [isCameraVisible, setIsCameraVisible] = useState(false);

  // Recipe Recommendations State
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);
  const [recommendations, setRecommendations] = useState<RecipeWithPantryMatch[]>([]);
  const [showRecommendations, setShowRecommendations] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<RecipeWithPantryMatch | null>(null);

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
      showAlert('Error', 'Please enter a name', undefined, {
        icon: <Danger size={32} color="#EF4444" variant="Bold" />,
        type: 'destructive',
      });
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
      showAlert('Error', 'Failed to add item', undefined, {
        icon: <Danger size={32} color="#EF4444" variant="Bold" />,
        type: 'destructive',
      });
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

  // Open Custom Camera
  const handleCameraScan = async () => {
    setIsCameraVisible(true);
  };

  // Handle photo from custom camera
  const handleCameraCapture = async (uri: string) => {
    setIsCameraVisible(false);
    setAnalyzing(true);

    try {
      // Upload
      setLoadingMessage('Uploading image...');
      const publicUrl = await RecipeService.uploadMedia(uri);

      // Analyze
      setLoadingMessage('Analyzing with AI...');
      const detectedItems = await PantryService.analyzeFromImage(publicUrl);

      if (!detectedItems || detectedItems.length === 0) {
        showAlert(
          'No Items Found',
          "AI couldn't detect any food items. Try a clearer photo with better lighting.",
          undefined,
          {
            icon: <Danger size={32} color="#F59E0B" variant="Bold" />,
          },
        );
        return;
      }

      // Show Preview Modal
      setScannedItems(detectedItems);
      setShowScanPreview(true);
    } catch (_e: any) {
      console.error('Scan Error:', _e);
      showAlert(
        'Scan Failed',
        _e.message || 'Please try again.',
        [
          { text: 'Add Manually', onPress: () => setIsModalOpen(true) },
          { text: 'Cancel', style: 'cancel' },
        ],
        {
          icon: <Danger size={32} color="#EF4444" variant="Bold" />,
          type: 'destructive',
        },
      );
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
        showAlert(
          'Success! 🎉',
          `Added ${addedCount} item${addedCount > 1 ? 's' : ''} to your pantry!`,
          undefined,
          {
            icon: <TickCircle size={32} color="#10B981" variant="Bold" />,
          },
        );
        loadPantry();
      } else {
        showAlert('Error', 'Failed to add items. Please try again.', undefined, {
          icon: <Danger size={32} color="#EF4444" variant="Bold" />,
          type: 'destructive',
        });
      }
    } catch (e: any) {
      showAlert('Error', e.message || 'Failed to save items.', undefined, {
        icon: <Danger size={32} color="#EF4444" variant="Bold" />,
        type: 'destructive',
      });
    } finally {
      setAnalyzing(false);
      setScannedItems([]);
    }
  };

  const handleGetRecommendations = async () => {
    if (items.length === 0) {
      showAlert(
        'Pantry Empty',
        'Add some ingredients to your pantry first to get recipe recommendations!',
        undefined,
        {
          icon: <Danger size={32} color="#F59E0B" variant="Bold" />,
        }
      );
      return;
    }

    setLoadingRecommendations(true);
    try {
      const pantryItemNames = items.map(item => item.ingredient_name);
      const recs = await PantryRecommendationService.getRecommendations({
        pantryItems: pantryItemNames,
        maxIngredients: 5,
        difficulty: 'easy',
        timeLimit: 60,
        servings: 2,
      });

      setRecommendations(recs);
      setShowRecommendations(true);
      
      showAlert(
        'Recipes Found! 🎉',
        `Generated ${recs.length} AI-powered recipes based on your pantry!`,
        undefined,
        {
          icon: <TickCircle size={32} color="#10B981" variant="Bold" />,
        }
      );
    } catch (error: any) {
      console.error('Failed to get recommendations:', error);
      showAlert(
        'Error',
        error.message || 'Failed to get recommendations. Please try again.',
        undefined,
        {
          icon: <Danger size={32} color="#EF4444" variant="Bold" />,
          type: 'destructive',
        }
      );
    } finally {
      setLoadingRecommendations(false);
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
    <Container className="bg-[#F9FAFB]" noPadding>
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
        {/* Kitchen Tools Section */}
        {items.length > 0 && (
          <View className="mb-4">
            <Text className="mb-3 font-visby-bold text-sm text-gray-500">Kitchen Tools 🔧</Text>
            <View className="flex-row gap-3">
              {/* AI Recipe Recommendations Button */}
              <TouchableOpacity
                onPress={handleGetRecommendations}
                disabled={loadingRecommendations}
                className="flex-1 flex-row items-center justify-center rounded-2xl bg-purple-500 py-3 shadow-sm"
                style={{
                  backgroundColor: loadingRecommendations ? '#D1D5DB' : '#8B5CF6',
                }}
              >
                {loadingRecommendations ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <>
                    <MagicStar size={20} color="white" variant="Bold" />
                    <Text className="ml-2 font-visby-bold text-sm text-white">
                      Recipe Ideas
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              {/* Nutrition Analyzer Button */}
              <TouchableOpacity
                onPress={() => router.push('/nutrition-analyzer')}
                className="flex-1 flex-row items-center justify-center rounded-2xl bg-blue-500 py-3 shadow-sm"
              >
                <Ionicons name="fitness" size={20} color="white" />
                <Text className="ml-2 font-visby-bold text-sm text-white">
                  Nutrition Scan
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

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
      {/* Loading Overlay */}
      <LoadingModal
        visible={analyzing}
        message={loadingMessage || 'Processing...'}
        subMessage="This may take a few seconds"
      />

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

      {/* Custom Camera Modal */}
      <CustomCameraModal
        visible={isCameraVisible}
        onClose={() => setIsCameraVisible(false)}
        onPhotoTaken={handleCameraCapture}
      />

      {/* Recipe Recommendations Modal */}
      <Modal visible={showRecommendations} animationType="slide" presentationStyle="pageSheet">
        <View className="flex-1 bg-white">
          <View className="border-b border-gray-100 bg-white px-6 pb-4 pt-16">
            <View className="flex-row items-center justify-between">
              <Text className="font-visby-bold text-2xl text-gray-800">
                Recipe Recommendations
              </Text>
              <TouchableOpacity onPress={() => setShowRecommendations(false)}>
                <Ionicons name="close" size={28} color="#666" />
              </TouchableOpacity>
            </View>
            <Text className="mt-2 font-visby text-gray-500">
              {recommendations.length} recipe{recommendations.length !== 1 ? 's' : ''} match your {items.length} pantry item{items.length !== 1 ? 's' : ''}
            </Text>
          </View>

          <ScrollView className="flex-1 px-6 pt-4">
            {recommendations.map((recipe, index) => {
              const isAIGenerated = recipe.id?.startsWith('ai-rec-');
              const isExisting = !isAIGenerated;
              
              return (
                <TouchableOpacity
                  key={recipe.id || index}
                  onPress={() => setSelectedRecipe(recipe)}
                  className="mb-4 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
                >
                  <View className="p-4">
                    <View className="mb-3 flex-row items-start justify-between">
                      <View className="flex-1">
                        {/* Recipe Source Badge */}
                        <View className="mb-2 flex-row items-center gap-2">
                          {isExisting ? (
                            <View className="flex-row items-center rounded-full bg-blue-100 px-2 py-1">
                              <Ionicons name="bookmark" size={12} color="#3B82F6" />
                              <Text className="ml-1 font-visby-bold text-xs text-blue-600">
                                Saved Recipe
                              </Text>
                            </View>
                          ) : (
                            <View className="flex-row items-center rounded-full bg-purple-100 px-2 py-1">
                              <MagicStar size={12} color="#8B5CF6" variant="Bold" />
                              <Text className="ml-1 font-visby-bold text-xs text-purple-600">
                                AI Generated
                              </Text>
                            </View>
                          )}
                        </View>
                        
                        <Text className="mb-1 font-visby-bold text-lg text-gray-900">
                          {recipe.title}
                        </Text>
                        <Text className="font-visby text-sm text-gray-600">
                          {recipe.description}
                        </Text>
                      </View>
                      <View className="ml-3 items-center rounded-full bg-green-100 px-3 py-1">
                        <Text className="font-visby-bold text-xs text-green-700">
                          {Math.round(recipe.pantryMatchScore * 100)}% Match
                        </Text>
                      </View>
                    </View>

                  <View className="mb-3 flex-row flex-wrap gap-2">
                    <View className="flex-row items-center rounded-full bg-gray-100 px-3 py-1">
                      <Ionicons name="time-outline" size={14} color="#666" />
                      <Text className="ml-1 font-visby text-xs text-gray-600">
                        {recipe.time_minutes} min
                      </Text>
                    </View>
                    <View className="flex-row items-center rounded-full bg-gray-100 px-3 py-1">
                      <Ionicons name="restaurant-outline" size={14} color="#666" />
                      <Text className="ml-1 font-visby text-xs text-gray-600">
                        {recipe.servings} servings
                      </Text>
                    </View>
                    <View className="flex-row items-center rounded-full bg-blue-100 px-3 py-1">
                      <Text className="font-visby-bold text-xs text-blue-700">
                        {recipe.difficulty}
                      </Text>
                    </View>
                  </View>

                  {recipe.usedPantryItems.length > 0 && (
                    <View className="mb-3">
                      <Text className="mb-1 font-visby-bold text-xs text-gray-500">
                        Using from your pantry:
                      </Text>
                      <Text className="font-visby text-sm text-green-600">
                        {recipe.usedPantryItems.join(', ')}
                      </Text>
                    </View>
                  )}

                  {recipe.missingIngredients.length > 0 && (
                    <View className="rounded-xl bg-orange-50 p-3">
                      <Text className="mb-1 font-visby-bold text-xs text-orange-700">
                        Need to buy ({recipe.missingIngredients.length}):
                      </Text>
                      <Text className="font-visby text-xs text-orange-600">
                        {recipe.missingIngredients.map(ing => ing.item).join(', ')}
                      </Text>
                    </View>
                  )}
                </View>

                <View className="flex-row border-t border-gray-100 bg-gray-50 px-4 py-3">
                  <Text className="font-visby-bold text-sm text-purple-600">
                    Tap to view full recipe →
                  </Text>
                </View>
              </TouchableOpacity>
            )})}

            {recommendations.length === 0 && (
              <View className="mt-10 items-center">
                <Text className="font-visby text-gray-400">No recommendations available</Text>
              </View>
            )}

            <View className="mb-4 rounded-2xl bg-gradient-to-r from-purple-50 to-blue-50 p-4">
              <View className="flex-row items-start">
                <Ionicons name="information-circle" size={20} color="#8B5CF6" />
                <View className="ml-2 flex-1">
                  <Text className="mb-1 font-visby-bold text-sm text-purple-700">
                    Smart Recommendations
                  </Text>
                  <Text className="font-visby text-xs text-purple-600">
                    Showing both your saved recipes and AI-generated options that match your pantry items. Higher match % means fewer ingredients to buy!
                  </Text>
                </View>
              </View>
            </View>

            <View className="h-6" />
          </ScrollView>
        </View>
      </Modal>

      {/* Recipe Detail Modal */}
      {selectedRecipe && (
        <RecipeDetailModal
          visible={!!selectedRecipe}
          recipe={selectedRecipe}
          onClose={() => setSelectedRecipe(null)}
          onUpdate={async (updatedRecipe) => {
            try {
              // If it's an AI recommendation (temporary ID), save as new
              if (updatedRecipe.id?.startsWith('ai-rec-')) {
                await RecipeService.saveRecipe(updatedRecipe);
                showAlert(
                  'Recipe Saved! 📖',
                  'Added to your recipe collection',
                  undefined,
                  {
                    icon: <TickCircle size={32} color="#10B981" variant="Bold" />,
                  }
                );
              } else {
                // Otherwise update existing
                await RecipeService.updateRecipe(updatedRecipe);
                showAlert(
                  'Recipe Updated',
                  'Your changes have been saved',
                  undefined,
                  {
                    icon: <TickCircle size={32} color="#10B981" variant="Bold" />,
                  }
                );
              }
            } catch (error: any) {
              showAlert(
                'Error',
                error.message || 'Failed to save recipe',
                undefined,
                {
                  icon: <Danger size={32} color="#EF4444" variant="Bold" />,
                  type: 'destructive',
                }
              );
            }
          }}
          onDelete={() => {
            setSelectedRecipe(null);
          }}
          onShare={(recipe) => {
            console.log('Share:', recipe.title);
          }}
        />
      )}
    </Container>
  );
}
