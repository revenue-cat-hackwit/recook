import React from 'react';
import { Pressable, Text, View, type PressableProps } from 'react-native';

type AuthPrimaryButtonProps = PressableProps & {
  title: string;
  icon?: React.ReactNode;
  titleClassName?: string;
  containerClassName?: string;
};

export default function AuthPrimaryButton({
  title,
  icon,
  titleClassName = 'font-visby-demibold text-base text-white',
  containerClassName = '',
  ...pressableProps
}: AuthPrimaryButtonProps) {
  const baseClassName = 'items-center justify-center rounded-full bg-primary py-4';
  const resolvedClassName = `${baseClassName} ${containerClassName}`.trim();

  return (
    <Pressable className={resolvedClassName} {...pressableProps}>
      <View className="flex-row items-center justify-center gap-2">
        {icon && <View className="items-center justify-center">{icon}</View>}
        <Text className={titleClassName}>{title}</Text>
      </View>
    </Pressable>
  );
}
