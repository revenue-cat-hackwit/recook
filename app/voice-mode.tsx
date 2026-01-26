import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState, useRef } from 'react';
import {
  Text,
  TouchableOpacity,
  View,
  Alert,
  Dimensions,
  Modal,
  ScrollView,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  Easing,
  withSpring,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { createAudioPlayer } from 'expo-audio';
import { supabaseAnonKey, supabaseUrl } from '@/lib/supabase';
import { useSettingsStore } from '@/lib/store/settingsStore';
import { useAudioRecorder } from '@/lib/hooks/useAudioRecorder';
import { VoiceService } from '@/lib/services/voiceService';

import { VOICES, SPEEDS } from '@/lib/constants';
import { Message } from '@/lib/types';

export default function VoiceModeScreen() {
  const router = useRouter();
  const language = useSettingsStore((state) => state.language);
  const flatListRef = useRef<FlatList>(null);

  // --- Audio Recording Hook ---
  const handleSilence = async () => {
    console.log('Silence detected, stopping...');
    // Use Ref to break circular dependency
    if (stopRecordingRef.current) {
      const uri = await stopRecordingRef.current();
      if (uri) handleVoiceConversation(uri);
    }
  };

  // Let's try the Ref approach for circular dependency resolution
  const stopRecordingRef = useRef<() => Promise<string | null>>(async () => null);

  const handleSilenceCallback = async () => {
    console.log('Silence detected (Callback)');
    const uri = await stopRecordingRef.current();
    if (uri) handleVoiceConversation(uri);
  };

  const { isRecording, startRecording, stopRecording, cancelRecording } = useAudioRecorder({
    onSilenceDetected: handleSilenceCallback,
    silenceDuration: 2000,
    silenceThreshold: -50,
  });

  // Sync ref
  useEffect(() => {
    stopRecordingRef.current = stopRecording;
  }, [stopRecording]);

  // States
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { id: 'init', role: 'assistant', text: 'Halo! Ada yang bisa saya bantu hari ini?' },
  ]);

  // Customization State
  const [showSettings, setShowSettings] = useState(false);
  const [previewLoading, setPreviewLoading] = useState<string | null>(null);
  const [voiceConfig, setVoiceConfig] = useState({
    voiceId: 'Wise_Woman', // Default
    speed: 1.0,
    emotion: 'happy',
  });

  // Animation Value for Pulse Effect
  const imageScale = useSharedValue(1);
  const opacity = useSharedValue(0.8);

  useEffect(() => {
    // Breathing animation loop
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

  // Wrapper for manual stop
  const handleManualStop = async () => {
    const uri = await stopRecording();
    if (uri) handleVoiceConversation(uri);
  };

  const handleVoiceConversation = async (audioUri: string) => {
    setIsProcessing(true);
    setTranscript('Mendengarkan...'); // Before we send, or "Processing"...
    setTranscript('Memproses suara...');

    try {
      const data = await VoiceService.processAudio(audioUri, {
        voiceId: voiceConfig.voiceId,
        speed: voiceConfig.speed,
        emotion: voiceConfig.emotion,
        language: language,
      });

      const { transcript: text, reply, audio, silent } = data;

      // If silent
      if (silent) {
        setTranscript('');
        setIsProcessing(false);
        startRecording();
        return;
      }

      // Add to Chat UI
      const userMsgId = Date.now().toString();
      setMessages((prev) => [...prev, { id: userMsgId, role: 'user', text: text || '(Audio)' }]);

      const aiMsgId = (Date.now() + 1).toString();
      setMessages((prev) => [...prev, { id: aiMsgId, role: 'assistant', text: reply }]);

      setTranscript('...'); // Clear or small status

      // 3. Play Audio
      if (audio) {
        const player = createAudioPlayer(audio);
        player.play();

        // Auto-restart loop
        if (typeof player.addListener === 'function') {
          player.addListener('playbackStatusUpdate', (status: any) => {
            if (status.didJustFinish) {
              setTimeout(() => startRecording(), 500);
            }
          });
        }
      } else {
        // If no audio (error?), restart anyway
        setTimeout(() => startRecording(), 1000);
      }
    } catch (err: any) {
      console.error('Conversation failed', err);
      Alert.alert('Error', 'Gagal memproses suara. Coba lagi.');
    } finally {
      setIsProcessing(false);
    }
  };

  const playPreview = async (voice: (typeof VOICES)[0]) => {
    setVoiceConfig((prev) => ({ ...prev, voiceId: voice.id, emotion: voice.emotion }));

    // Play local asset to save tokens
    try {
      // Stop any previous playback if possible (cleanup needed ideally)
      const player = createAudioPlayer(voice.asset);
      player.play();
    } catch (e) {
      console.error('Preview failed', e);
      Alert.alert('Error', 'Gagal memutar preview suara.');
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.role === 'user';
    return (
      <View className={`my-2 flex-row ${isUser ? 'justify-end' : 'justify-start'}`}>
        {!isUser && (
          <View className="mr-2 h-8 w-8 items-center justify-center rounded-full bg-gray-200">
            <Ionicons name="restaurant" size={16} color="#666" />
          </View>
        )}
        <View
          className={`max-w-[75%] rounded-2xl p-4 ${
            isUser ? 'rounded-tr-sm bg-black' : 'rounded-tl-sm bg-gray-100'
          }`}
        >
          <Text className={`font-visby text-base ${isUser ? 'text-white' : 'text-gray-800'}`}>
            {item.text}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Header */}
      <View className="flex-row items-center justify-between border-b border-gray-50 px-6 pb-2 pt-4">
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={28} color="black" />
        </TouchableOpacity>
        <Text className="font-visby-bold text-xl text-black">Pirinku Voice</Text>
        <TouchableOpacity onPress={() => setShowSettings(true)}>
          <Ionicons name="options" size={28} color="black" />
        </TouchableOpacity>
      </View>

      {/* Chat Area */}
      <View className="flex-1 px-4">
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={{ paddingVertical: 20, paddingBottom: 150 }}
          showsVerticalScrollIndicator={false}
        />

        {/* Interim Transcript Overlay (Floating) */}
        {transcript ? (
          <Animated.View
            style={{ opacity: 0.8 }}
            className="absolute bottom-10 left-4 right-4 items-center"
          >
            <View className="rounded-full bg-black/70 px-6 py-3">
              <Text className="font-visby text-white">{transcript}</Text>
            </View>
          </Animated.View>
        ) : null}

        {/* Processing Indicator */}
        {isProcessing && (
          <View className="absolute bottom-4 left-0 right-0 items-center">
            <Text className="font-visby text-xs text-gray-400">Sedang memikirkan jawaban...</Text>
          </View>
        )}
      </View>

      {/* Footer Controls (Fixed Bottom) */}
      <View className="absolute bottom-0 w-full flex-row items-center justify-between border-t border-gray-100 bg-white/95 px-10 pb-8 pt-4 shadow-sm">
        <TouchableOpacity
          onPress={() => router.back()}
          className="h-12 w-12 items-center justify-center rounded-full bg-gray-50"
        >
          <Ionicons name="keypad" size={20} color="#666" />
        </TouchableOpacity>

        {/* Big Mic Button with Pulse Ring */}
        <View className="-mt-8 items-center justify-center">
          {isRecording && (
            <Animated.View
              style={[animatedStyle]}
              className="absolute h-24 w-24 rounded-full bg-red-100 opacity-50"
            />
          )}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={isRecording ? handleManualStop : startRecording}
            disabled={isProcessing}
            className={`h-20 w-20 items-center justify-center rounded-full shadow-lg ${isRecording ? 'bg-red-500 shadow-red-200' : 'bg-[#5FD08F] shadow-green-200'}`}
          >
            {isProcessing ? (
              <ActivityIndicator color="white" />
            ) : (
              <Ionicons name={isRecording ? 'stop' : 'mic'} size={32} color="white" />
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity className="h-12 w-12 items-center justify-center rounded-full bg-gray-50">
          <Ionicons name="menu" size={20} color="#666" />
        </TouchableOpacity>
      </View>

      {/* Settings Modal (Bottom Sheet Style) */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showSettings}
        onRequestClose={() => setShowSettings(false)}
      >
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}
          activeOpacity={1}
          onPress={() => setShowSettings(false)}
        >
          <View style={{ flex: 1, justifyContent: 'flex-end' }}>
            <TouchableOpacity
              activeOpacity={1}
              onPress={() => {}}
              style={{
                backgroundColor: '#F9F9F9',
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
                padding: 24,
                paddingBottom: 40,
              }}
            >
              {/* Drag Handle */}
              <View className="mb-6 h-1.5 w-12 self-center rounded-full bg-gray-300" />

              <Text className="mb-6 text-center font-visby-bold text-lg text-black">
                Pilih Suara
              </Text>

              {/* Voice Carousel */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                className="mb-8"
                contentContainerStyle={{ paddingHorizontal: 4 }}
              >
                {VOICES.map((voice) => (
                  <TouchableOpacity
                    key={voice.id}
                    onPress={() => playPreview(voice)}
                    disabled={previewLoading !== null}
                    className={`mr-4 h-40 w-40 items-center justify-center rounded-2xl border-2 p-4 ${
                      voiceConfig.voiceId === voice.id
                        ? 'border-black bg-white'
                        : 'border-transparent bg-gray-200'
                    }`}
                  >
                    {previewLoading === voice.id ? (
                      <ActivityIndicator color="black" />
                    ) : (
                      <Ionicons
                        name={
                          voiceConfig.voiceId === voice.id ? 'radio-button-on' : 'radio-button-off'
                        }
                        size={24}
                        color={voiceConfig.voiceId === voice.id ? 'black' : 'gray'}
                        style={{ marginBottom: 12 }}
                      />
                    )}
                    <Text className="text-center font-visby-bold text-lg text-black">
                      {voice.name.length > 12 ? voice.name.substring(0, 10) + '...' : voice.name}
                    </Text>
                    <Text className="text-center font-visby text-sm text-gray-500">
                      {voice.description}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text className="mb-4 text-center font-visby-bold text-lg text-black">
                Pilih Kecepatan
              </Text>

              {/* Speed Toggles */}
              <View className="flex-row justify-between gap-3">
                {SPEEDS.map((speed) => (
                  <TouchableOpacity
                    key={speed.value}
                    onPress={() => setVoiceConfig((prev) => ({ ...prev, speed: speed.value }))}
                    className={`flex-1 items-center justify-center rounded-xl border py-4 ${
                      voiceConfig.speed === speed.value
                        ? 'border-black bg-black'
                        : 'border-gray-300 bg-white'
                    }`}
                  >
                    <Text
                      className={`font-visby-bold ${voiceConfig.speed === speed.value ? 'text-white' : 'text-black'}`}
                    >
                      {speed.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}
