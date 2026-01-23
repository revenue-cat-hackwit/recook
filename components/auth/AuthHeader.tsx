import React from 'react';
import { Text, View } from 'react-native';

type AuthHeaderProps = {
  title: string;
  subtitle?: string;
  titleClassName?: string;
  subtitleClassName?: string;
};

export default function AuthHeader({
  title,
  subtitle,
  titleClassName = 'font-visby-demibold text-3xl font-semibold text-black',
  subtitleClassName = 'font-visby-medium text-base text-gray-500',
}: AuthHeaderProps) {
  return (
    <View className="gap-2">
      <Text className={titleClassName}>{title}</Text>
      {subtitle ? <Text className={subtitleClassName}>{subtitle}</Text> : null}
    </View>
  );
}
