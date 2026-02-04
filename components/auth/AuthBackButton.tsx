import React from 'react';
import { Pressable, type PressableProps } from 'react-native';
import { ArrowLeft } from 'iconsax-react-native';

type AuthBackButtonProps = PressableProps & {
  iconColor?: string;
  containerClassName?: string;
};

export default function AuthBackButton({
  iconColor = '#111827',
  containerClassName = 'mb-6 self-start',
  ...pressableProps
}: AuthBackButtonProps) {
  return (
    <Pressable className={containerClassName} accessibilityLabel="Go back" {...pressableProps}>
      <ArrowLeft size={24} color={iconColor} variant="Linear" />
    </Pressable>
  );
}
