import React from 'react';
import { View, TextInput, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ChatInputProps {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  onPickImage: () => void;
  loading: boolean;
  disabled?: boolean;
}

export const ChatInput = ({
  value,
  onChangeText,
  onSend,
  onPickImage,
  loading,
  disabled,
}: ChatInputProps) => {
  return (
    <View className="border-t border-gray-100 bg-white p-4">
      <View className="min-h-[120px] justify-between rounded-[32px] bg-[#1E1F20] p-4">
        {/* Input Area */}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder="Tanya Pirinku..."
          placeholderTextColor="#9ca3af"
          className="mb-2 max-h-[120px] font-visby text-lg text-white"
          multiline
          textAlignVertical="top"
        />

        {/* Action Row */}
        <View className="mt-2 flex-row items-center justify-between">
          {/* Left Actions */}
          <View className="flex-row items-center gap-4">
            <TouchableOpacity onPress={onPickImage} disabled={disabled || loading}>
              <View className="h-10 w-10 items-center justify-center rounded-full bg-[#2A2B2C]">
                <Ionicons name="add" size={24} color="#E3E3E3" />
              </View>
            </TouchableOpacity>

            {/* Dummy Tools Icon */}
            {/* <TouchableOpacity className="flex-row items-center bg-[#2A2B2C] px-3 py-2 rounded-full">
               <Ionicons name="options-outline" size={18} color="#E3E3E3" />
               <Text className='text-gray-300 ml-2 font-visby text-xs'>Alat</Text>
            </TouchableOpacity> */}
          </View>

          {/* Right Actions */}
          <View className="flex-row items-center gap-4">
            {/* Dummy Mic Icon */}
            {/* <TouchableOpacity>
              <Ionicons name="mic" size={24} color="#E3E3E3" />
             </TouchableOpacity> */}

            <TouchableOpacity
              onPress={onSend}
              disabled={disabled || loading || !value.trim()}
              className={`${loading || !value.trim() ? 'opacity-50' : 'opacity-100'}`}
            >
              <View className="h-10 w-10 items-center justify-center rounded-full bg-white">
                {loading ? (
                  <Ionicons name="hourglass" size={20} color="black" />
                ) : (
                  <Ionicons name="arrow-up" size={24} color="black" />
                )}
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
};
