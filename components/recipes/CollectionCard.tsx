import React from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import { useColorScheme } from 'nativewind';

interface CollectionCardProps {
  name: string;
  count: number;
  images: string[];
  onPress: () => void;
}

export const CollectionCard: React.FC<CollectionCardProps> = ({
  name,
  count,
  images,
  onPress,
}) => {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const renderImages = () => {
    if (images.length === 0) {
      return (
        <View className="h-full w-full items-center justify-center bg-gray-200 dark:bg-gray-800">
          <Text className="text-4xl">🍳</Text>
        </View>
      );
    }

    if (images.length === 1) {
      return (
        <Image
          source={{ uri: images[0] }}
          className="h-full w-full"
          resizeMode="cover"
        />
      );
    }
    
    // Airbnb style: Large left, two small right
    if (images.length >= 3) {
      return (
        <View className="h-full w-full flex-row">
            {/* Left Large Image */}
            <View className="w-1/2 pr-0.5">
                <Image
                    source={{ uri: images[0] }}
                    className="h-full w-full"
                    resizeMode="cover"
                />
            </View>
            {/* Right Small Images */}
            <View className="w-1/2 gap-0.5 pb-0.5 pl-0.5">
                <View className="flex-1">
                    <Image
                        source={{ uri: images[1] }}
                        className="h-full w-full"
                        resizeMode="cover"
                    />
                </View>
                <View className="flex-1">
                    <Image
                        source={{ uri: images[2] }}
                        className="h-full w-full"
                        resizeMode="cover"
                    />
                </View>
            </View>
        </View>
      );
    }

    // 2 Images
    return (
        <View className="h-full w-full flex-row">
            <View className="w-1/2 pr-0.5">
                <Image
                    source={{ uri: images[0] }}
                    className="h-full w-full"
                    resizeMode="cover"
                />
            </View>
            <View className="w-1/2 pl-0.5">
                <Image
                    source={{ uri: images[1] }}
                    className="h-full w-full"
                    resizeMode="cover"
                />
            </View>
        </View>
    );

  };

  return (
    <TouchableOpacity
      onPress={onPress}
      className="mb-6 mr-4 w-[45%]"
      activeOpacity={0.8}
    >
      {/* Image Container with rounded corners and shadow */}
      <View className="aspect-square w-full overflow-hidden rounded-3xl bg-gray-100 shadow-sm dark:bg-gray-800 border border-gray-100 dark:border-gray-800">
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
        <Text className="font-visby text-xs text-gray-500 dark:text-gray-400">
          {count} saved
        </Text>
      </View>
    </TouchableOpacity>
  );
};
