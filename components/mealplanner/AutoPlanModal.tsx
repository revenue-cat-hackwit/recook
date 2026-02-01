import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, TextInput, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'nativewind';

interface AutoPlanModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (preferences: AutoPlanPreferences) => void;
  isLoading: boolean;
}

export interface AutoPlanPreferences {
  goal: string;
  dietType: string;
  allergies: string;
  calories: string;
}

export const AutoPlanModal: React.FC<AutoPlanModalProps> = ({
  visible,
  onClose,
  onSubmit,
  isLoading,
}) => {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [goal, setGoal] = useState('Healthy Balanced');
  const [dietType, setDietType] = useState('No Restrictions');
  const [allergies, setAllergies] = useState('');
  const [calories, setCalories] = useState('2000');

  const goals = [
    { id: 'lose_weight', label: 'Weight Loss 📉', desc: 'Calorie deficit, high protein' },
    { id: 'maintain', label: 'Healthy Balanced ⚖️', desc: 'Nutrient rich, sustainable' },
    { id: 'gain_muscle', label: 'Build Muscle 💪', desc: 'High calorie, high protein' },
  ];

  const diets = [
    'No Restrictions',
    'Vegetarian',
    'Vegan',
    'Keto',
    'Paleo',
    'Low Carb',
    'Halal',
  ];

  const handleSubmit = () => {
    onSubmit({
      goal: goals.find(g => g.id === goal)?.label || goal,
      dietType,
      allergies,
      calories
    });
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/50 justify-end">
        <View className="bg-white dark:bg-[#1A1A1A] rounded-t-3xl h-[85%]">
            {/* Header */}
            <View className="flex-row items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
                <Text className="font-visby-bold text-xl text-gray-900 dark:text-white">Plan Your Week ✨</Text>
                <TouchableOpacity onPress={onClose} disabled={isLoading} className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full">
                    <Ionicons name="close" size={20} color={isDark ? "white" : "black"} />
                </TouchableOpacity>
            </View>

            <ScrollView className="flex-1 px-6 pt-2" showsVerticalScrollIndicator={false}>
                <Text className="mt-4 mb-6 font-visby text-gray-500 dark:text-gray-400">
                    Tell us your goals, and our AI Chef will craft a personalized 7-day meal plan for you.
                </Text>

                {/* GOAL SECTION */}
                <Text className="mb-3 font-visby-bold text-sm text-gray-900 dark:text-white">YOUR GOAL</Text>
                <View className="mb-6 gap-3">
                    {goals.map((item) => {
                        const isSelected = goal === item.id;
                        return (
                            <TouchableOpacity
                                key={item.id}
                                onPress={() => setGoal(item.id)}
                                className={`flex-row items-center p-4 rounded-xl border ${isSelected ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20' : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'}`}
                            >
                                <View className={`w-5 h-5 rounded-full border items-center justify-center mr-3 ${isSelected ? 'border-orange-500' : 'border-gray-400'}`}>
                                    {isSelected && <View className="w-2.5 h-2.5 rounded-full bg-orange-500" />}
                                </View>
                                <View>
                                    <Text className="font-visby-bold text-gray-900 dark:text-white">{item.label}</Text>
                                    <Text className="font-visby text-xs text-gray-500">{item.desc}</Text>
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {/* DIET TYPE */}
                <Text className="mb-3 font-visby-bold text-sm text-gray-900 dark:text-white">DIET PREFERENCE</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-6 flex-row">
                    {diets.map((diet) => {
                        const isSelected = dietType === diet;
                        return (
                             <TouchableOpacity
                                key={diet}
                                onPress={() => setDietType(diet)}
                                className={`mr-2 px-4 py-2 rounded-full border ${isSelected ? 'bg-black border-black dark:bg-white dark:border-white' : 'border-gray-300 dark:border-gray-600'}`}
                             >
                                <Text className={`font-visby-bold ${isSelected ? 'text-white dark:text-black' : 'text-gray-700 dark:text-gray-300'}`}>
                                    {diet}
                                </Text>
                             </TouchableOpacity>
                        );
                    })}
                </ScrollView>

                {/* CALORIES */}
                <Text className="mb-3 font-visby-bold text-sm text-gray-900 dark:text-white">DAILY CALORIES (Approx)</Text>
                <View className="mb-6 flex-row items-center bg-gray-50 dark:bg-gray-800 rounded-xl px-4 border border-gray-200 dark:border-gray-700">
                    <Ionicons name="flame-outline" size={20} color="#F97316" />
                    <TextInput 
                        value={calories}
                        onChangeText={setCalories}
                        keyboardType="numeric"
                        className="flex-1 p-4 font-visby-bold text-lg text-gray-900 dark:text-white"
                        placeholder="e.g. 2000"
                    />
                    <Text className="font-visby text-gray-500">kcal</Text>
                </View>

                {/* ALLERGIES */}
                 <Text className="mb-3 font-visby-bold text-sm text-gray-900 dark:text-white">ALLERGIES / RESTRICTIONS (Optional)</Text>
                 <TextInput 
                        value={allergies}
                        onChangeText={setAllergies}
                        placeholder="e.g. Peanuts, Shellfish, Gluten..."
                        placeholderTextColor="#9CA3AF"
                        className="mb-10 p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 font-visby text-base text-gray-900 dark:text-white"
                 />
            </ScrollView>

            {/* Footer */}
            <View className="p-6 border-t border-gray-100 dark:border-gray-800">
                <TouchableOpacity
                    onPress={handleSubmit}
                    disabled={isLoading}
                    className={`nav-button-primary bg-[#CC5544] w-full py-4 rounded-full items-center shadow-lg shadow-orange-200 dark:shadow-none flex-row justify-center ${isLoading ? 'opacity-80' : ''}`}
                >
                    {isLoading ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <>
                            <Ionicons name="sparkles" size={20} color="white" />
                            <Text className="ml-2 font-visby-bold text-white text-lg">Generate Plan</Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>
        </View>
      </View>
    </Modal>
  );
};
