import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Audio } from 'expo-av';
import { supabase } from '@/lib/supabase';

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
  const [recording, setRecording] = useState<Audio.Recording | undefined>(undefined);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [permissionResponse, requestPermission] = Audio.usePermissions();

  async function startRecording() {
    try {
      if (permissionResponse?.status !== 'granted') {
        await requestPermission();
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
      );
      setRecording(recording);
    } catch (err) {
      console.error('Failed to start recording', err);
      Alert.alert('Error', 'Gagal memulai perekaman suara.');
    }
  }

  async function stopRecording() {
    if (!recording) return;

    setIsTranscribing(true);
    try {
      await recording.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
      const uri = recording.getURI();
      setRecording(undefined);

      if (uri) {
        handleTranscribe(uri);
      }
    } catch (err) {
      setIsTranscribing(false);
    }
  }

  const handleTranscribe = async (uri: string) => {
    try {
      const formData = new FormData();
      formData.append('audio', {
        uri,
        name: 'dictation.m4a',
        type: 'audio/m4a',
      } as any);
      formData.append('mode', 'transcribe'); // Tell backend to ONLY transcript

      const { data, error } = await supabase.functions.invoke('voice-processor', {
        body: formData,
      });

      if (error) throw error;

      if (data?.transcript) {
        // Append transcript to existing text
        const newText = value ? `${value} ${data.transcript}` : data.transcript;
        onChangeText(newText);
      }
    } catch (err: any) {
      console.error('Transcription failed', err);
      Alert.alert('Gagal', 'Tidak dapat mendengarkan suara.');
    } finally {
      setIsTranscribing(false);
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
      {/* Input Area (Atas) */}
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

      {/* Action Row (Bawah) */}
      <View className="mt-2 flex-row items-center justify-between">
        {/* Kiri: Add Image */}
        <View className="flex-row items-center gap-4">
          <TouchableOpacity onPress={onPickImage} disabled={disabled || loading || !!recording}>
            <View className="h-10 w-10 items-center justify-center rounded-full bg-[#2A2B2C]">
              <Ionicons name="add" size={24} color="#E3E3E3" />
            </View>
          </TouchableOpacity>
        </View>

        {/* Kanan: Tombol Dinamis */}
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
              {/* Dictation Mic */}
              {isTranscribing ? (
                <ActivityIndicator color="#E3E3E3" />
              ) : (
                <TouchableOpacity onPress={recording ? stopRecording : startRecording}>
                  <View
                    className={`h-10 w-10 items-center justify-center rounded-full ${recording ? 'bg-red-500' : ''}`}
                  >
                    <Ionicons
                      name={recording ? 'stop' : 'mic'}
                      size={24}
                      color={recording ? 'white' : '#E3E3E3'}
                    />
                  </View>
                </TouchableOpacity>
              )}

              {/* Conversation Mode Link */}
              {!recording && (
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
