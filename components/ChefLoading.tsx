import React from 'react';
import { View, Text, ActivityIndicator } from 'react-native';

export const ChefLoading = ({ status }: { status: string }) => {
  return (
    <View className="flex-1 items-center justify-center bg-white px-4 py-8">
      <ActivityIndicator size="large" color="#8BD65E" />
      <Text className="mt-4 text-center font-visby-bold text-base text-gray-900">
        {status || 'Generating recipe...'}
      </Text>
      <Text className="mt-2 text-center font-visby text-sm text-gray-500">
        Chef is thinking... 🤔
      </Text>
    </View>
  );
};
