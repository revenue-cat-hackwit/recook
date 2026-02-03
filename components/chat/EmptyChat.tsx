import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface EmptyChatProps {
  onSuggestionPress?: (text: string) => void;
}

export const EmptyChat: React.FC<EmptyChatProps> = ({ onSuggestionPress }) => {
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

      {/* Quick Action Suggestions */}
      <View className="gap-2">
        <Text className="mb-2 font-visby-bold text-xs text-gray-500">QUICK ACTIONS</Text>

        <TouchableOpacity
          onPress={() => onSuggestionPress?.('What recipes can I make with my pantry ingredients?')}
          className="flex-row items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 active:bg-gray-50"
        >
          <View className="h-10 w-10 items-center justify-center rounded-full bg-purple-100">
            <Ionicons name="restaurant" size={20} color="#9333EA" />
          </View>
          <View className="flex-1">
            <Text className="font-visby-bold text-sm text-gray-900">Recipe from Pantry</Text>
            <Text className="font-visby text-xs text-gray-500">Use ingredients you have</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => onSuggestionPress?.("What should I buy for this week's meals?")}
          className="flex-row items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 active:bg-gray-50"
        >
          <View className="h-10 w-10 items-center justify-center rounded-full bg-blue-100">
            <Ionicons name="cart" size={20} color="#3B82F6" />
          </View>
          <View className="flex-1">
            <Text className="font-visby-bold text-sm text-gray-900">Shopping List Help</Text>
            <Text className="font-visby text-xs text-gray-500">Get meal planning suggestions</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => onSuggestionPress?.('What ingredients are expiring soon in my pantry?')}
          className="flex-row items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 active:bg-gray-50"
        >
          <View className="h-10 w-10 items-center justify-center rounded-full bg-orange-100">
            <Ionicons name="warning" size={20} color="#F97316" />
          </View>
          <View className="flex-1">
            <Text className="font-visby-bold text-sm text-gray-900">Expiring Ingredients</Text>
            <Text className="font-visby text-xs text-gray-500">Don&apos;t waste food!</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => onSuggestionPress?.('Suggest me a healthy meal plan for today')}
          className="flex-row items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 active:bg-gray-50"
        >
          <View className="h-10 w-10 items-center justify-center rounded-full bg-green-100">
            <Ionicons name="fitness" size={20} color="#10B981" />
          </View>
          <View className="flex-1">
            <Text className="font-visby-bold text-sm text-gray-900">Healthy Meal Plan</Text>
            <Text className="font-visby text-xs text-gray-500">Personalized suggestions</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => onSuggestionPress?.("What's on my meal plan this week?")}
          className="flex-row items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 active:bg-gray-50"
        >
          <View className="h-10 w-10 items-center justify-center rounded-full bg-pink-100">
            <Ionicons name="calendar" size={20} color="#EC4899" />
          </View>
          <View className="flex-1">
            <Text className="font-visby-bold text-sm text-gray-900">This Week&apos;s Meals</Text>
            <Text className="font-visby text-xs text-gray-500">View your meal schedule</Text>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
};
