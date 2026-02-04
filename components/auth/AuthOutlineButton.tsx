import React from 'react';
import { Pressable, Text, View, type PressableProps } from 'react-native';

type AuthOutlineButtonProps = PressableProps & {
  title: string;
  icon?: React.ReactNode;
  titleClassName?: string;
  containerClassName?: string;
};

export default function AuthOutlineButton({
  title,
  icon,
  titleClassName = 'font-visby-demibold text-base font-semibold text-primary',
  containerClassName = '',
  ...pressableProps
}: AuthOutlineButtonProps) {
  const baseClassName = 'items-center justify-center rounded-full border border-primary py-4';
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
