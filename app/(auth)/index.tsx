import AuthOutlineButton from '@/components/auth/AuthOutlineButton';
import AuthPrimaryButton from '@/components/auth/AuthPrimaryButton';
import OnBoardingCarousel from '@/components/OnBoardingCarousel';
import { router } from 'expo-router';
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Login, UserAdd, ArrowDown2 } from 'iconsax-react-native';

export default function OnBoardingPage() {
  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* AppBar */}
      <View className="flex-row items-center justify-between px-6 py-4">
        <Text className="font-visby-demibold text-2xl font-bold text-black">ReCook</Text>
        <TouchableOpacity className="flex-row items-center gap-2 rounded-full border border-black/15 px-4 py-2">
          <Text className="font-visby-medium text-sm text-black">EN</Text>
          <ArrowDown2 size={16} color="#000000" variant="Linear" />
        </TouchableOpacity>
      </View>

      <View className="flex-1 justify-end px-6 pb-5">
        {/* Onboarding Carousel */}
        <OnBoardingCarousel />

        {/* Action buttons */}
        <View className="mt-5 gap-3">
          <AuthPrimaryButton
            title="Login"
            onPress={() => router.push('/sign-in')}
            icon={<Login size={20} color="#FFFFFF" variant="Bold" />}
          />
          <AuthOutlineButton
            title="Create Account"
            onPress={() => router.push('/sign-up')}
            icon={<UserAdd size={20} color="#8BD65E" variant="Bold" />}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}
