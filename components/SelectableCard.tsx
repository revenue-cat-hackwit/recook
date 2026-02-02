import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';

interface SelectableCardProps {
  label: string;
  imagePath?: string;
  isSelected: boolean;
  onPress: () => void;
  showBorder?: boolean;
}

export default function SelectableCard({
  label,
  imagePath,
  isSelected,
  onPress,
  showBorder = false,
}: SelectableCardProps) {
  const [imageLoaded, setImageLoaded] = useState(false);

  return (
    <TouchableOpacity
      onPress={onPress}
      className={`w-[47%] overflow-hidden rounded-2xl ${
        isSelected ? 'border-[#8BD65E] bg-green-100' : 'border-gray-200 bg-white'
      }`}
      style={{
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
      }}
    >
      {/* Image Container */}
      <View className="h-32 w-full items-center justify-center p-3">
        {imagePath ? (
          <View className="relative h-full w-full">
            {/* Loading Placeholder */}
            {!imageLoaded && (
              <View className="absolute inset-0 items-center justify-center rounded-xl bg-gray-200">
                <View className="h-16 w-16 rounded-full bg-gray-300" />
              </View>
            )}

            {/* Actual Image */}
            <Image
              source={{ uri: imagePath, cache: 'force-cache' }}
              className="h-full w-full rounded-xl"
              resizeMode="cover"
              onLoadStart={() => setImageLoaded(false)}
              onLoadEnd={() => setImageLoaded(true)}
            />
          </View>
        ) : (
          <View className="h-full w-full items-center justify-center">
            <View className="h-20 w-20 rounded-full border-2 border-gray-200 bg-gray-200" />
          </View>
        )}
      </View>

      {/* Label */}
      <View className="items-center p-3">
        <Text className="text-center font-visby-bold text-sm text-gray-900">{label}</Text>
      </View>

      {/* Selection Indicator */}
      {isSelected && (
        <View className="absolute right-2 top-2 h-6 w-6 items-center justify-center rounded-full bg-[#8BD65E]">
          <Text className="font-visby-bold text-xs text-white">✓</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}
