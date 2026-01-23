import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, type PressableProps } from 'react-native';

type AuthBackButtonProps = PressableProps & {
  iconColor?: string;
  containerClassName?: string;
};

export default function AuthBackButton({
  iconColor = '#111827',
  containerClassName = 'mb-6 h-10 w-10 items-center justify-center rounded-full border border-gray-200',
  ...pressableProps
}: AuthBackButtonProps) {
  return (
    <Pressable className={containerClassName} accessibilityLabel="Go back" {...pressableProps}>
      <Ionicons name="arrow-back" size={20} color={iconColor} />
    </Pressable>
  );
}
