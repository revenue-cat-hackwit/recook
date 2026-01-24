import React, { useState, useEffect } from 'react';
import { View, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import {
  useAudioRecorder,
  useAudioRecorderState,
  AudioModule,
  RecordingPresets,
  IOSOutputFormat,
  AudioQuality,
} from 'expo-audio';
import { supabaseUrl, supabaseAnonKey } from '@/lib/supabase';

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

  // Configuration for Novita AI (Requires WAV or MP3)
  // iOS -> WAV (LinearPCM)
  // Android -> M4A (Default AAC) -> Note: Might fail on Novita if they strictly block M4A.
  const recordingOptions = {
    ...RecordingPresets.HIGH_QUALITY,
    ios: {
      extension: '.wav',
      outputFormat: IOSOutputFormat.LINEARPCM,
      audioQuality: AudioQuality.MAX,
      sampleRate: 44100,
      numberOfChannels: 1,
      bitRate: 128000,
      linearPCMBitDepth: 16,
      linearPCMIsBigEndian: false,
      linearPCMIsFloat: false,
    },
  };

  // Use expo-audio recorder
  const audioRecorder = useAudioRecorder(recordingOptions, (status) => {
    // Status updates
  });

  const audioState = useAudioRecorderState(audioRecorder);

  const [isTranscribing, setIsTranscribing] = useState(false);

  useEffect(() => {
    return () => {
      // Cleanup
      if (audioRecorder.isRecording) {
        audioRecorder.stop();
      }
    };
  }, []);

  const requestPermission = async () => {
    const status = await AudioModule.requestRecordingPermissionsAsync();
    if (!status.granted) {
      Alert.alert('Izin Ditolak', 'Mohon izinkan akses mikrofon untuk mendikte.');
    }
  };

  async function startRecording() {
    try {
      const perms = await AudioModule.getRecordingPermissionsAsync();
      if (!perms.granted) {
        await requestPermission();
      }

      // Record!!
      audioRecorder.record();
    } catch (err) {
      console.error('Failed to start recording', err);
      Alert.alert('Error', 'Gagal memulai perekaman suara.');
    }
  }

  async function stopRecording() {
    if (!audioRecorder.isRecording) return;

    setIsTranscribing(true);
    try {
      await audioRecorder.stop();

      // Get URI
      const uri = audioRecorder.uri;

      if (uri) {
        handleTranscribe(uri);
      } else {
        throw new Error('No recording URI');
      }
    } catch (err) {
      console.error('Stop error', err);
      setIsTranscribing(false);
    }
  }

  const handleTranscribe = async (uri: string) => {
    try {
      // Determine file type based on extension
      const fileExtension = uri.split('.').pop()?.toLowerCase();
      let mimeType = 'audio/mp4'; // Default to m4a
      let fileName = `recording.${fileExtension}`;

      if (fileExtension === 'wav') {
        mimeType = 'audio/wav';
      } else if (fileExtension === 'mp3') {
        mimeType = 'audio/mpeg';
      } else if (fileExtension === 'm4a') {
        mimeType = 'audio/mp4';
      }

      const formData = new FormData();
      formData.append('audio', {
        // BACKEND EXPECTS 'audio'
        uri,
        name: fileName,
        type: mimeType,
      } as any);

      // Manual Fetch / Force Anon Key
      const token = supabaseAnonKey;

      if (!token) {
        throw new Error('No Auth Token');
      }

      const FUNCTION_URL = `${supabaseUrl}/functions/v1/voice-dictation`;
      console.log(`Posting to ${FUNCTION_URL} (${mimeType})`);

      const response = await fetch(FUNCTION_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server Error ${response.status}: ${errorText}`);
      }

      const data = await response.json();

      if (data?.transcript) {
        const newText = value ? `${value} ${data.transcript}` : data.transcript;
        onChangeText(newText);
      }
    } catch (err: any) {
      console.error('Transcription failed', err);
      Alert.alert('Gagal', `Detail: ${err.message}`);
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
            disabled={disabled || loading || audioState.isRecording}
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
                <TouchableOpacity onPress={audioState.isRecording ? stopRecording : startRecording}>
                  <View
                    className={`h-10 w-10 items-center justify-center rounded-full ${audioState.isRecording ? 'bg-red-500' : ''}`}
                  >
                    <Ionicons
                      name={audioState.isRecording ? 'stop' : 'mic'}
                      size={24}
                      color={audioState.isRecording ? 'white' : '#E3E3E3'}
                    />
                  </View>
                </TouchableOpacity>
              )}

              {/* Voice Mode Link */}
              {!audioState.isRecording && (
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
