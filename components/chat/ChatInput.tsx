import React, { useLayoutEffect, useState } from 'react';
import { View, TextInput, TouchableOpacity, ActivityIndicator, Alert, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSettingsStore } from '@/lib/store/settingsStore';
import { useAudioRecorder } from '@/lib/hooks/useAudioRecorder';
import { VoiceService } from '@/lib/services/voiceService';
import { SafeAreaView } from 'react-native-safe-area-context';

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
  const router = useRouter();
  const language = useSettingsStore((state) => state.language);

  /* Hook Integration */
  const { isRecording, startRecording, stopRecording, metering, visualizerData } = useAudioRecorder(
    {
      // No silence detection needed for Chat Input (manual press)
    },
  );

  const [isTranscribing, setIsTranscribing] = useState(false);

  const handleStopAndView = async () => {
    const uri = await stopRecording();
    if (uri) {
      setIsTranscribing(true);
      try {
        const res = await VoiceService.processAudio(uri, { language }, true);
        if (res.transcript) {
          onChangeText(res.transcript);
        }
      } catch (e) {
        Alert.alert('Error', 'Failed to process audio.');
      } finally {
        setIsTranscribing(false);
      }
    }
  };

  const handleStopAndSend = async () => {
    const uri = await stopRecording();
    if (uri) {
      setIsTranscribing(true);
      try {
        const res = await VoiceService.processAudio(uri, { language }, true);
        if (res.transcript) {
          onChangeText(res.transcript);
          // Wait for state to update then send
          setTimeout(() => {
            onSend();
          }, 500);
        }
      } catch (e) {
        Alert.alert('Error', 'Failed to process audio.');
      } finally {
        setIsTranscribing(false);
      }
    }
  };

  const handleCancelRecording = async () => {
    await stopRecording();
  };

  const handleMicPress = async () => {
    await startRecording();
  };

  if (isRecording) {
    return (
      <View
        className="mx-4 mb-6 flex-row items-center justify-between rounded-full bg-[#1E1F20] px-4 py-3 shadow-xl"
        style={{ elevation: 10 }}
      >
        {/* Left: Cancel (X) */}
        <TouchableOpacity
          onPress={handleCancelRecording}
          className="h-10 w-10 items-center justify-center rounded-full bg-[#2A2B2C]"
        >
          <Ionicons name="close" size={20} color="#E3E3E3" />
        </TouchableOpacity>

        {/* Center: Visualizer */}
        <TouchableOpacity
          onPress={handleStopAndView}
          className="mx-2 flex-1 items-center justify-center"
        >
          <View className="mb-1 h-14 flex-row items-center justify-end gap-[2px] overflow-hidden px-4">
            {visualizerData.map((level, i) => {
              // level is 0.0 to 1.0 (approximately)
              // Apply slight dampening/smoothing
              const height = 4 + level * 45;

              return (
                <View
                  key={i}
                  className="w-[3px] rounded-full bg-red-400"
                  style={{
                    height: Math.min(50, height),
                    opacity: 0.5 + level * 0.5, // Fades out if quiet
                  }}
                />
              );
            })}
          </View>
          <Text className="font-visby text-[10px] text-gray-400">Tap to view text</Text>
        </TouchableOpacity>

        {/* Right: Send (Arrow Up) - Instant Send */}
        <TouchableOpacity
          onPress={handleStopAndSend}
          className="h-10 w-10 items-center justify-center rounded-full bg-white"
        >
          <Ionicons name="arrow-up" size={24} color="black" />
        </TouchableOpacity>
      </View>
    );
  }

  if (isTranscribing) {
    return (
      <View
        className="mx-4 mb-6 flex-row items-center justify-between rounded-full bg-[#1E1F20] px-4 py-3 shadow-xl"
        style={{ elevation: 10 }}
      >
        <View className="h-10 w-10" />
        <View className="flex-1 items-center justify-center gap-2">
          <ActivityIndicator color="#8BD65E" />
          <Text className="font-visby text-xs text-gray-400">Processing audio...</Text>
        </View>
        <View className="h-10 w-10" />
      </View>
    );
  }
  return (
    <View
      className="mx-4 mb-6 min-h-[60px] rounded-[32px] bg-[#1E1F20] p-4 shadow-xl"
      style={{
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 10,
      }}
    >
      {/* Input Area */}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder="Ask Cooki..."
        placeholderTextColor="#9ca3af"
        className="mb-1 max-h-[100px] font-visby text-base text-white"
        multiline
        textAlignVertical="top"
        editable={!loading && !isTranscribing}
      />

      {/* Action Row */}
      <View className="mt-2 flex-row items-center justify-between">
        {/* Left: Add Image */}
        <View className="flex-row items-center gap-4">
          <TouchableOpacity
            onPress={onPickImage}
            disabled={disabled || loading || isRecording}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <View className="h-10 w-10 items-center justify-center rounded-full bg-[#2A2B2C]">
              <Ionicons name="add" size={24} color="#E3E3E3" />
            </View>
          </TouchableOpacity>
        </View>

        {/* Right: Buttons */}
        <View className="flex-row items-center gap-3">
          {/* 1. Mic always visible if not recording/loading */}
          {!loading && !isRecording && (
            <TouchableOpacity
              onPress={handleMicPress}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              className="mr-1"
            >
              <Ionicons name="mic" size={24} color="#9CA3AF" />
            </TouchableOpacity>
          )}

          {/* 2. Send OR Voice Mode Button */}
          {loading ? (
            <TouchableOpacity onPress={() => console.log('Stop Generating')} className="mr-1">
              <View className="h-10 w-10 items-center justify-center rounded-full bg-[#2A2B2C]">
                <Ionicons name="square" size={14} color="#E3E3E3" />
              </View>
            </TouchableOpacity>
          ) : value.trim().length > 0 ? (
            <TouchableOpacity onPress={onSend} disabled={disabled}>
              <View className="h-10 w-10 items-center justify-center rounded-full bg-white">
                <Ionicons name="arrow-up" size={24} color="black" />
              </View>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={() => router.push('/voice-mode')}>
              <View className="h-10 w-10 items-center justify-center rounded-full border border-gray-700 bg-black">
                <Ionicons name="pulse" size={24} color="white" />
              </View>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
};
