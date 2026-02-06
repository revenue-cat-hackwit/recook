import React from 'react';
import { View, Text, ActivityIndicator, Modal } from 'react-native';

interface LoadingModalProps {
  visible: boolean;
  message?: string;
  subMessage?: string;
}

export const LoadingModal = ({ 
  visible, 
  message = "Loading...", 
  subMessage = "This may take a few seconds" 
}: LoadingModalProps) => {
  return (
    <Modal
      transparent
      animationType="fade"
      visible={visible}
      statusBarTranslucent
    >
      <View className="flex-1 items-center justify-center bg-black/50">
        <View className="w-64 rounded-3xl bg-white p-8 shadow-2xl dark:bg-gray-800">
          <ActivityIndicator size="large" color="#8BD65E" />
          <Text className="mt-4 text-center font-visby-bold text-lg text-gray-800 dark:text-white">
            {message}
          </Text>
          <Text className="mt-2 text-center font-visby text-sm text-gray-500 dark:text-gray-400">
            {subMessage}
          </Text>
        </View>
      </View>
    </Modal>
  );
};
