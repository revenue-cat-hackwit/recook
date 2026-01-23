import React, { useState, useRef } from 'react';
import { View, FlatList, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/lib/supabase';
import { Message } from '@/lib/types';
import { ChatMessage } from '@/components/chat/ChatMessage';
import { ChatInput } from '@/components/chat/ChatInput';

export default function Chatbot() {
  const flatListRef = useRef<FlatList>(null);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content:
        'Halo! Saya Chef Bot Pirinku 👨‍🍳. Ada bahan apa di kulkasmu hari ini? Atau mau ide masak apa?',
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!inputText.trim() && !loading) return;

    const userMessage: Message = {
      role: 'user',
      content: inputText.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    setLoading(true);

    try {
      const apiMessages = messages.concat(userMessage).map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

      const { data, error } = await supabase.functions.invoke('ai-assistant', {
        body: {
          messages: apiMessages,
          max_tokens: 1000,
          temperature: 0.7,
        },
      });

      if (error) throw error;

      const aiMessage: Message = {
        role: 'assistant',
        content: data.data.message,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (error: any) {
      console.error('Error calling AI:', error);
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
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled && result.assets && result.assets[0].base64) {
      const base64 = `data:image/jpeg;base64,${result.assets[0].base64}`;
      const userMessage: Message = {
        role: 'user',
        content: [
          {
            type: 'text',
            text: inputText.trim() || 'Tolong buatkan resep dari bahan di gambar ini',
          },
          { type: 'image_url', image_url: { url: base64 } },
        ],
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setInputText('');
      setLoading(true);

      try {
        const apiMessages = messages.concat(userMessage).map((msg) => ({
          role: msg.role,
          content: msg.content,
        }));

        const { data, error } = await supabase.functions.invoke('ai-assistant', {
          body: {
            messages: apiMessages,
            max_tokens: 1000,
            temperature: 0.7,
          },
        });

        if (error) throw error;

        const aiMessage: Message = {
          role: 'assistant',
          content: data.data.message,
          timestamp: new Date(),
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
    <View className="flex-1 bg-white">
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={({ item }) => <ChatMessage message={item} />}
        keyExtractor={(_, index) => index.toString()}
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
      />

      <ChatInput
        value={inputText}
        onChangeText={setInputText}
        onSend={sendMessage}
        onPickImage={pickImage}
        loading={loading}
      />
    </View>
  );
}
