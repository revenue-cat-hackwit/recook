import React from 'react';
import { Text, TextInput, View, type TextInputProps } from 'react-native';

type AuthTextFieldProps = TextInputProps & {
  label: string;
  containerClassName?: string;
  labelClassName?: string;
  inputWrapperClassName?: string;
  inputClassName?: string;
};

export default function AuthTextField({
  label,
  containerClassName = 'gap-2',
  labelClassName = 'font-visby-demibold text-base font-semibold text-black',
  inputWrapperClassName = 'rounded-xl border border-green-400 px-4 py-2',
  inputClassName = 'font-visby-medium text-base text-black',
  placeholderTextColor = '#9CA3AF',
  ...inputProps
}: AuthTextFieldProps) {
  return (
    <View className={containerClassName}>
      <Text className={labelClassName}>{label}</Text>
      <View className={inputWrapperClassName}>
        <TextInput
          placeholderTextColor={placeholderTextColor}
          className={inputClassName}
          {...inputProps}
        />
      </View>
    </View>
  );
}
