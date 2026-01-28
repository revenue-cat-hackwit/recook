import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export const EmptyChat = () => {
  return (
    <View className="flex-1 items-center justify-center px-8">
      <View className="mb-4 h-20 w-20 items-center justify-center rounded-full bg-red-50">
        <Ionicons name="chatbubbles-outline" size={40} color="#CC5544" />
      </View>
      <Text className="font-visby-demibold mb-2 text-center text-xl text-gray-800">
        Halo, Chef! 👨‍🍳
      </Text>
      <Text className="text-center font-visby text-sm leading-5 text-gray-500">
        Tanya saya tentang resep, bahan masakan, atau tips memasak. Saya siap membantu!
      </Text>

      <View className="mt-8 w-full">
        <Text className="mb-3 font-visby-medium text-xs text-gray-400">COBA TANYA:</Text>
        <View className="gap-2">
          <View className="rounded-xl bg-gray-50 px-4 py-3">
            <Text className="font-visby text-sm text-gray-600">Resep nasi goreng sederhana</Text>
          </View>
          <View className="rounded-xl bg-gray-50 px-4 py-3">
            <Text className="font-visby text-sm text-gray-600">
              Apa yang bisa dimasak dari telur dan sayur?
            </Text>
          </View>
          <View className="rounded-xl bg-gray-50 px-4 py-3">
            <Text className="font-visby text-sm text-gray-600">
              Tips menggoreng ayam agar crispy
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
};
