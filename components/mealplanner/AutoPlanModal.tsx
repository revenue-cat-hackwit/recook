import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'nativewind';

interface AutoPlanModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (preferences: AutoPlanPreferences) => void;
  isLoading: boolean;
  initialPreferences?: Partial<AutoPlanPreferences>;
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
  initialPreferences,
}) => {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [goal, setGoal] = useState('Healthy Balanced');
  const [dietType, setDietType] = useState('No Restrictions');
  const [allergies, setAllergies] = useState('');
  const [calories, setCalories] = useState('2000');

  // Update state when initialPreferences changes
  useEffect(() => {
    if (initialPreferences) {
      if (initialPreferences.goal) setGoal(initialPreferences.goal);
      if (initialPreferences.dietType) setDietType(initialPreferences.dietType);
      if (initialPreferences.allergies) setAllergies(initialPreferences.allergies);
      if (initialPreferences.calories) setCalories(initialPreferences.calories);
    }
  }, [initialPreferences, visible]); // Also run when modal becomes visible

  const goals = [
    { id: 'lose_weight', label: 'Weight Loss', desc: 'Calorie deficit, high protein' },
    { id: 'maintain', label: 'Healthy Balanced', desc: 'Nutrient rich, sustainable' },
    { id: 'gain_muscle', label: 'Build Muscle', desc: 'High calorie, high protein' },
  ];

  const diets = ['No Restrictions', 'Vegetarian', 'Vegan', 'Keto', 'Paleo', 'Low Carb', 'Halal'];

  const handleSubmit = () => {
    onSubmit({
      goal: goals.find((g) => g.id === goal)?.label || goal,
      dietType,
      allergies,
      calories,
    });
  };

  return (
    <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/50">
        <View className="h-[85%] rounded-t-3xl bg-white dark:bg-[#1A1A1A]">
          {isLoading ? (
            <View className="flex-1 items-center justify-center p-8">
              <View className="mb-6 h-24 w-24 items-center justify-center rounded-full bg-green-50 dark:bg-green-900/20">
                <ActivityIndicator size="large" color="#8BD65E" />
              </View>
              <Text className="text-center font-visby-bold text-2xl text-gray-900 dark:text-white">
                Planning your week...
              </Text>
              <Text className="mt-4 text-center font-visby text-base text-gray-500 dark:text-gray-400">
                Our AI Chef is crafting your personalized 7-day meal plan based on your preferences.
              </Text>
              <View className="mt-8 rounded-xl bg-gray-50 px-4 py-3 dark:bg-gray-800">
                <Text className="text-center font-visby text-xs text-gray-400 dark:text-gray-500">
                  Please wait while we arrange your meals...
                </Text>
              </View>
            </View>
          ) : (
            <>
              {/* Header */}
              <View className="flex-row items-center justify-between border-b border-gray-100 px-6 py-4 dark:border-gray-800">
                <Text className="font-visby-bold text-xl text-gray-900 dark:text-white">
                  Plan Your Week
                </Text>
                <TouchableOpacity
                  onPress={onClose}
                  disabled={isLoading}
                  className="rounded-full bg-gray-100 p-2 dark:bg-gray-800"
                >
                  <Ionicons name="close" size={20} color={isDark ? 'white' : 'black'} />
                </TouchableOpacity>
              </View>

              <ScrollView
                className="flex-1 px-6 pt-2"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 100 }}
              >
                <Text className="mb-6 mt-4 font-visby text-gray-500 dark:text-gray-400">
                  Tell us your goals, and our AI Chef will craft a personalized 7-day meal plan for
                  you.
                </Text>

                {/* GOAL SECTION */}
                <Text className="mb-3 font-visby-bold text-sm text-gray-900 dark:text-white">
                  YOUR GOAL
                </Text>
                <View className="mb-6 gap-3">
                  {goals.map((item) => {
                    const isSelected = goal === item.id || goal === item.label; // Handle both id and label matching
                    return (
                      <TouchableOpacity
                        key={item.id}
                        onPress={() => setGoal(item.id)}
                        className={`flex-row items-center rounded-xl border p-4 ${isSelected ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20' : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800'}`}
                      >
                        <View
                          className={`mr-3 h-5 w-5 items-center justify-center rounded-full border ${isSelected ? 'border-orange-500' : 'border-gray-400'}`}
                        >
                          {isSelected && (
                            <View className="h-2.5 w-2.5 rounded-full bg-orange-500" />
                          )}
                        </View>
                        <View>
                          <Text className="font-visby-bold text-gray-900 dark:text-white">
                            {item.label}
                          </Text>
                          <Text className="font-visby text-xs text-gray-500">{item.desc}</Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* DIET TYPE */}
                <Text className="mb-3 font-visby-bold text-sm text-gray-900 dark:text-white">
                  DIET PREFERENCE
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  className="mb-6 flex-row"
                >
                  {diets.map((diet) => {
                    const isSelected = dietType === diet;
                    return (
                      <TouchableOpacity
                        key={diet}
                        onPress={() => setDietType(diet)}
                        className={`mr-2 rounded-full border px-4 py-2 ${isSelected ? 'border-black bg-black dark:border-white dark:bg-white' : 'border-gray-300 dark:border-gray-600'}`}
                      >
                        <Text
                          className={`font-visby-bold ${isSelected ? 'text-white dark:text-black' : 'text-gray-700 dark:text-gray-300'}`}
                        >
                          {diet}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                {/* CALORIES */}
                <Text className="mb-3 font-visby-bold text-sm text-gray-900 dark:text-white">
                  DAILY CALORIES (Approx)
                </Text>
                <View className="mb-6 flex-row items-center rounded-xl border border-gray-200 bg-gray-50 px-4 dark:border-gray-700 dark:bg-gray-800">
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
                <Text className="mb-3 font-visby-bold text-sm text-gray-900 dark:text-white">
                  ALLERGIES / RESTRICTIONS (Optional)
                </Text>
                <TextInput
                  value={allergies}
                  onChangeText={setAllergies}
                  placeholder="e.g. Peanuts, Shellfish, Gluten..."
                  placeholderTextColor="#9CA3AF"
                  className="mb-10 rounded-xl border border-gray-200 bg-gray-50 p-4 font-visby text-base text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
              </ScrollView>

              {/* Footer */}
              <View className="border-t border-gray-100 p-6 dark:border-gray-800">
                <TouchableOpacity
                  onPress={handleSubmit}
                  disabled={isLoading}
                  className={`nav-button-primary w-full flex-row items-center justify-center rounded-full bg-[#8BD65E] py-4 shadow-lg shadow-green-200 dark:shadow-none ${isLoading ? 'opacity-80' : ''}`}
                >
                  <Ionicons name="calendar-outline" size={20} color="white" />
                  <Text className="ml-2 font-visby-bold text-lg text-white">Generate Plan</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
};
