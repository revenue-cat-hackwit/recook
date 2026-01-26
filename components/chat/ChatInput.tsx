import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSettingsStore } from '@/lib/store/settingsStore';
import { useAudioRecorder } from '@/lib/hooks/useAudioRecorder';
import { VoiceService } from '@/lib/services/voiceService';

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
  const { isRecording, startRecording, stopRecording } = useAudioRecorder({
    // No silence detection needed for Chat Input (manual press)
  });

  const [isTranscribing, setIsTranscribing] = useState(false);

  const handleMicPress = async () => {
    if (isRecording) {
      // STOP
      const uri = await stopRecording();
      if (uri) {
        setIsTranscribing(true);
        try {
          const res = await VoiceService.processAudio(uri, { language }, true); // true = STT Only
          if (res.transcript) {
            onChangeText(res.transcript);
          }
        } catch (e) {
          Alert.alert('Error', 'Gagal memproses suara.');
        } finally {
          setIsTranscribing(false);
        }
      }
    } else {
      // START
      await startRecording();
    }
  };

  return (
    <View
      className="mx-4 mb-6 min-h-[120px] justify-between rounded-[32px] bg-[#1E1F20] p-4 shadow-xl"
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
        placeholder="Tanya Pirinku..."
        placeholderTextColor="#9ca3af"
        className="mb-2 max-h-[120px] font-visby text-lg text-white"
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
          {loading ? (
            /* 1. LOADING STATE: Stop Button (Square) */
            <TouchableOpacity onPress={() => console.log('Stop Generating')} className="mr-1">
              <View className="h-10 w-10 items-center justify-center rounded-full bg-[#2A2B2C]">
                <Ionicons name="square" size={14} color="#E3E3E3" />
              </View>
            </TouchableOpacity>
          ) : value.trim().length > 0 ? (
            /* 2. TYPING STATE: Send Button (Red Arrow) */
            <TouchableOpacity onPress={onSend} disabled={disabled}>
              <View className="h-10 w-10 items-center justify-center rounded-full bg-[#CC5544]">
                <Ionicons name="arrow-up" size={24} color="white" />
              </View>
            </TouchableOpacity>
          ) : (
            /* 3. IDLE STATE: Mic + Voice Mode */
            <>
              {/* Mic */}
              {isTranscribing ? (
                <ActivityIndicator color="#E3E3E3" />
              ) : (
                <TouchableOpacity
                  onPress={handleMicPress}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  className="z-50"
                  activeOpacity={0.7}
                >
                  <View
                    className={`h-10 w-10 items-center justify-center rounded-full ${isRecording ? 'bg-red-500' : ''}`}
                  >
                    <Ionicons
                      name={isRecording ? 'stop' : 'mic'}
                      size={24}
                      color={isRecording ? 'white' : '#E3E3E3'}
                    />
                  </View>
                </TouchableOpacity>
              )}

              {/* Voice Mode Link */}
              {!isRecording && (
                <TouchableOpacity onPress={() => router.push('/voice-mode')}>
                  <View className="h-10 w-10 items-center justify-center rounded-full border border-gray-700 bg-black">
                    <Ionicons name="pulse" size={24} color="white" />
                  </View>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      </View>
    </View>
  );
};
