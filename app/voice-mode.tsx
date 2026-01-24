import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Text, TouchableOpacity, View, Alert } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import {
  useAudioRecorder,
  useAudioRecorderState,
  AudioModule,
  RecordingPresets,
  IOSOutputFormat,
  AudioQuality,
} from 'expo-audio';
import { supabaseAnonKey, supabaseUrl } from '@/lib/supabase';

export default function VoiceModeScreen() {
  const router = useRouter();

  // Configuration for Novita AI (Requires WAV or MP3)
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

  const audioRecorder = useAudioRecorder(recordingOptions, (status) => {
    // Status updates often not needed if using useAudioRecorderState
  });

  const audioState = useAudioRecorderState(audioRecorder);
  const [isProcessing, setIsProcessing] = useState(false);

  // Animation Value for Pulse Effect
  const imageScale = useSharedValue(1);
  const opacity = useSharedValue(0.8);

  const isRecording = audioState.isRecording;

  useEffect(() => {
    // Breathing animation loop (always active for ambience, or intensify when recording)
    imageScale.value = withRepeat(
      withTiming(isRecording ? 1.2 : 1.05, {
        duration: isRecording ? 800 : 2000,
        easing: Easing.inOut(Easing.ease),
      }),
      -1,
      true,
    );
    opacity.value = withRepeat(
      withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [isRecording]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: imageScale.value }],
      opacity: opacity.value,
    };
  });

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

      audioRecorder.record();
    } catch (err) {
      console.error('Failed to start recording', err);
      Alert.alert('Error', 'Gagal memulai perekaman suara.');
    }
  }

  async function stopRecording() {
    if (!audioState.isRecording) return;

    // setIsProcessing(true); // Don't set here, wait until upload actually starts
    try {
      await audioRecorder.stop();
      const uri = audioRecorder.uri;
      console.log('Recording stopped and stored at', uri);

      if (uri) {
        handleUpload(uri);
      }
    } catch (e) {
      console.error('Stop error', e);
    }
  }

  const handleUpload = async (uri: string) => {
    setIsProcessing(true);
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
        uri,
        name: fileName,
        type: mimeType,
      } as any);

      console.log('Sending audio via manual fetch...');

      // FORCE USE ANON KEY to avoid ES256 token issues
      const token = supabaseAnonKey;

      if (!token) {
        throw new Error('No Auth Token available');
      }

      const FUNCTION_URL = `${supabaseUrl}/functions/v1/voice-processor`;
      console.log(`Posting to ${FUNCTION_URL}`);

      const response = await fetch(FUNCTION_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          // Let fetch generate multipart/form-data boundary automatically
        },
        body: formData,
      });

      if (!response.ok) {
        let errorMsg = `Server Error ${response.status}`;
        try {
          const errText = await response.text();
          errorMsg += `: ${errText}`;
        } catch (e) {
          // Ignore parsing error
        }
        throw new Error(errorMsg);
      }

      const data = await response.json();

      console.log('Voice Processed:', data);
      const { transcript, reply, audio } = data;

      Alert.alert('Chef Menjawab', `🗣️ Kamu: "${transcript}"\n\n👨‍🍳 Chef: "${reply}"`);

      // TODO: Playback audio response using expo-audio player if needed
      // For now, text is displayed.
    } catch (err: any) {
      console.error('Upload failed', err);
      Alert.alert('Error', `Gagal memproses suara: ${err.message || 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Header */}
      <View className="flex-row items-center justify-between px-6 pt-4">
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={28} color="black" />
        </TouchableOpacity>
        <Text className="font-visby-bold text-xl text-black">Pirinku Voice</Text>
        <View style={{ width: 28 }} />
      </View>

      {/* Main Content */}
      <View className="-mt-20 flex-1 items-center justify-center">
        <Text className="mb-12 px-10 text-center font-visby text-lg text-gray-600">
          {isRecording
            ? 'Saya mendengarkan...'
            : isProcessing
              ? 'Sedang memproses...'
              : 'Ketuk mikrofon untuk bicara'}
        </Text>

        {/* Animated Orb */}
        <Animated.View
          style={[
            animatedStyle,
            { width: 300, height: 300, justifyContent: 'center', alignItems: 'center' },
          ]}
        >
          {/* Using a nice gradient orb image */}
          <Image
            source={{
              uri: 'https://cdn.dribbble.com/users/124059/screenshots/15479427/media/5e478589f635c9a09320875c7553757d.jpg?resize=800x600&vertical=center',
            }}
            style={{ width: 280, height: 280, borderRadius: 140, opacity: isProcessing ? 0.5 : 1 }}
            contentFit="cover"
          />
        </Animated.View>
      </View>

      {/* Footer Controls */}
      <View className="flex-row items-center justify-between px-10 pb-12">
        <TouchableOpacity
          onPress={() => router.back()} // Sementara back ke text chat
          className="h-14 w-14 items-center justify-center rounded-full bg-gray-100"
        >
          <Ionicons name="keypad" size={24} color="#666" />
        </TouchableOpacity>

        {/* Big Mic Button with Pulse Ring */}
        <View className="items-center justify-center">
          {isRecording && (
            <View className="absolute h-24 w-24 scale-125 items-center justify-center rounded-full bg-red-100 opacity-50" />
          )}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={isRecording ? stopRecording : startRecording}
            disabled={isProcessing}
            className={`h-20 w-20 items-center justify-center rounded-full shadow-lg ${isRecording ? 'bg-red-500 shadow-red-200' : 'bg-[#5FD08F] shadow-green-200'}`}
          >
            <Ionicons name={isRecording ? 'stop' : 'mic'} size={32} color="white" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity className="h-14 w-14 items-center justify-center rounded-full bg-gray-100">
          <Ionicons name="menu" size={24} color="#666" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
