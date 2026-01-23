import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Pressable, Text, TextInput, View, type TextInputProps } from 'react-native';

type AuthPasswordFieldProps = Omit<TextInputProps, 'secureTextEntry'> & {
  label: string;
  containerClassName?: string;
  labelClassName?: string;
  inputWrapperClassName?: string;
  inputClassName?: string;
};

export default function AuthPasswordField({
  label,
  containerClassName = 'gap-2',
  labelClassName = 'font-visby-demibold text-base font-semibold text-black',
  inputWrapperClassName = 'flex-row items-center justify-between rounded-xl border border-green-400 px-4 py-2',
  inputClassName = 'flex-1 font-visby-medium text-base text-black',
  placeholderTextColor = '#9CA3AF',
  ...inputProps
}: AuthPasswordFieldProps) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <View className={containerClassName}>
      <Text className={labelClassName}>{label}</Text>
      <View className={inputWrapperClassName}>
        <TextInput
          placeholderTextColor={placeholderTextColor}
          secureTextEntry={!isVisible}
          className={inputClassName}
          {...inputProps}
        />
        <Pressable
          onPress={() => setIsVisible((prev) => !prev)}
          className="ml-3"
          accessibilityLabel={isVisible ? 'Hide password' : 'Show password'}
        >
          <Ionicons name={isVisible ? 'eye' : 'eye-off'} size={18} color="#6B7280" />
        </Pressable>
      </View>
    </View>
  );
}
