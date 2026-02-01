import React from 'react';
import { View, Text, TouchableOpacity, Alert, Platform, ActionSheetIOS } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Recipe } from '@/lib/types';
import { useColorScheme } from 'nativewind';
import * as Haptics from 'expo-haptics';

interface RecipeCardProps {
  recipe: Recipe;
  onPress: () => void;
  onCollectionPress?: () => void;
  onDelete?: (id: string) => void;
  onShare?: (recipe: Recipe) => void;
}

export const RecipeCard: React.FC<RecipeCardProps> = ({
  recipe,
  onPress,
  onCollectionPress,
  onDelete,
  onShare,
}) => {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const handleLongPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const options = [
      'View Details',
      ...(onCollectionPress ? ['Add to Collection'] : []),
      ...(onShare ? ['Share Recipe'] : []),
      ...(onDelete ? ['Delete Recipe'] : []),
      'Cancel',
    ];

    const destructiveButtonIndex = onDelete ? options.length - 2 : undefined;
    const cancelButtonIndex = options.length - 1;

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          destructiveButtonIndex,
          cancelButtonIndex,
        },
        (buttonIndex) => {
          if (buttonIndex === 0) {
            onPress();
          } else if (buttonIndex === 1 && onCollectionPress) {
            onCollectionPress();
          } else if (buttonIndex === (onCollectionPress ? 2 : 1) && onShare) {
            onShare(recipe);
          } else if (buttonIndex === destructiveButtonIndex && onDelete && recipe.id) {
            Alert.alert('Delete Recipe', `Are you sure you want to delete "${recipe.title}"?`, [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Delete',
                style: 'destructive',
                onPress: () => onDelete(recipe.id!),
              },
            ]);
          }
        },
      );
    } else {
      // Android: Use Alert with buttons
      const buttons: any[] = [{ text: 'View Details', onPress: () => onPress() }];

      if (onCollectionPress) {
        buttons.push({ text: 'Add to Collection', onPress: () => onCollectionPress() });
      }

      if (onShare) {
        buttons.push({ text: 'Share Recipe', onPress: () => onShare(recipe) });
      }

      if (onDelete && recipe.id) {
        buttons.push({
          text: 'Delete Recipe',
          onPress: () => {
            Alert.alert('Delete Recipe', `Are you sure you want to delete "${recipe.title}"?`, [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Delete',
                style: 'destructive',
                onPress: () => onDelete(recipe.id!),
              },
            ]);
          },
          style: 'destructive',
        });
      }

      buttons.push({ text: 'Cancel', style: 'cancel' });

      Alert.alert('Recipe Actions', `What would you like to do with "${recipe.title}"?`, buttons);
    }
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      onLongPress={handleLongPress}
      delayLongPress={500}
      className="mb-6 overflow-hidden rounded-2xl bg-white p-0 shadow-sm dark:bg-[#1A1A1A]"
    >
      {/* HERO IMAGE */}
      <View className="relative h-56 w-full bg-gray-200 dark:bg-gray-800">
        {recipe.imageUrl ? (
          <Image
            source={{ uri: recipe.imageUrl }}
            style={{ width: '100%', height: '100%' }}
            contentFit="cover"
            transition={500}
          />
        ) : (
          <View className="h-full w-full items-center justify-center">
            <Text className="text-6xl">🍲</Text>
          </View>
        )}

        {/* Video Indicator */}
        {recipe.sourceUrl?.match(/\.(mp4|mov|webm)(\?.*)?$/i) && (
          <View className="absolute bottom-3 left-3 flex-row items-center rounded-full bg-black/50 px-3 py-1 backdrop-blur-sm">
            <Ionicons name="play" size={12} color="white" />
            <Text className="ml-1 font-visby-bold text-xs text-white">Video</Text>
          </View>
        )}

        {/* Save / Collection Button */}
        {onCollectionPress && (
          <TouchableOpacity
            onPress={(e) => {
              e.stopPropagation();
              onCollectionPress();
            }}
            className="absolute right-3 top-3 rounded-full bg-white/90 p-2 shadow-sm backdrop-blur-sm dark:bg-black/50"
          >
            <Ionicons
              name={
                recipe.collections && recipe.collections.length > 0
                  ? 'bookmark'
                  : 'bookmark-outline'
              }
              size={20}
              color={
                recipe.collections && recipe.collections.length > 0
                  ? '#F59E0B'
                  : isDark
                    ? 'white'
                    : 'black'
              }
            />
          </TouchableOpacity>
        )}
      </View>

      {/* CONTENT */}
      <View className="p-4">
        <View className="mb-1">
          <Text numberOfLines={1} className="font-visby-bold text-lg text-gray-900 dark:text-white">
            {recipe.title}
          </Text>
        </View>

        <Text
          numberOfLines={2}
          className="mb-3 font-visby text-sm text-gray-500 dark:text-gray-400"
        >
          {recipe.description || 'No description available for this recipe.'}
        </Text>

        <View className="flex-row items-center space-x-4">
          <View className="flex-row items-center">
            <Ionicons name="time-outline" size={14} color="gray" />
            <Text className="ml-1 text-xs text-gray-500 dark:text-gray-400">
              {recipe.time_minutes} min
            </Text>
          </View>
          <View className="flex-row items-center">
            <Ionicons name="flame-outline" size={14} color="gray" />
            <Text className="ml-1 text-xs text-gray-500 dark:text-gray-400">
              {recipe.calories_per_serving} kcal
            </Text>
          </View>
          <View className="flex-row items-center">
            <Ionicons name="people-outline" size={14} color="gray" />
            <Text className="ml-1 text-xs text-gray-500 dark:text-gray-400">
              {recipe.servings} serv
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};
