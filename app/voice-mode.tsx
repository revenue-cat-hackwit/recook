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
import { Audio } from 'expo-av';
import { supabase } from '@/lib/supabase';

export default function VoiceModeScreen() {
  const router = useRouter();
  const [recording, setRecording] = useState<Audio.Recording | undefined>(undefined);
  const [permissionResponse, requestPermission] = Audio.usePermissions();
  const [isProcessing, setIsProcessing] = useState(false);

  // Animation Value for Pulse Effect
  const imageScale = useSharedValue(1);
  const opacity = useSharedValue(0.8);

  useEffect(() => {
    // Breathing animation loop (always active for ambience, or intensify when recording)
    imageScale.value = withRepeat(
      withTiming(recording ? 1.2 : 1.05, {
        duration: recording ? 800 : 2000,
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
  }, [recording]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: imageScale.value }],
      opacity: opacity.value,
    };
  });

  async function startRecording() {
    try {
      if (permissionResponse?.status !== 'granted') {
        console.log('Requesting permission..');
        await requestPermission();
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      console.log('Starting recording..');
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
      );
      setRecording(recording);
      console.log('Recording started');
    } catch (err) {
      console.error('Failed to start recording', err);
      Alert.alert('Error', 'Gagal memulai perekaman suara.');
    }
  }

  async function stopRecording() {
    console.log('Stopping recording..');
    setRecording(undefined);
    await recording?.stopAndUnloadAsync();
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
    });

    const uri = recording?.getURI();
    console.log('Recording stopped and stored at', uri);

    if (uri) {
      handleUpload(uri);
    }
  }

  const handleUpload = async (uri: string) => {
    setIsProcessing(true);
    try {
      const formData = new FormData();
      formData.append('audio', {
        uri,
        name: 'recording.m4a',
        type: 'audio/m4a',
      } as any);

      console.log('Sending audio to backend...');
      const { data, error } = await supabase.functions.invoke('voice-processor', {
        body: formData,
      });

      if (error) {
        throw error;
      }

      console.log('Voice Processed:', data);
      const { transcript, reply, audio } = data;

      // Show Text Result
      Alert.alert('Chef Menjawab', `🗣️ Kamu: "${transcript}"\n\n👨‍🍳 Chef: "${reply}"`);

      // Play Audio Response
      if (audio) {
        const { sound } = await Audio.Sound.createAsync(
          { uri: `data:audio/mp3;base64,${audio}` },
          { shouldPlay: true },
        );
        // sound.playAsync(); // createAsync with shouldPlay:true already plays it
      }
    } catch (err: any) {
      console.error('Upload failed', err);
      Alert.alert('Error', 'Gagal memproses suara: ' + (err.message || 'Unknown error'));
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
          {recording
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
          {recording && (
            <View className="absolute h-24 w-24 scale-125 items-center justify-center rounded-full bg-red-100 opacity-50" />
          )}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={recording ? stopRecording : startRecording}
            disabled={isProcessing}
            className={`h-20 w-20 items-center justify-center rounded-full shadow-lg ${recording ? 'bg-red-500 shadow-red-200' : 'bg-[#5FD08F] shadow-green-200'}`}
          >
            <Ionicons name={recording ? 'stop' : 'mic'} size={32} color="white" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity className="h-14 w-14 items-center justify-center rounded-full bg-gray-100">
          <Ionicons name="menu" size={24} color="#666" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
