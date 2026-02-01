import React from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import RevenueCatUI from 'react-native-purchases-ui';
import { useSubscriptionStore } from '@/lib/store/subscriptionStore';

export const SubscriptionCard = () => {
  const { isPro, initialize } = useSubscriptionStore();

  const handlePresentPaywall = async () => {
    try {
      const paywallResult = await RevenueCatUI.presentPaywall();

      // Check result status properly
      if (
        paywallResult === RevenueCatUI.PAYWALL_RESULT.PURCHASED ||
        paywallResult === RevenueCatUI.PAYWALL_RESULT.RESTORED
      ) {
        await initialize();
        Alert.alert('Success', 'Welcome to Pro! Plan upgraded.');
      }
    } catch (e) {
      console.error('Paywall Error:', e);
    }
  };

  const handleCustomerCenter = async () => {
    try {
      await RevenueCatUI.presentCustomerCenter();
    } catch (e) {
      console.error('Customer Center Error:', e);
    }
  };

  return (
    <View className="mb-8">
      <Text className="mb-4 font-visby-bold text-lg text-gray-900">Subscription</Text>

      <View
        className={`overflow-hidden rounded-3xl shadow-lg ${isPro ? 'bg-black' : 'border border-gray-100 bg-white'}`}
      >
        {isPro ? (
          // PRO USER UI
          <View className="relative p-6">
            {/* Background Accents - Simplified for stability */}
            <View className="absolute right-0 top-0 h-32 w-32 rounded-bl-full bg-yellow-500/20" />

            <View className="mb-6 flex-row items-start justify-between">
              <View>
                <View className="mb-1 flex-row items-center gap-2">
                  <Ionicons name="star" size={20} color="#EAB308" />
                  <Text className="font-visby-bold text-2xl text-white">Pro Plan</Text>
                </View>
                <Text className="font-visby text-gray-400">Unlimited Access Active</Text>
              </View>
              <View className="rounded-full border border-yellow-500/30 bg-yellow-500/20 px-3 py-1">
                <Text className="font-visby-bold text-xs text-yellow-400">ACTIVE</Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={handleCustomerCenter}
              className="w-full flex-row items-center justify-center rounded-xl border border-white/20 bg-white/10 py-3.5"
            >
              <Ionicons
                name="settings-outline"
                size={18}
                color="white"
                style={{ marginRight: 8 }}
              />
              <Text className="font-visby-bold text-white">Manage Subscription</Text>
            </TouchableOpacity>
          </View>
        ) : (
          // FREE USER UI
          <View className="p-5">
            <View className="mb-4 flex-row items-center justify-between">
              <View className="flex-row items-center gap-3">
                <View className="h-10 w-10 items-center justify-center rounded-full bg-gray-100">
                  <Ionicons name="person-outline" size={20} color="black" />
                </View>
                <View>
                  <Text className="font-visby-bold text-lg text-gray-900">Free Plan</Text>
                  <Text className="font-visby text-xs text-gray-500">3 free recipes per day</Text>
                </View>
              </View>
              <View className="rounded-full bg-gray-100 px-3 py-1">
                <Text className="font-visby-bold text-xs text-gray-500">CURRENT</Text>
              </View>
            </View>

            <TouchableOpacity onPress={handlePresentPaywall} className="w-full">
              <View className="flex-row items-center justify-between rounded-2xl bg-[#8BD65E] p-4 shadow-lg shadow-green-200">
                <View>
                  <Text className="font-visby-bold text-lg text-white">Upgrade to Pro</Text>
                  <Text className="font-visby text-xs text-white/80">
                    Unlock unlimited recipes & more
                  </Text>
                </View>
                <View className="h-10 w-10 items-center justify-center rounded-full bg-white/20">
                  <Ionicons name="arrow-forward" size={20} color="white" />
                </View>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleCustomerCenter}
              className="mt-4 flex-row items-center justify-center"
            >
              <Text className="font-visby text-xs text-gray-400">Already subscribed?</Text>
              <Text className="ml-1 font-visby-bold text-xs text-gray-600">Restore Purchases</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
};
