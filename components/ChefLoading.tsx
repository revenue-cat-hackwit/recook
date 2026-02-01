import React, { useState, useEffect } from 'react';
import { View, Text } from 'react-native';

const CHEF_TIPS = [
  '💡 Tips: Soak onions in ice water to prevent eye irritation.',
  '💡 Tips: Add salt when boiling pasta for better texture.',
  '💡 Tips: Store tomatoes at room temperature for fresh taste.',
  '💡 Tips: Let steak reach room temperature before grilling.',
  '💡 Tips: Use ice water for crispy batter.',
  '💡 Tips: Squeeze lime juice to keep rice fresh longer.',
  'Chef is thinking... 🤔',
  'Checking your ingredients... 🥕',
  'Creating magic sauce... ✨',
];

export const ChefLoading = ({ status }: { status: string }) => {
  const [tipIndex, setTipIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % CHEF_TIPS.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <View className="absolute inset-0 z-50 flex-1 items-center justify-center bg-white/95">
      <View className="w-[85%] items-center rounded-3xl border border-gray-100 bg-white p-8 shadow-2xl">
        <View className="relative mb-6">
          <View className="absolute inset-0 animate-ping rounded-full bg-green-100 opacity-20" />
          <View className="h-24 w-24 items-center justify-center rounded-full border-4 border-green-100 bg-green-50">
            <Text className="text-5xl">👨‍🍳</Text>
          </View>
        </View>
        <Text className="mb-2 text-center font-visby-bold text-xl text-gray-900">
          {status || 'Chef Bot is Cooking...'}
        </Text>
        <Text className="min-h-[50px] px-2 text-center font-visby text-sm leading-5 text-gray-500">
          {CHEF_TIPS[tipIndex]}
        </Text>
      </View>
    </View>
  );
};
