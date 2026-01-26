import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import Markdown from 'react-native-markdown-display';
import { Message } from '@/lib/types';

interface ChatMessageProps {
  message: Message;
}

export const ChatMessage = ({ message }: ChatMessageProps) => {
  const isUser = message.role === 'user';

  const markdownStyles = {
    body: {
      color: isUser ? '#FFFFFF' : '#1F2937',
      fontFamily: 'VisbyCF-Regular',
      fontSize: 16,
      lineHeight: 22,
    },
    code_inline: {
      backgroundColor: isUser ? '#3B82F6' : '#E5E7EB',
      borderRadius: 4,
      paddingHorizontal: 4,
      fontFamily: 'Courier',
    },
    fence: {
      backgroundColor: isUser ? '#1D4ED8' : '#F3F4F6',
      borderColor: isUser ? '#1E40AF' : '#E5E7EB',
    },
  };

  const content = message.content || message.text || '';
  const timestamp = message.timestamp || Date.now();

  return (
    <View
      className={`mb-4 max-w-[80%] rounded-2xl p-4 ${
        isUser ? 'self-end rounded-br-none bg-blue-500' : 'self-start rounded-bl-none bg-gray-100'
      }`}
    >
      {typeof content === 'string' ? (
        <Markdown style={markdownStyles}>{content}</Markdown>
      ) : (
        <View>
          {content.map((part, index) => (
            <View key={index}>
              {part.type === 'text' && <Markdown style={markdownStyles}>{part.text}</Markdown>}
              {part.type === 'image_url' && part.image_url && (
                <Image
                  source={{ uri: part.image_url.url }}
                  className="mt-2 h-40 w-full rounded-lg bg-gray-200"
                  resizeMode="cover"
                />
              )}
              {part.type === 'video_url' && part.video_url && (
                <View className="mt-2 h-48 w-full overflow-hidden rounded-lg bg-gray-900">
                  <Video
                    source={{ uri: part.video_url.url }}
                    style={{ width: '100%', height: '100%' }}
                    resizeMode={ResizeMode.CONTAIN}
                    useNativeControls
                    shouldPlay={false}
                  />
                </View>
              )}
            </View>
          ))}
        </View>
      )}
      <Text
        className={`mt-1 text-[10px] ${
          isUser ? 'text-blue-100' : 'text-gray-400'
        } text-right font-visby`}
      >
        {new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </Text>
    </View>
  );
};
