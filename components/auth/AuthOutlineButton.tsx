import React from 'react';
import { Pressable, Text, type PressableProps } from 'react-native';

type AuthOutlineButtonProps = PressableProps & {
  title: string;
  titleClassName?: string;
  containerClassName?: string;
};

export default function AuthOutlineButton({
  title,
  titleClassName = 'font-visby-demibold text-base font-semibold text-primary',
  containerClassName = '',
  ...pressableProps
}: AuthOutlineButtonProps) {
  const baseClassName = 'items-center justify-center rounded-xl border border-primary py-4';
  const resolvedClassName = `${baseClassName} ${containerClassName}`.trim();

  return (
    <Pressable className={resolvedClassName} {...pressableProps}>
      <Text className={titleClassName}>{title}</Text>
    </Pressable>
  );
}
