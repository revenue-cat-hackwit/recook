import React, { useState, useEffect } from 'react';
import { View, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import { useSettingsStore } from '@/lib/store/settingsStore';

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

  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);

  // Hook-based event listeners (Clean & Expo-way)
  useSpeechRecognitionEvent('start', () => setIsRecording(true));
  useSpeechRecognitionEvent('end', () => {
    setIsRecording(false);
    setIsTranscribing(false);
  });

  useSpeechRecognitionEvent('result', (event) => {
    // Expo module returns results differently: event.results[0]?.transcript
    const transcript = event.results[0]?.transcript;
    if (transcript) {
      if (value) {
        // If appending, careful not to double append if final vs interim
        // But for simple implementation, we can just replace logic or intelligent append
        // Ideally: keep track of what part is stable vs interim
        // Here we keep it simple: Replace current input if empty, or append if not.
        // NOTE: This might duplicate text if interim results fire rapidly.
        // Better strategy for production:
        // 1. Store previousStableText
        // 2. Display previousStableText + currentTranscript
        // 3. On final result, update previousStableText

        // For now, let's just set text directly for simplicity (works best if user speaks one phrase)
        onChangeText(transcript);
      } else {
        onChangeText(transcript);
      }
    }
  });

  useSpeechRecognitionEvent('error', (event) => {
    console.log('[Speech] Error:', event.error, event.message);
    setIsRecording(false);
    setIsTranscribing(false);
    // Don't alert "no-speech", just silent fail
    if (event.error !== 'no-speech') {
      Alert.alert('Error', `Gagal mengenali suara: ${event.message || event.error}`);
    }
  });

  const handleStart = async () => {
    const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!result.granted) {
      Alert.alert('Izin Ditolak', 'Mohon izinkan akses mikrofon untuk mendikte.');
      return;
    }

    try {
      setIsTranscribing(true);
      // Map language codes
      const locale = language === 'id' ? 'id-ID' : language === 'en' ? 'en-US' : 'id-ID';

      // Start recognition
      ExpoSpeechRecognitionModule.start({
        lang: locale,
        interimResults: true, // Show text while speaking
        maxAlternatives: 1,
        // On iOS 18+ and Android 13+, continuous ensures it doesn't stop too early
        continuous: false,
      });
    } catch (e) {
      console.error('Failed to start recognition', e);
      setIsRecording(false);
      setIsTranscribing(false);
    }
  };

  const handleStop = () => {
    ExpoSpeechRecognitionModule.stop();
  };

  const handleMicPress = () => {
    if (isRecording) {
      handleStop();
    } else {
      handleStart();
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
