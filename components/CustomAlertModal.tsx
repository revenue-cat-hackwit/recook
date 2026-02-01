import React from 'react';
import { View, Text, Modal, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'nativewind';

interface CustomAlertModalProps {
  visible: boolean;
  title: string;
  message: string;
  onClose: () => void;
  onConfirm: () => void;
  confirmText?: string;
  cancelText?: string;
  type?: 'default' | 'destructive';
  icon?: keyof typeof Ionicons.glyphMap;
}

export const CustomAlertModal: React.FC<CustomAlertModalProps> = ({
  visible,
  title,
  message,
  onClose,
  onConfirm,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'default',
  icon = 'alert-circle',
}) => {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <Modal animationType="fade" transparent={true} visible={visible} onRequestClose={onClose}>
      <View className="flex-1 items-center justify-center bg-black/50 px-6">
        <View className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl dark:bg-[#1E1F20]">
          {/* Icon */}
          <View
            className={`mx-auto mb-4 h-16 w-16 items-center justify-center rounded-full ${
              type === 'destructive'
                ? 'bg-red-50 dark:bg-red-900/20'
                : 'bg-gray-50 dark:bg-gray-800'
            }`}
          >
            <Ionicons
              name={icon}
              size={32}
              color={type === 'destructive' ? '#EF4444' : isDark ? 'white' : 'black'}
            />
          </View>

          {/* Text */}
          <Text className="mb-2 text-center font-visby-bold text-xl text-gray-900 dark:text-white">
            {title}
          </Text>
          <Text className="mb-8 text-center font-visby text-base leading-6 text-gray-500 dark:text-gray-400">
            {message}
          </Text>

          {/* Buttons */}
          <View className="flex-row gap-3">
            <TouchableOpacity
              onPress={onClose}
              className="flex-1 items-center justify-center rounded-xl border border-gray-200 bg-white py-3.5 active:bg-gray-50 dark:border-gray-700 dark:bg-transparent"
            >
              <Text className="font-visby-bold text-gray-700 dark:text-gray-300">{cancelText}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                onConfirm();
                onClose();
              }}
              className={`flex-1 items-center justify-center rounded-xl py-3.5 ${
                type === 'destructive' ? 'bg-[#EF4444]' : 'bg-[#8BD65E]'
              }`}
            >
              <Text className="font-visby-bold text-white">{confirmText}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};
