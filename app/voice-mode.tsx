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
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import { createAudioPlayer } from 'expo-audio';
import { supabaseAnonKey, supabaseUrl } from '@/lib/supabase';
import { useSettingsStore } from '@/lib/store/settingsStore';

// --- Voice Options Configuration (6 Voices) ---
const VOICES = [
  {
    id: 'Wise_Woman',
    name: 'Wise Woman',
    emotion: 'happy',
    description: 'Wanita Bijak',
    asset: require('../assets/voices/Wise_Woman_asset.mp3'),
  },
  {
    id: 'Friendly_Person',
    name: 'Friendly',
    emotion: 'happy',
    description: 'Sahabat',
    asset: require('../assets/voices/Friendly_Person_asset.mp3'),
  },
  {
    id: 'Deep_Voice_Man',
    name: 'Deep Voice',
    emotion: 'neutral',
    description: 'Pria Dewasa',
    asset: require('../assets/voices/Deep_Voice_Man_asset.mp3'),
  },
  {
    id: 'Lively_Girl',
    name: 'Lively Girl',
    emotion: 'happy',
    description: 'Ceria',
    asset: require('../assets/voices/Lively_Girl_asset.mp3'),
  },
  {
    id: 'Young_Knight',
    name: 'Knight',
    emotion: 'neutral',
    description: 'Pria Muda',
    asset: require('../assets/voices/Young_Knight_asset.mp3'),
  },
  {
    id: 'Sweet_Girl_2',
    name: 'Sweet Girl',
    emotion: 'happy',
    description: 'Manis',
    asset: require('../assets/voices/Sweet_Girl_2_asset.mp3'),
  },
];

const SPEEDS = [
  { value: 0.8, label: 'Lambat' },
  { value: 1.0, label: 'Normal' },
  { value: 1.2, label: 'Cepat' },
];

interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
}

export default function VoiceModeScreen() {
  const router = useRouter();
  const language = useSettingsStore((state) => state.language);
  const flatListRef = useRef<FlatList>(null);

  // States
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { id: 'init', role: 'assistant', text: 'Halo! Ada yang bisa saya bantu hari ini?' }, // Initial greeting
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

  // Auto-scroll when messages change
  useEffect(() => {
    if (flatListRef.current && messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 200);
    }
  }, [messages]);

  // Hook-based event listeners
  useSpeechRecognitionEvent('start', () => setIsRecording(true));
  useSpeechRecognitionEvent('end', () => setIsRecording(false));

  useSpeechRecognitionEvent('result', (event) => {
    if (event.results && event.results[0]?.transcript) {
      setTranscript(event.results[0].transcript); // Show interim
    }

    if (event.isFinal && event.results[0]?.transcript) {
      if (isProcessing) return; // Prevent duplicate requests
      const userText = event.results[0].transcript;
      setTranscript(''); // Clear transcript
      handleVoiceConversation(userText);
    }
  });

  useSpeechRecognitionEvent('error', (event) => {
    console.error('[Voice Mode] Error:', event.error, event.message);
    setIsRecording(false);
    setIsProcessing(false);
    // Ignore harmless errors
    if (event.error !== 'no-speech' && event.error !== 'aborted') {
      // Optional: Show toast instead of Alert
    }
  });

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: imageScale.value }],
      opacity: opacity.value,
    };
  });

  async function startRecording() {
    try {
      const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!result.granted) {
        Alert.alert('Izin Ditolak', 'Mohon izinkan akses mikrofon untuk mendikte.');
        return;
      }

      setTranscript('');
      const langCode = language === 'id' ? 'id-ID' : language === 'en' ? 'en-US' : 'id-ID';

      ExpoSpeechRecognitionModule.start({
        lang: langCode,
        interimResults: true,
        maxAlternatives: 1,
        continuous: false,
      });
    } catch (err) {
      console.error('Failed to start voice recognition', err);
      setIsRecording(false);
    }
  }

  async function stopRecording() {
    try {
      ExpoSpeechRecognitionModule.stop();
    } catch (err) {
      console.error('Stop error', err);
    }
  }

  const handleVoiceConversation = async (userText: string) => {
    setIsProcessing(true);

    // 1. Add User Message immediately
    const userMsgId = Date.now().toString();
    setMessages((prev) => [...prev, { id: userMsgId, role: 'user', text: userText }]);

    try {
      const token = supabaseAnonKey;
      if (!token) throw new Error('No Auth Token available');

      const FUNCTION_URL = `${supabaseUrl}/functions/v1/voice-processor`;

      const payload = {
        text: userText,
        config: {
          voiceId: voiceConfig.voiceId,
          speed: voiceConfig.speed,
          emotion: voiceConfig.emotion,
          language: language, // Send 'id' or 'en' from store
        },
      };

      const response = await fetch(FUNCTION_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Server Error ${response.status}`);
      }

      const data = await response.json();
      const { reply, audio } = data;

      // 2. Add Assistant Message
      const aiMsgId = (Date.now() + 1).toString();
      setMessages((prev) => [...prev, { id: aiMsgId, role: 'assistant', text: reply }]);

      // 3. Play Audio
      if (audio) {
        const player = createAudioPlayer(audio);
        player.play();
      }
    } catch (err: any) {
      console.error('Conversation failed', err);
      // Optional: Add error message to chat
      setMessages((prev) => [
        ...prev,
        { id: Date.now().toString(), role: 'assistant', text: 'Maaf, terjadi kesalahan koneksi.' },
      ]);
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
            onPress={isRecording ? stopRecording : startRecording}
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
