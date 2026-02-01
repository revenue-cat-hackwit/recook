import React from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import { useColorScheme } from 'nativewind';

interface CollectionCardProps {
  name: string;
  count: number;
  images: string[];
  onPress: () => void;
}

export const CollectionCard: React.FC<CollectionCardProps> = ({ name, count, images, onPress }) => {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const renderImages = () => {
    if (images.length === 0) {
      return (
        <View className="h-full w-full items-center justify-center bg-gradient-to-br from-orange-100 to-red-100 dark:from-orange-900/30 dark:to-red-900/30">
          <Text className="text-5xl">🍳</Text>
        </View>
      );
    }

    if (images.length === 1) {
      return <Image source={{ uri: images[0] }} className="h-full w-full" resizeMode="cover" />;
    }

    // 2+ Images: Always 2x2 Grid
    if (images.length >= 2) {
      // Ensure we have exactly 4 images for the grid by repeating if necessary
      const gridImages = [...images];
      let i = 0;
      while (gridImages.length < 4) {
        gridImages.push(images[i % images.length]);
        i++;
      }

      return (
        <View className="h-full w-full">
          <View className="flex-1 flex-row gap-0.5">
            <View className="flex-1">
              <Image source={{ uri: gridImages[0] }} className="h-full w-full" resizeMode="cover" />
            </View>
            <View className="flex-1">
              <Image source={{ uri: gridImages[1] }} className="h-full w-full" resizeMode="cover" />
            </View>
          </View>
          <View className="flex-1 flex-row gap-0.5 pt-0.5">
            <View className="flex-1">
              <Image source={{ uri: gridImages[2] }} className="h-full w-full" resizeMode="cover" />
            </View>
            <View className="flex-1">
              <Image source={{ uri: gridImages[3] }} className="h-full w-full" resizeMode="cover" />
            </View>
          </View>
        </View>
      );
    }
  };

  return (
    <TouchableOpacity onPress={onPress} className="mb-6 mr-4 w-[45%]" activeOpacity={0.8}>
      {/* Image Container with rounded corners and shadow */}
      <View className="aspect-square w-full overflow-hidden rounded-3xl border border-gray-100 bg-gray-100 shadow-sm dark:border-gray-800 dark:bg-gray-800">
        {renderImages()}
      </View>

      {/* Title & Subtitle */}
      <View className="mt-3">
        <Text
          numberOfLines={1}
          className="font-visby-bold text-base text-gray-900 dark:text-gray-100"
        >
          {name}
        </Text>
        <Text className="font-visby text-xs text-gray-500 dark:text-gray-400">{count} saved</Text>
      </View>
    </TouchableOpacity>
  );
};
