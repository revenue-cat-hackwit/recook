import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import Markdown from 'react-native-markdown-display';
import { Message } from '@/lib/types';

interface ChatMessageProps {
  message: Message;
  onSaveRecipe?: (content: string) => void;
  onGetIdeas?: () => void;
}

export const ChatMessage = ({ message, onSaveRecipe, onGetIdeas }: ChatMessageProps) => {
  const isUser = message.role === 'user';

  // Detect if message contains a recipe (has ingredients and instructions)
  const content = message.content || message.text || '';
  const contentStr = typeof content === 'string' ? content : '';

  const hasRecipe =
    !isUser &&
    (contentStr.includes('Bahan') || contentStr.includes('Ingredients')) &&
    (contentStr.includes('Cara') ||
      contentStr.includes('Instructions') ||
      contentStr.includes('Steps'));

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

  const timestamp = message.timestamp || Date.now();

  return (
    <View className={`mb-4 flex-row ${isUser ? 'justify-end' : 'justify-start'}`}>
      {/* Cooki Avatar for Assistant */}
      {!isUser && (
        <Image
          source={require('@/assets/images/cooki.png')}
          className="mr-2 h-10 w-10 rounded-full"
          resizeMode="contain"
        />
      )}

      <View
        className={`max-w-[75%] rounded-2xl p-4 ${
          isUser ? 'rounded-br-none bg-[#8BD65E]' : 'rounded-tl-none bg-gray-100'
        }`}
      >
        {/* Cooki Name Tag */}
        {!isUser && <Text className="mb-1 font-visby-bold text-xs text-gray-500">Cooki</Text>}

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
            isUser ? 'text-white/70' : 'text-gray-400'
          } text-right font-visby`}
        >
          {new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>

      {/* Inline Action Buttons - Only show for Cooki messages with recipes */}
      {hasRecipe && (
        <View className="mt-2 flex-row gap-2">
          <TouchableOpacity
            onPress={() => onSaveRecipe?.(contentStr)}
            className="flex-1 flex-row items-center justify-center gap-1.5 rounded-lg border border-green-100 bg-green-50 px-3 py-2"
          >
            <Ionicons name="bookmark" size={14} color="#10B981" />
            <Text className="font-visby-bold text-xs text-green-700">Save Recipe</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onGetIdeas}
            className="flex-1 flex-row items-center justify-center gap-1.5 rounded-lg border border-orange-100 bg-orange-50 px-3 py-2"
          >
            <Ionicons name="bulb" size={14} color="#F97316" />
            <Text className="font-visby-bold text-xs text-orange-700">Get Ideas</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};
