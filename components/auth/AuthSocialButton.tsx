import React from 'react';
import { Pressable, Text, View, type PressableProps } from 'react-native';

type AuthSocialButtonProps = PressableProps & {
  title: string;
  icon: React.ReactNode;
  titleClassName?: string;
  containerClassName?: string;
};

export default function AuthSocialButton({
  title,
  icon,
  titleClassName = 'font-visby-demibold text-base font-semibold text-gray-700',
  containerClassName = '',
  ...pressableProps
}: AuthSocialButtonProps) {
  const baseClassName =
    'flex-row items-center justify-center gap-2 rounded-xl border border-gray-300 py-3';
  const resolvedClassName = `${baseClassName} ${containerClassName}`.trim();

  return (
    <Pressable className={resolvedClassName} {...pressableProps}>
      <View className="h-5 w-5 items-center justify-center">{icon}</View>
      <Text className={titleClassName}>{title}</Text>
    </Pressable>
  );
}
