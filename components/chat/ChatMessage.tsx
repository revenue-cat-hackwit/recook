import React from 'react';
import { View, Text, Image } from 'react-native';
import { Message } from '@/lib/types';

interface ChatMessageProps {
  message: Message;
}

export const ChatMessage = ({ message }: ChatMessageProps) => {
  const isUser = message.role === 'user';

  return (
    <View
      className={`mb-4 max-w-[80%] rounded-2xl p-4 ${
        isUser ? 'self-end rounded-br-none bg-blue-500' : 'self-start rounded-bl-none bg-gray-100'
      }`}
    >
      {typeof message.content === 'string' ? (
        <Text
          className={`${isUser ? 'text-white' : 'text-gray-800'} font-visby text-base leading-5`}
        >
          {message.content}
        </Text>
      ) : (
        <View>
          {message.content.map((part, index) => (
            <View key={index}>
              {part.type === 'text' && (
                <Text
                  className={`${
                    isUser ? 'text-white' : 'text-gray-800'
                  } font-visby text-base leading-5`}
                >
                  {part.text}
                </Text>
              )}
              {part.type === 'image_url' && part.image_url && (
                <Image
                  source={{ uri: part.image_url.url }}
                  className="mt-2 h-40 w-full rounded-lg bg-gray-200"
                  resizeMode="cover"
                />
              )}
            </View>
          ))}
        </View>
      )}
      <Text
        className={`mt-2 text-[10px] ${
          isUser ? 'text-blue-100' : 'text-gray-400'
        } text-right font-visby`}
      >
        {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </Text>
    </View>
  );
};
