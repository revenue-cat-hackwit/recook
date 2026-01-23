import React from 'react';
import { Pressable, Text, View } from 'react-native';

type AuthFooterLinkProps = {
  text?: string;
  linkText: string;
  onPress: () => void;
  containerClassName?: string;
  textClassName?: string;
  linkClassName?: string;
};

export default function AuthFooterLink({
  text,
  linkText,
  onPress,
  containerClassName = 'flex-row items-center justify-center',
  textClassName = 'font-visby-medium text-base text-gray-500',
  linkClassName = 'font-visby-demibold text-base font-semibold text-green-500',
}: AuthFooterLinkProps) {
  return (
    <View className={containerClassName}>
      {text ? <Text className={textClassName}>{text}</Text> : null}
      <Pressable onPress={onPress}>
        <Text className={linkClassName}>{linkText}</Text>
      </Pressable>
    </View>
  );
}
