import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  FlatList,
  Alert,
  Animated,
  Easing,
  Text,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Message } from '@/lib/types';
import { AIService } from '@/lib/services/aiService';
import { ChatMessage } from '@/components/chat/ChatMessage';
import { ChatInput } from '@/components/chat/ChatInput';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

const ThinkingIndicator = () => {
  const spinValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 2000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    ).start();
  }, []);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View className="p-4 pb-8 pt-2">
      <View className="mb-2 flex-row items-center">
        <Animated.View style={{ transform: [{ rotate: spin }] }}>
          <Ionicons name="sparkles" size={24} color="#CC5544" />
        </Animated.View>
      </View>
      <Text className="text-right font-visby text-xs text-gray-400">
        Pirinku bisa melakukan kesalahan. Periksa ulang respons.
      </Text>
    </View>
  );
};

export default function Chatbot() {
  const flatListRef = useRef<FlatList>(null);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content:
        'Halo! Saya Chef Bot Pirinku 👨‍🍳. Ada bahan apa di kulkasmu hari ini? Atau mau ide masak apa?',
      timestamp: Date.now(),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!inputText.trim() && !loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputText.trim(),
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    setLoading(true);

    try {
      const allMessages = messages.concat(userMessage);

      console.log('[Chatbot] Sending via Service:', { count: allMessages.length });

      const aiResponseContent = await AIService.sendMessage(allMessages);

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: aiResponseContent,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (error: any) {
      console.error('[Chatbot] Error calling AI:', error);
      Alert.alert('Error', 'Maaf, Chef Bot sedang sibuk. Coba lagi nanti ya!');
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Izin Ditolak',
        'Chef Bot butuh izin akses galeri untuk melihat bahan masakanmu.',
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images, // Only Images allowed
      allowsEditing: true,
      quality: 0.7,
      base64: true, // For images
    });

    if (!result.canceled && result.assets && result.assets[0]) {
      const asset = result.assets[0];

      // For images, use base64
      if (!asset.base64) {
        Alert.alert('Error', 'Gagal memproses gambar. Coba lagi.');
        return;
      }
      const base64 = `data:image/jpeg;base64,${asset.base64}`;
      const userMessage: Message = {
        id: Date.now().toString(),
        role: 'user',
        content: [
          {
            type: 'text',
            text: inputText.trim() || 'Tolong buatkan resep dari bahan di gambar ini',
          },
          { type: 'image_url', image_url: { url: base64 } },
        ],
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setInputText('');
      setLoading(true);

      try {
        const allMessages = messages.concat(userMessage);

        const aiResponseContent = await AIService.sendMessage(allMessages);

        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: aiResponseContent,
          timestamp: Date.now(),
        };

        setMessages((prev) => [...prev, aiMessage]);
      } catch (error: any) {
        console.error('Error analyzing image:', error);
        Alert.alert('Error', 'Gagal menganalisis gambar. Pastikan koneksi internet lancar.');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={100}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={({ item }) => <ChatMessage message={item} />}
          keyExtractor={(_, index) => index.toString()}
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
          ListFooterComponent={loading ? <ThinkingIndicator /> : null}
        />

        <ChatInput
          value={inputText}
          onChangeText={setInputText}
          onSend={sendMessage}
          onPickImage={pickImage}
          loading={loading}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
