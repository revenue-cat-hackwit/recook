import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export const EmptyChat = () => {
  return (
    <View className="flex-1 px-4 pt-4">
      {/* Welcome Info Card */}
      <View className="mb-4 flex-row items-start gap-3 rounded-2xl border-2 border-[#8BD65E] bg-white p-4">
        <View className="mt-0.5 h-6 w-6 items-center justify-center rounded-full bg-[#8BD65E]">
          <Ionicons name="information" size={16} color="white" />
        </View>
        <Text className="flex-1 font-visby text-sm leading-5 text-gray-700">
          Cooki is your assistant while in the RECOOK application
        </Text>
      </View>

      {/* Today Divider */}
      <View className="mb-4 flex-row items-center gap-3">
        <View className="h-[1px] flex-1 bg-gray-200" />
        <View className="rounded-full bg-gray-200 px-4 py-1.5">
          <Text className="font-visby text-xs text-gray-500">Today</Text>
        </View>
        <View className="h-[1px] flex-1 bg-gray-200" />
      </View>
    </View>
  );
};
