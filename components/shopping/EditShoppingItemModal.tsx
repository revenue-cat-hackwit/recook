import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  TouchableWithoutFeedback,
  Keyboard,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ShoppingItem } from '@/lib/types';
import { useColorScheme } from 'nativewind';

interface EditShoppingItemModalProps {
  item: ShoppingItem | null;
  visible: boolean;
  onClose: () => void;
  onUpdate: (id: string, updates: Partial<ShoppingItem>) => void;
}

export const EditShoppingItemModal: React.FC<EditShoppingItemModalProps> = ({
  item,
  visible,
  onClose,
  onUpdate,
}) => {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [name, setName] = useState(item?.name || '');
  const [quantity, setQuantity] = useState(item?.quantity?.toString() || '');
  const [unit, setUnit] = useState(item?.unit || '');

  // Reset state when item changes
  React.useEffect(() => {
    if (item) {
      setName(item.name);
      setQuantity(item.quantity?.toString() || '');
      setUnit(item.unit || '');
    }
  }, [item]);

  const handleSave = () => {
    if (!item) return;

    const qty = quantity ? parseFloat(quantity) : undefined;
    onUpdate(item.id, {
      name,
      quantity: isNaN(qty!) ? undefined : qty,
      unit: unit || undefined,
    });
    onClose();
  };

  if (!item) return null;

  return (
    <Modal animationType="fade" transparent={true} visible={visible} onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View className="flex-1 justify-center bg-black/50 px-6">
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
              <View className="rounded-3xl bg-white p-6 shadow-xl dark:bg-[#1A1A1A]">
                <View className="mb-4 flex-row items-center justify-between">
                  <Text className="font-visby-bold text-xl text-gray-900 dark:text-white">
                    Edit Item
                  </Text>
                  <TouchableOpacity
                    onPress={onClose}
                    className="rounded-full bg-gray-100 p-2 dark:bg-gray-800"
                  >
                    <Ionicons name="close" size={20} color={isDark ? 'white' : 'black'} />
                  </TouchableOpacity>
                </View>

                {/* Name Input */}
                <Text className="mb-2 font-visby-bold text-xs text-gray-500">ITEM NAME</Text>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  className="mb-4 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 font-visby text-base text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  placeholder="Item name"
                  placeholderTextColor="#9CA3AF"
                />

                <View className="flex-row gap-4">
                  {/* Quantity Input */}
                  <View className="flex-1">
                    <Text className="mb-2 font-visby-bold text-xs text-gray-500">QUANTITY</Text>
                    <TextInput
                      value={quantity}
                      onChangeText={setQuantity}
                      keyboardType="numeric"
                      className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 font-visby text-base text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                      placeholder="0"
                      placeholderTextColor="#9CA3AF"
                    />
                  </View>

                  {/* Unit Input */}
                  <View className="flex-1">
                    <Text className="mb-2 font-visby-bold text-xs text-gray-500">UNIT</Text>
                    <TextInput
                      value={unit}
                      onChangeText={setUnit}
                      className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 font-visby text-base text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                      placeholder="kg, pcs..."
                      placeholderTextColor="#9CA3AF"
                      autoCapitalize="none"
                    />
                  </View>
                </View>

                {/* Save Button */}
                <TouchableOpacity
                  onPress={handleSave}
                  disabled={!name.trim()}
                  className={`mt-6 items-center rounded-xl bg-[#8BD65E] py-4 ${!name.trim() ? 'opacity-50' : ''}`}
                >
                  <Text className="font-visby-bold text-white">Save Changes</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};
