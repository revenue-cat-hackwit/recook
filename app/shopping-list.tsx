import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, FlatList, Alert, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useShoppingListStore } from '@/lib/store/shoppingListStore';
import { ShoppingItem } from '@/lib/types';
import { PantryService, PantryItem } from '@/lib/services/pantryService';
import * as Haptics from 'expo-haptics';
import { CustomAlertModal } from '@/components/CustomAlertModal';
import { showAlert } from '@/lib/utils/globalAlert';
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
  const [selectedRecipe, setSelectedRecipe] = useState<string | null>(null); // Filter state
  const [pantryItems, setPantryItems] = useState<PantryItem[]>([]);

  // Edit State
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [itemToEdit, setItemToEdit] = useState<ShoppingItem | null>(null);

  // Sorting & Filtering
  const sortedItems = React.useMemo(() => {
    // Filter by recipe if selected
    let filtered = items;
    if (selectedRecipe) {
      filtered = items.filter((i) => i.fromRecipe === selectedRecipe);
    }

    // Sort by: Unchecked first, then Checked
    const unchecked = filtered.filter((i) => !i.isChecked);
    const checked = filtered.filter((i) => i.isChecked);
    return [...unchecked, ...checked];
  }, [items, selectedRecipe]);

  // Get unique recipes for filter
  const recipeList = React.useMemo(() => {
    const recipes = new Set<string>();
    items.forEach((item) => {
      if (item.fromRecipe) recipes.add(item.fromRecipe);
    });
    return Array.from(recipes).sort();
  }, [items]);

  useEffect(() => {
    // Sync on load
    sync();
    loadPantryItems();
  }, []);

  const loadPantryItems = async () => {
    try {
      const items = await PantryService.getPantryItems();
      setPantryItems(items);
    } catch (error) {
      console.error('Failed to load pantry:', error);
    }
  };

  // Normalize units to base unit (g for weight, ml for volume)
  const normalizeToBaseUnit = (
    quantity: number | string,
    unit: string,
  ): { value: number; baseUnit: string } | null => {
    const qty = typeof quantity === 'number' ? quantity : parseFloat(String(quantity)) || 0;
    const unitLower = unit.toLowerCase().trim();

    // Weight conversions
    const weightUnits: { [key: string]: number } = {
      kg: 1000,
      kilogram: 1000,
      g: 1,
      gram: 1,
      mg: 0.001,
      milligram: 0.001,
      lb: 453.592,
      pound: 453.592,
      oz: 28.3495,
      ounce: 28.3495,
    };

    // Volume conversions
    const volumeUnits: { [key: string]: number } = {
      l: 1000,
      liter: 1000,
      litre: 1000,
      ml: 1,
      milliliter: 1,
      millilitre: 1,
      cup: 240,
      tbsp: 15,
      tablespoon: 15,
      tsp: 5,
      teaspoon: 5,
      gallon: 3785.41,
      quart: 946.353,
      pint: 473.176,
      'fl oz': 29.5735,
    };

    if (weightUnits[unitLower]) {
      return { value: qty * weightUnits[unitLower], baseUnit: 'g' };
    }

    if (volumeUnits[unitLower]) {
      return { value: qty * volumeUnits[unitLower], baseUnit: 'ml' };
    }

    // If no conversion found, return as is
    return { value: qty, baseUnit: unitLower };
  };

  // Check if item is in pantry with quantity comparison
  const checkPantryStatus = (
    itemName: string,
    neededQty?: number | string,
    unit?: string,
  ): {
    inPantry: boolean;
    pantryQty?: string;
    hasEnough: boolean;
  } => {
    if (pantryItems.length === 0) return { inPantry: false, hasEnough: false };

    const lowerItemName = itemName.toLowerCase().trim();
    const matchedItem = pantryItems.find((pantryItem) => {
      const pantryName = pantryItem.ingredient_name?.toLowerCase().trim() || '';
      return pantryName.includes(lowerItemName) || lowerItemName.includes(pantryName);
    });

    if (!matchedItem) return { inPantry: false, hasEnough: false };

    // If we have quantity info, compare with unit conversion
    if (neededQty && unit && matchedItem.quantity) {
      const needed = typeof neededQty === 'number' ? neededQty : parseFloat(String(neededQty)) || 0;

      // Extract unit from pantry quantity string (e.g., "500g" -> 500, "g")
      const pantryQtyStr = matchedItem.quantity;
      const pantryMatch = pantryQtyStr.match(/^([\d.]+)\s*([a-zA-Z]+)?$/);

      if (pantryMatch) {
        const pantryQty = parseFloat(pantryMatch[1]);
        const pantryUnit = pantryMatch[2] || unit; // Use shopping list unit if no unit in pantry

        // Normalize both to base units
        const normalizedNeeded = normalizeToBaseUnit(needed, unit);
        const normalizedAvailable = normalizeToBaseUnit(pantryQty, pantryUnit);

        // Only compare if same base unit (g vs g, ml vs ml)
        if (
          normalizedNeeded &&
          normalizedAvailable &&
          normalizedNeeded.baseUnit === normalizedAvailable.baseUnit
        ) {
          return {
            inPantry: true,
            pantryQty: matchedItem.quantity,
            hasEnough: normalizedAvailable.value >= normalizedNeeded.value,
          };
        }
      }
    }

    // If no quantity info or cannot compare, just mark as in pantry
    return { inPantry: true, pantryQty: matchedItem.quantity, hasEnough: true };
  };

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

    // Check if item exists in pantry
    const pantryStatus = checkPantryStatus(
      newItemName.trim(),
      newItemQty ? parseFloat(newItemQty) : undefined,
      newItemUnit.trim() || undefined,
    );

    // Show warning if item is in pantry with enough quantity
    if (pantryStatus.inPantry && pantryStatus.hasEnough) {
      showAlert(
        'Already in Pantry',
        `You have ${pantryStatus.pantryQty} of "${newItemName.trim()}" in your pantry. Do you still want to add it to the shopping list?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Add Anyway',
            onPress: async () => {
              await addItem(
                newItemName.trim(),
                undefined,
                newItemQty ? parseFloat(newItemQty) : undefined,
                newItemUnit.trim() || undefined,
              );
              setNewItemName('');
              setNewItemQty('');
              setNewItemUnit('');
            },
          },
        ],
      );
      return;
    }

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

  const renderItem = ({ item }: { item: ShoppingItem }) => {
    const pantryStatus = checkPantryStatus(item.name, item.quantity, item.unit);

    return (
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
            <View className="flex-row items-center gap-2">
              <Text
                className={`flex-1 font-visby text-base ${
                  item.isChecked ? 'text-gray-400 line-through' : 'text-gray-900'
                }`}
                numberOfLines={2}
              >
                {item.name}
              </Text>
              {pantryStatus.inPantry && (
                <View
                  className={`rounded-full px-2 py-0.5 ${
                    pantryStatus.hasEnough ? 'bg-green-100' : 'bg-orange-100'
                  }`}
                >
                  <Text
                    className={`font-visby-bold text-[10px] ${
                      pantryStatus.hasEnough ? 'text-green-700' : 'text-orange-700'
                    }`}
                  >
                    {pantryStatus.hasEnough
                      ? '✓ Have It'
                      : `${pantryStatus.pantryQty || '?'} in stock`}
                  </Text>
                </View>
              )}
            </View>
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
  };

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

      {/* Recipe Filter Chips */}
      {recipeList.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="border-b border-gray-100 bg-white px-4 py-3"
          contentContainerStyle={{ gap: 8 }}
        >
          {/* All Items Chip */}
          <TouchableOpacity
            onPress={() => setSelectedRecipe(null)}
            className={`rounded-full px-4 py-2 ${
              selectedRecipe === null ? 'bg-[#8BD65E]' : 'border border-gray-200 bg-gray-50'
            }`}
          >
            <Text
              className={`font-visby-bold text-xs ${
                selectedRecipe === null ? 'text-white' : 'text-gray-600'
              }`}
            >
              All ({items.length})
            </Text>
          </TouchableOpacity>

          {/* Recipe Filter Chips */}
          {recipeList.map((recipeName) => {
            const count = items.filter((i) => i.fromRecipe === recipeName).length;
            return (
              <TouchableOpacity
                key={recipeName}
                onPress={() => setSelectedRecipe(recipeName)}
                className={`rounded-full px-4 py-2 ${
                  selectedRecipe === recipeName
                    ? 'bg-[#8BD65E]'
                    : 'border border-gray-200 bg-gray-50'
                }`}
              >
                <Text
                  className={`font-visby-bold text-xs ${
                    selectedRecipe === recipeName ? 'text-white' : 'text-gray-600'
                  }`}
                  numberOfLines={1}
                >
                  {recipeName} ({count})
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* List Header */}
      {items.length > 0 && (
        <>
          <View className="flex-row items-center border-b border-gray-200 bg-gray-50 px-4 py-2">
            <View className="w-8" />
            <Text className="flex-[3] font-visby-bold text-xs text-gray-500">ITEM</Text>
            <Text className="flex-1 text-center font-visby-bold text-xs text-gray-500">QTY</Text>
            <Text className="flex-1 text-center font-visby-bold text-xs text-gray-500">UNIT</Text>
            <View className="w-8" />
          </View>

          {/* Pantry Summary */}
          {(() => {
            const itemsWithPantryCheck = sortedItems.map((item) => ({
              ...item,
              status: checkPantryStatus(item.name, item.quantity, item.unit),
            }));
            const haveEnough = itemsWithPantryCheck.filter((i) => i.status.hasEnough).length;
            const needMore = itemsWithPantryCheck.filter(
              (i) => i.status.inPantry && !i.status.hasEnough,
            ).length;

            return haveEnough > 0 || needMore > 0 ? (
              <View className="border-b border-gray-200 bg-gradient-to-r from-green-50 to-orange-50 px-4 py-2.5">
                <View className="flex-row items-center justify-between">
                  {haveEnough > 0 && (
                    <Text className="font-visby text-xs text-green-700">
                      ✓ {haveEnough} item{haveEnough > 1 ? 's' : ''} available
                    </Text>
                  )}
                  {needMore > 0 && (
                    <Text className="font-visby text-xs text-orange-700">
                      ⚠ {needMore} need more stock
                    </Text>
                  )}
                </View>
              </View>
            ) : null;
          })()}
        </>
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
      ) : sortedItems.length === 0 ? (
        <View className="flex-1 items-center justify-center px-10">
          <View className="mb-6 h-24 w-24 items-center justify-center rounded-full bg-gray-100">
            <Ionicons name="funnel-outline" size={40} color="#9CA3AF" />
          </View>
          <Text className="mb-2 font-visby-bold text-xl text-gray-900">No Items Found</Text>
          <Text className="text-center font-visby text-gray-500">
            No ingredients from &quot;{selectedRecipe}&quot;. Try selecting a different recipe.
          </Text>
          <TouchableOpacity
            onPress={() => setSelectedRecipe(null)}
            className="mt-8 rounded-full bg-[#8BD65E] px-8 py-3"
          >
            <Text className="font-visby-bold text-white">Show All Items</Text>
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
