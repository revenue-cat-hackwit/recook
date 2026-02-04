import { Ionicons } from '@expo/vector-icons';
import React, { useState, useEffect, useRef } from 'react';
import { Pressable, Text, TextInput, View, type TextInputProps, Platform } from 'react-native';

type AuthPasswordFieldProps = Omit<TextInputProps, 'secureTextEntry'> & {
  label: string;
  icon?: React.ReactNode;
  containerClassName?: string;
  labelClassName?: string;
  inputWrapperClassName?: string;
  inputClassName?: string;
};

export default function AuthPasswordField({
  label,
  icon,
  containerClassName = 'gap-2',
  labelClassName = 'font-visby-demibold text-base font-semibold text-black',
  inputWrapperClassName = 'flex-row items-center justify-between rounded-xl border border-black/15 px-4 py-2',
  inputClassName = 'flex-1 font-visby-medium text-base text-black',
  placeholderTextColor = '#9CA3AF',
  value,
  onChangeText,
  ...inputProps
}: AuthPasswordFieldProps) {
  const [isVisible, setIsVisible] = useState(false);
  const inputRef = useRef<TextInput>(null);

  // Use the controlled value from parent or internal state
  const currentValue = value ?? '';

  const handleChangeText = (text: string) => {
    // When user types in masked mode, we need to detect what changed
    if (!isVisible) {
      // If the input is masked, we need to figure out the actual text
      const maskedText = '*'.repeat(currentValue.length);

      if (text.length > maskedText.length) {
        // User added characters
        const newChars = text.slice(maskedText.length);
        const newValue = currentValue + newChars;
        onChangeText?.(newValue);
      } else if (text.length < maskedText.length) {
        // User deleted characters
        const deleteCount = maskedText.length - text.length;
        const newValue = currentValue.slice(0, currentValue.length - deleteCount);
        onChangeText?.(newValue);
      }
    } else {
      // Visible mode - just pass through
      onChangeText?.(text);
    }
  };

  // Display masked value when not visible
  const displayValue = isVisible ? currentValue : '*'.repeat(currentValue.length);

  return (
    <View className={containerClassName}>
      <Text className={labelClassName}>{label}</Text>
      <View className={inputWrapperClassName}>
        {icon && <View className="mr-3 items-center justify-center">{icon}</View>}
        <TextInput
          ref={inputRef}
          placeholderTextColor={placeholderTextColor}
          secureTextEntry={false}
          className={inputClassName}
          value={displayValue}
          onChangeText={handleChangeText}
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
