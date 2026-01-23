import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';

interface Message {
  role: 'user' | 'assistant';
  content: string | { type: 'text' | 'image_url'; text?: string; image_url?: { url: string } }[];
  timestamp: Date;
}

export default function Chatbot() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Halo! Saya AI asisten untuk Pirinku. Apa yang bisa saya bantu hari ini?',
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

      if (error) {
        throw error;
      }

      const aiMessage: Message = {
        role: 'assistant',
        content: data.data.message,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      console.error('Error calling AI:', error);
      Alert.alert('Error', 'Gagal mengirim pesan. Coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Izinkan akses galeri untuk upload gambar.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled) {
      const base64 = `data:image/jpeg;base64,${result.assets[0].base64}`;
      const userMessage: Message = {
        role: 'user',
        content: [
          { type: 'text', text: inputText.trim() || 'Lihat gambar ini' },
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

        if (error) {
          throw error;
        }

        const aiMessage: Message = {
          role: 'assistant',
          content: data.data.message,
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, aiMessage]);
      } catch (error) {
        console.error('Error calling AI:', error);
        Alert.alert('Error', 'Gagal menganalisis gambar. Coba lagi.');
      } finally {
        setLoading(false);
      }
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.role === 'user';
    return (
      <View
        className={`mb-4 max-w-[80%] rounded-lg p-3 ${isUser ? 'self-end bg-blue-500' : 'self-start bg-gray-200'}`}
      >
        {typeof item.content === 'string' ? (
          <Text className={isUser ? 'text-white' : 'text-black'}>{item.content}</Text>
        ) : (
          <View>
            {item.content.map((part, index) => (
              <View key={index}>
                {part.type === 'text' && (
                  <Text className={isUser ? 'text-white' : 'text-black'}>{part.text}</Text>
                )}
                {part.type === 'image_url' && part.image_url && (
                  <Image source={{ uri: part.image_url.url }} className="mt-2 h-32 w-32 rounded" />
                )}
              </View>
            ))}
          </View>
        )}
        <Text className={`mt-1 text-xs ${isUser ? 'text-blue-200' : 'text-gray-500'}`}>
          {item.timestamp.toLocaleTimeString()}
        </Text>
      </View>
    );
  };

  return (
    <View className="flex-1 bg-white">
      <FlatList
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item, index) => index.toString()}
        className="flex-1 p-4"
        inverted={false}
        onContentSizeChange={() => {}}
        onLayout={() => {}}
      />
      {loading && (
        <View className="flex-row items-center p-4">
          <ActivityIndicator size="small" color="#3b82f6" />
          <Text className="ml-2 text-gray-600">AI sedang berpikir...</Text>
        </View>
      )}
      <View className="flex-row items-center border-t border-gray-200 p-4">
        <TouchableOpacity onPress={pickImage} disabled={loading} className="mr-2 p-2">
          <Ionicons name="image" size={24} color={loading ? '#ccc' : '#3b82f6'} />
        </TouchableOpacity>
        <TextInput
          value={inputText}
          onChangeText={setInputText}
          placeholder="Ketik pesan atau upload gambar..."
          className="mr-2 flex-1 rounded-lg border border-gray-300 px-3 py-2"
          multiline
        />
        <TouchableOpacity
          onPress={sendMessage}
          disabled={loading}
          className={`rounded-lg p-2 ${loading ? 'bg-gray-300' : 'bg-blue-500'}`}
        >
          <Ionicons name="send" size={20} color="white" />
        </TouchableOpacity>
      </View>
    </View>
  );
}
