import React from 'react';
import { Text, TextInput, View, type TextInputProps } from 'react-native';

type AuthTextFieldProps = TextInputProps & {
  label: string;
  icon?: React.ReactNode;
  containerClassName?: string;
  labelClassName?: string;
  inputWrapperClassName?: string;
  inputClassName?: string;
};

export default function AuthTextField({
  label,
  icon,
  containerClassName = 'gap-2',
  labelClassName = 'font-visby-demibold text-base font-semibold text-black',
  inputWrapperClassName = 'rounded-xl border border-black/15 px-4 py-2',
  inputClassName = 'font-visby-medium text-base text-black',
  placeholderTextColor = '#9CA3AF',
  ...inputProps
}: AuthTextFieldProps) {
  return (
    <View className={containerClassName}>
      <Text className={labelClassName}>{label}</Text>
      <View className={inputWrapperClassName}>
        <View className="flex-row items-center gap-3">
          {icon && <View className="items-center justify-center">{icon}</View>}
          <TextInput
            placeholderTextColor={placeholderTextColor}
            className={`${inputClassName} ${icon ? 'flex-1' : ''}`}
            {...inputProps}
          />
        </View>
      </View>
    </View>
  );
}
