import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';

// Hooks & Services
import { Recipe } from '@/lib/types';
import { useAudioRecorder } from '@/lib/hooks/useAudioRecorder';
import { VoiceService } from '@/lib/services/voiceService';

const { width } = Dimensions.get('window');

export default function CookingModeScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  // Recipe State
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [fontSize, setFontSize] = useState(24);

  // Voice State
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Animation for Mic
  const micScale = useSharedValue(1);

  // --- 1. SETUP AUDIO RECORDER ---
  // Create a ref for the stop function to avoid circular dependency in the callback
  const stopRecordingRef = useRef<() => Promise<string | null>>(async () => null);

  const handleSilenceCallback = async () => {
    console.log('[CookingMode] Silence detected, processing command...');
    const uri = await stopRecordingRef.current();
    if (uri) handleVoiceCommand(uri);
  };

  const { startRecording, stopRecording, isRecording, metering } = useAudioRecorder({
    onSilenceDetected: handleSilenceCallback,
    silenceDuration: 1500, // Faster/shorter silence detection for commands
    silenceThreshold: -40,
  });

  // Sync the ref
  useEffect(() => {
    stopRecordingRef.current = stopRecording;
  }, [stopRecording]);

  useEffect(() => {
    // Pulse animation when recording
    if (isRecording) {
      micScale.value = withRepeat(
        withTiming(1.2, { duration: 500, easing: Easing.inOut(Easing.ease) }),
        -1,
        true,
      );
    } else {
      micScale.value = withTiming(1);
    }
  }, [isRecording]);

  const micAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: micScale.value }],
  }));

  // --- 2. PARSE RECIPE ---
  useEffect(() => {
    if (params.recipe) {
      try {
        const parsed = JSON.parse(params.recipe as string);
        setRecipe(parsed);
      } catch (e) {
        console.error('Failed to parse recipe', e);
      }
    }
  }, [params]);

  // --- 3. COMMAND PROCESSOR ---
  const handleVoiceCommand = async (audioUri: string) => {
    try {
      setIsProcessing(true);
      setTranscript('Processing...');

      // Send to Backend (SST Only)
      const result = await VoiceService.processAudio(audioUri, { language: 'en' }, true);

      const commandText = result.transcript.toLowerCase().trim();
      console.log('[CookingMode] Command:', commandText);
      setTranscript(`"${commandText}"`);

      // Simple Command Matching
      if (
        commandText.includes('next') ||
        commandText.includes('continue') ||
        commandText.includes('lanjut')
      ) {
        handleNext();
      } else if (
        commandText.includes('back') ||
        commandText.includes('previous') ||
        commandText.includes('ulang') ||
        commandText.includes('mundur')
      ) {
        handlePrev();
      } else if (
        commandText.includes('stop') ||
        commandText.includes('exit') ||
        commandText.includes('keluar')
      ) {
        router.back();
      } else {
        // No match - maybe restart listening automatically?
        // For now, let user tap mic again to save battery/reduce annoyance
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } catch (e) {
      console.error('Voice Command Error', e);
      setTranscript('Error');
    } finally {
      setIsProcessing(false);
      setIsListening(false); // Toggle off, user needs to tap to listen again (or make it loop)
    }
  };

  const toggleListening = () => {
    if (isListening) {
      setIsListening(false);
      stopRecording();
    } else {
      setIsListening(true);
      setTranscript('Listening for "Next", "Back"...');
      startRecording();
    }
  };

  // --- NAVIGATION HANDLERS ---
  const currentStep = recipe?.steps[currentStepIndex];
  const totalSteps = recipe?.steps.length || 0;
  const progress = ((currentStepIndex + 1) / totalSteps) * 100;

  const handleNext = () => {
    if (currentStepIndex < totalSteps - 1) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      setCurrentStepIndex((prev) => prev + 1);
      setTranscript('Next Step');
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTranscript('Bon Appétit!');
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setCurrentStepIndex((prev) => prev - 1);
      setTranscript('Previous Step');
    }
  };

  if (!recipe) return <View className="flex-1 bg-gray-900" />;

  return (
    <SafeAreaView className="flex-1 bg-gray-900">
      {/* Header */}
      <View className="flex-row items-center justify-between px-6 py-4">
        <TouchableOpacity onPress={() => router.back()} className="rounded-full bg-gray-800 p-2">
          <Ionicons name="close" size={24} color="white" />
        </TouchableOpacity>
        <Text className="font-visby-bold text-sm uppercase tracking-wide text-white opacity-70">
          Voice Cooking Mode
        </Text>
        <TouchableOpacity onPress={() => setFontSize((prev) => (prev === 24 ? 32 : 24))}>
          <Ionicons name="text" size={24} color="white" />
        </TouchableOpacity>
      </View>

      {/* Progress Bar */}
      <View className="h-2 w-full bg-gray-800">
        <View style={{ width: `${progress}%` }} className="h-full rounded-r-full bg-green-500" />
      </View>

      {/* Main Content */}
      <View className="flex-1 justify-center px-8">
        <View className="mb-6 flex-row items-center">
          <View className="mr-4 h-12 w-12 items-center justify-center rounded-full bg-green-500">
            <Text className="font-visby-bold text-xl text-black">{currentStep?.step}</Text>
          </View>
          <Text className="font-visby text-lg text-gray-400">
            Step {currentStepIndex + 1} of {totalSteps}
          </Text>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          <Text
            style={{ fontSize: fontSize, lineHeight: fontSize * 1.5 }}
            className="text-left font-visby-bold text-white"
          >
            {currentStep?.instruction}
          </Text>
        </ScrollView>

        {/* Transcript Overlay */}
        <View className="h-10 items-center justify-center">
          {transcript ? (
            <Text className="font-visby text-sm text-green-400">{transcript}</Text>
          ) : null}
        </View>
      </View>

      {/* Controls */}
      <View className="px-6 pb-8">
        {/* Mic / Listen Button */}
        <View className="mb-8 items-center">
          <TouchableOpacity activeOpacity={0.8} onPress={toggleListening} disabled={isProcessing}>
            <Animated.View
              style={[micAnimatedStyle]}
              className={`h-20 w-20 items-center justify-center rounded-full ${isListening ? 'bg-red-500' : 'bg-gray-700'}`}
            >
              {isProcessing ? (
                <ActivityIndicator color="white" />
              ) : (
                <Ionicons
                  name={isListening ? 'mic' : 'mic-off'}
                  size={32}
                  color={isListening ? 'white' : '#999'}
                />
              )}
            </Animated.View>
          </TouchableOpacity>
          <Text className="mt-3 text-xs text-gray-500">
            {isListening ? "Say 'Next', 'Back', or 'Stop'" : 'Tap mic to enable Voice Control'}
          </Text>
        </View>

        <View className="flex-row justify-between gap-4">
          <TouchableOpacity
            onPress={handlePrev}
            disabled={currentStepIndex === 0}
            className={`flex-1 items-center justify-center rounded-2xl py-6 ${currentStepIndex === 0 ? 'bg-gray-800 opacity-50' : 'bg-gray-800'}`}
          >
            <Ionicons name="chevron-back" size={32} color="white" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleNext}
            className="flex-[2] items-center justify-center rounded-2xl bg-green-500 py-6 shadow-lg shadow-green-900"
          >
            <Text className="font-visby-bold text-xl text-black">
              {currentStepIndex === totalSteps - 1 ? 'Finish!' : 'Next'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}
