import React from 'react';
import { Pressable, Text, type PressableProps } from 'react-native';

type AuthPrimaryButtonProps = PressableProps & {
  title: string;
  titleClassName?: string;
  containerClassName?: string;
};

export default function AuthPrimaryButton({
  title,
  titleClassName = 'font-visby-demibold text-base text-white',
  containerClassName = '',
  ...pressableProps
}: AuthPrimaryButtonProps) {
  const baseClassName = 'items-center justify-center rounded-xl bg-green-500 py-4';
  const resolvedClassName = `${baseClassName} ${containerClassName}`.trim();

  return (
    <Pressable className={resolvedClassName} {...pressableProps}>
      <Text className={titleClassName}>{title}</Text>
    </Pressable>
  );
}
