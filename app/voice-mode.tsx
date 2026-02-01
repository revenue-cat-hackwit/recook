import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState, useRef } from 'react';
import {
  Text,
  TouchableOpacity,
  View,
  Alert,
  Modal,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  Easing,
  withSpring,
  withSequence,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { createAudioPlayer } from 'expo-audio';
import { useSettingsStore } from '@/lib/store/settingsStore';
import { useAudioRecorder } from '@/lib/hooks/useAudioRecorder';
import { VoiceService } from '@/lib/services/voiceService';
import * as Haptics from 'expo-haptics';

import { VOICES, SPEEDS } from '@/lib/constants';

// --- COMPONENTS ---

// 1. Orb Component (Siri Style)
const VoiceOrb = ({ state }: { state: 'idle' | 'listening' | 'processing' | 'speaking' }) => {
  // Animation Values
  const scale = useSharedValue(1);
  const coreScale = useSharedValue(1);
  const opacity = useSharedValue(0.8);
  const rotate = useSharedValue(0);

  useEffect(() => {
    // Continuous rotation for "alive" feel
    rotate.value = withRepeat(
      withTiming(360, { duration: 10000, easing: Easing.linear }),
      -1,
      false,
    );

    switch (state) {
      case 'idle':
        scale.value = withRepeat(
          withTiming(1.1, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
          -1,
          true,
        );
        coreScale.value = withSpring(1);
        opacity.value = withTiming(0.6);
        break;
      case 'listening':
        scale.value = withRepeat(
          withTiming(1.4, { duration: 800, easing: Easing.inOut(Easing.ease) }),
          -1,
          true,
        );
        coreScale.value = withSpring(1.2);
        opacity.value = withTiming(0.9);
        break;
      case 'processing':
        scale.value = withRepeat(
          withSequence(withTiming(1.2, { duration: 200 }), withTiming(0.9, { duration: 200 })),
          -1,
          true,
        );
        coreScale.value = withSpring(0.8);
        opacity.value = withTiming(0.5);
        break;
      case 'speaking':
        scale.value = withRepeat(
          withTiming(1.3, { duration: 600, easing: Easing.inOut(Easing.ease) }),
          -1,
          true,
        );
        coreScale.value = withSequence(
          withTiming(1.1, { duration: 300 }),
          withTiming(0.9, { duration: 300 }),
        );
        opacity.value = withTiming(1);
        break;
    }
  }, [state]);

  const outerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const coreStyle = useAnimatedStyle(() => ({
    transform: [{ scale: coreScale.value }, { rotate: `${rotate.value}deg` }],
  }));

  // Colors based on state
  const getColors = () => {
    switch (state) {
      case 'listening':
        return ['#4F46E5', '#3B82F6', '#60A5FA']; // Blue-ish for listening
      case 'speaking':
        return ['#8BD65E', '#4ADE80', '#86EFAC']; // Green (Brand) for AI speaking
      case 'processing':
        return ['#9333EA', '#A855F7', '#D8B4FE']; // Purple for thinking
      default:
        return ['#3B82F6', '#60A5FA', '#93C5FD']; // Idle Blue
    }
  };
  const colors = getColors();

  return (
    <View className="h-80 w-80 items-center justify-center">
      {/* Outer Glow Ring */}
      <Animated.View
        style={[
          outerStyle,
          {
            backgroundColor: colors[2],
            shadowColor: colors[1],
            shadowRadius: 40,
            shadowOpacity: 0.5,
          },
        ]}
        className="absolute h-64 w-64 rounded-full opacity-30 blur-3xl"
      />

      {/* Middle Ring */}
      <Animated.View
        style={[outerStyle, { backgroundColor: colors[1] }]}
        className="absolute h-56 w-56 rounded-full opacity-40"
      />

      {/* Core Orb */}
      <Animated.View
        style={[coreStyle, styles.orbShadow, { backgroundColor: colors[0] }]}
        className="h-48 w-48 items-center justify-center overflow-hidden rounded-full border-4 border-white/20"
      >
        {/* Inner details to make it look like an Orb */}
        <View className="absolute top-0 h-1/2 w-full bg-white/10" />
        <View className="absolute bottom-4 right-4 h-12 w-12 rounded-full bg-white/20 blur-xl" />
      </Animated.View>
    </View>
  );
};

export default function VoiceModeScreen() {
  const router = useRouter();
  const language = useSettingsStore((state) => state.language);
  const currentPreviewPlayer = useRef<any>(null);

  // --- LOGIC ---
  const stopRecordingRef = useRef<() => Promise<string | null>>(async () => null);

  // States
  const [status, setStatus] = useState<'idle' | 'listening' | 'processing' | 'speaking'>('idle');
  const [transcript, setTranscript] = useState(''); // What user said
  const [aiResponse, setAiResponse] = useState('Ngomong apa aja yang kamu punya...');

  // Customization
  const [showSettings, setShowSettings] = useState(false);
  const [voiceConfig, setVoiceConfig] = useState({
    voiceId: 'Wise_Woman',
    speed: 1.0,
    emotion: 'happy',
  });

  const handleSilenceCallback = async () => {
    console.log('Silence detected');
    const uri = await stopRecordingRef.current();
    if (uri) handleVoiceConversation(uri);
  };

  const { isRecording, startRecording, stopRecording, cancelRecording } = useAudioRecorder({
    onSilenceDetected: handleSilenceCallback,
    silenceDuration: 2000,
    silenceThreshold: -50,
  });

  useEffect(() => {
    stopRecordingRef.current = stopRecording;
    if (isRecording) setStatus('listening');
    // If stopped recording but not yet speaking/processing, we assume processing starts soon inside handleVoiceConversation
  }, [isRecording, stopRecording]);

  useEffect(() => {
    return () => {
      cancelRecording();
      if (currentPreviewPlayer.current)
        try {
          currentPreviewPlayer.current.pause();
        } catch (e) {}
    };
  }, []);

  const handleManualStop = async () => {
    const uri = await stopRecording();
    if (uri) handleVoiceConversation(uri);
  };

  const handleToggleRecord = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (status === 'listening') {
      handleManualStop();
    } else if (status === 'speaking' || status === 'processing') {
      // Interrupt AI
      if (currentPreviewPlayer.current)
        try {
          currentPreviewPlayer.current.pause();
        } catch (e) {}
      startRecording();
    } else {
      startRecording();
    }
  };

  const playPreview = async (voice: (typeof VOICES)[0]) => {
    // Stop any previous playback
    if (currentPreviewPlayer.current) {
      try {
        currentPreviewPlayer.current.pause();
      } catch (e) {
        console.log('Error pausing previous player:', e);
      }
    }

    setVoiceConfig((prev) => ({ ...prev, voiceId: voice.id }));

    // Play local asset
    try {
      const player = createAudioPlayer(voice.asset);
      currentPreviewPlayer.current = player;
      player.play();
    } catch (e) {
      console.error('Preview fail', e);
    }
  };

  // MAIN LOGIC
  const handleVoiceConversation = async (audioUri: string) => {
    setStatus('processing');

    try {
      const data = await VoiceService.processAudio(audioUri, {
        voiceId: voiceConfig.voiceId,
        speed: voiceConfig.speed,
        emotion: voiceConfig.emotion,
        language: language,
      });

      const { transcript: text, reply, audio, silent } = data;

      if (silent) {
        setStatus('idle');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        startRecording(); // optionally just restart loop
        return;
      }

      setTranscript(text || '');
      setAiResponse(reply);
      setStatus('speaking');

      if (audio) {
        if (currentPreviewPlayer.current)
          try {
            currentPreviewPlayer.current.pause();
          } catch (e) {}
        const player = createAudioPlayer(audio);
        currentPreviewPlayer.current = player;
        player.play();

        if (typeof player.addListener === 'function') {
          const listener = player.addListener('playbackStatusUpdate', (s: any) => {
            if (s.didJustFinish) {
              listener.remove();
              setStatus('idle');
            }
          });
        }
      } else {
        setStatus('idle');
      }
    } catch (err: any) {
      console.error('Conversation failed', err);
      setAiResponse('Maaf, saya tidak mendengar dengan jelas.');
      setStatus('idle');
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* HEADER */}
      <View className="absolute left-0 right-0 top-[50px] z-10 w-full flex-row items-center justify-between px-6 py-4">
        <TouchableOpacity
          onPress={() => router.back()}
          className="h-10 w-10 items-center justify-center rounded-full bg-gray-100"
        >
          <Ionicons name="chevron-down" size={24} color="black" />
        </TouchableOpacity>
        <Text className="font-visby-bold text-lg">Pirinku Voice</Text>
        <TouchableOpacity
          onPress={() => setShowSettings(true)}
          className="h-10 w-10 items-center justify-center rounded-full bg-gray-100"
        >
          <Ionicons name="settings-outline" size={20} color="black" />
        </TouchableOpacity>
      </View>

      {/* MAIN CONTENT CENTER */}
      <View className="flex-1 items-center justify-center px-6">
        {/* Helper Text (AI Response) */}
        {!isRecording && status !== 'processing' && (
          <Animated.View className="absolute top-[15%] mb-10 w-full">
            <Text className="px-4 text-center font-visby-bold text-2xl leading-8 text-gray-900">
              {aiResponse}
            </Text>
          </Animated.View>
        )}

        {/* ORB VISUALIZATION */}
        <VoiceOrb state={status} />

        {/* User Transcript (Live/Last) */}
        {(status === 'listening' || status === 'processing') && (
          <Animated.View className="absolute bottom-[25%] mt-10 rounded-2xl border border-gray-100 bg-gray-50 px-6 py-3 opacity-90">
            <Text className="text-center font-visby text-lg text-gray-600">
              {transcript || (status === 'listening' ? 'Mendengarkan...' : 'Berpikir...')}
            </Text>
          </Animated.View>
        )}
      </View>

      {/* FOOTER CONTROLS */}
      <View className="absolute bottom-12 w-full flex-row items-center justify-evenly px-10">
        <TouchableOpacity className="h-14 w-14 items-center justify-center rounded-full bg-gray-100">
          <Ionicons name="keypad-outline" size={24} color="black" />
        </TouchableOpacity>

        {/* MAIN MIC BUTTON */}
        <View>
          {/* Pulse Ring */}
          {status === 'listening' && (
            <View className="absolute -left-4 -top-4 h-28 w-28 animate-ping rounded-full border-2 border-[#5FD08F] opacity-30" />
          )}

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleToggleRecord}
            className={`h-20 w-20 transform items-center justify-center rounded-full shadow-xl transition-all 
              ${status === 'listening' ? 'scale-110 bg-red-500' : 'bg-[#5FD08F]'}
            `}
            style={{
              elevation: 10,
              shadowColor: status === 'listening' ? '#EF4444' : '#5FD08F',
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.4,
              shadowRadius: 10,
            }}
          >
            {status === 'processing' ? (
              <ActivityIndicator color="white" size="large" />
            ) : (
              <Ionicons name={status === 'listening' ? 'stop' : 'mic'} size={36} color="white" />
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          onPress={() => setShowSettings(true)}
          className="h-14 w-14 items-center justify-center rounded-full bg-gray-100"
        >
          <Ionicons name="list-outline" size={24} color="black" />
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
                Select Voice
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
                    className={`mr-4 h-40 w-40 items-center justify-center rounded-2xl border-2 p-4 ${
                      voiceConfig.voiceId === voice.id
                        ? 'border-black bg-white'
                        : 'border-transparent bg-gray-200'
                    }`}
                  >
                    <Ionicons
                      name={
                        voiceConfig.voiceId === voice.id ? 'radio-button-on' : 'radio-button-off'
                      }
                      size={24}
                      color={voiceConfig.voiceId === voice.id ? 'black' : 'gray'}
                      style={{ marginBottom: 12 }}
                    />
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
                Select Speed
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

const styles = StyleSheet.create({
  orbShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 20,
  },
});
