import React, { useCallback, useState } from 'react';
import { Image, type ImageSourcePropType, Text, useWindowDimensions, View } from 'react-native';
import Carousel from 'react-native-reanimated-carousel';

type IntroItem = {
  id: string;
  title: string;
  description: string;
  imageSource: ImageSourcePropType;
};

const AUTO_SLIDE_INTERVAL_MS = 3000;

const APP_INTRO_DATA: IntroItem[] = [
  {
    id: '1',
    title: 'Find Easy Recipes',
    description:
      'Discover the easiest way to turn social media food content into practical cooking guides.',
    imageSource: require('../assets/images/onboarding-1.png'),
  },
  {
    id: '2',
    title: 'Personalized Just for You',
    description:
      'Automatically adapt recipes to match your kitchen ingredients, dietary goals, and food restrictions.',
    imageSource: require('../assets/images/onboarding-2.png'),
  },
  {
    id: '3',
    title: 'Start now',
    description:
      'Come on, instantly turn your favorite culinary inspiration into real, easy meals with us right now.',
    imageSource: require('../assets/images/onboarding-3.png'),
  },
];

export default function OnBoardingCarousel() {
  const { width } = useWindowDimensions();
  const [activeIndex, setActiveIndex] = useState(0);

  const renderItem = useCallback(
    ({ item }: { item: IntroItem }) => {
      return (
        <View className="items-center justify-start px-12" style={{ width, flex: 1 }}>
          <Image source={item.imageSource} className="h-80 w-80" resizeMode="cover" />
          <Text className="font-visby-demibold text-xl font-semibold text-black">{item.title}</Text>
          <Text className="mt-3 text-center font-visby-medium text-sm font-medium text-gray-500">
            {item.description}
          </Text>
        </View>
      );
    },
    [width],
  );

  const handleProgressChange = useCallback(
    (_offsetProgress: number, absoluteProgress: number) => {
      const nextIndex = Math.round(absoluteProgress) % APP_INTRO_DATA.length;
      if (nextIndex !== activeIndex) {
        setActiveIndex(nextIndex);
      }
    },
    [activeIndex],
  );

  return (
    <View className="items-center justify-center p-24">
      {/* Onboarding Carousel */}
      <Carousel
        width={width}
        height={375}
        data={APP_INTRO_DATA}
        autoPlay
        autoPlayInterval={AUTO_SLIDE_INTERVAL_MS}
        scrollAnimationDuration={600}
        loop
        onSnapToItem={setActiveIndex}
        onProgressChange={handleProgressChange}
        renderItem={renderItem}
      />

      {/* Dot Indicators */}
      <View className="flex-row items-center justify-center gap-2">
        {APP_INTRO_DATA.map((_, index) => (
          <View
            key={`dot-${index}`}
            className={
              index === activeIndex
                ? 'h-3 w-3 rounded-full bg-primary'
                : 'h-3 w-3 rounded-full bg-gray-300'
            }
          />
        ))}
      </View>
    </View>
  );
}
