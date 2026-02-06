import React from 'react';
import { TouchableOpacity, Text, View } from 'react-native';
import { Diamonds, TickCircle } from 'iconsax-react-native';
import RevenueCatUI from 'react-native-purchases-ui';
import { useSubscriptionStore } from '@/lib/store/subscriptionStore';

interface ProButtonProps {
  onPress?: () => void;
}

export const ProButton: React.FC<ProButtonProps> = ({ onPress }) => {
  // Use global store state directly (already persisted)
  const { isPro, initialize } = useSubscriptionStore();

  const handlePress = async () => {
    try {
      if (onPress) {
        onPress();
        return;
      }

      const paywallResult = await RevenueCatUI.presentPaywall();
      if (
        paywallResult === RevenueCatUI.PAYWALL_RESULT.PURCHASED ||
        paywallResult === RevenueCatUI.PAYWALL_RESULT.RESTORED
      ) {
        await initialize(); // Refresh global state if purchase happens
      }
    } catch (error) {
      console.error('Error in ProButton handlePress:', error);
    }
  };

  if (isPro) {
    return (
      <View className="flex-row items-center gap-1.5 rounded-full bg-[#8BD65E] px-4 py-2">
        <TickCircle size={16} color="white" variant="Bold" />
        <Text className="font-visby-bold text-sm text-white">Pro</Text>
      </View>
    );
  }

  return (
    <TouchableOpacity
      onPress={handlePress}
      className="flex-row items-center gap-1.5 rounded-full bg-gray-100 border border-gray-200 px-4 py-2" // White-ish/Light styling
      activeOpacity={0.8}
    >
      <Diamonds size={16} color="#8BD65E" variant="Bold" />
      <Text className="font-visby-bold text-sm text-[#8BD65E]">Pro</Text>
    </TouchableOpacity>
  );
};

export default ProButton;
