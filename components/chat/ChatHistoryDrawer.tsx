import React from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

interface ChatSession {
  id: string;
  title: string;
  lastMessage: string;
  timestamp: number;
  messageCount: number;
}

interface ChatHistoryDrawerProps {
  visible: boolean;
  onClose: () => void;
  sessions: ChatSession[];
  onSelectSession: (sessionId: string) => void;
  onDeleteSession?: (sessionId: string) => void;
  onNewChat: () => void;
  onClearAll: () => void;
}

export const ChatHistoryDrawer: React.FC<ChatHistoryDrawerProps> = ({
  visible,
  onClose,
  sessions,
  onSelectSession,
  onDeleteSession,
  onNewChat,
  onClearAll,
}) => {
  const slideAnim = React.useRef(new Animated.Value(-300)).current;

  React.useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: -300,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const formatTime = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity activeOpacity={1} onPress={onClose} className="flex-1 bg-black/50">
        <Animated.View
          style={{
            transform: [{ translateX: slideAnim }],
          }}
          className="h-full w-[280px] bg-white shadow-2xl"
          onStartShouldSetResponder={() => true}
        >
          {/* Header */}
          <View className="border-b border-gray-200 bg-gradient-to-r from-green-50 to-white px-5 pb-4 pt-12">
            <View className="mb-3 flex-row items-center justify-between">
              <Text className="font-visby-bold text-xl text-gray-900">Chat History</Text>
              <TouchableOpacity onPress={onClose} className="rounded-full bg-gray-100 p-2">
                <Ionicons name="close" size={20} color="#666" />
              </TouchableOpacity>
            </View>

            {/* New Chat Button */}
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onNewChat();
              }}
              className="flex-row items-center justify-center gap-2 rounded-xl bg-green-500 py-3 shadow-sm"
            >
              <Ionicons name="add-circle" size={20} color="white" />
              <Text className="font-visby-bold text-sm text-white">New Chat</Text>
            </TouchableOpacity>
          </View>

          {/* Sessions List */}
          <ScrollView className="flex-1 px-3 py-2">
            {sessions.length === 0 ? (
              <View className="items-center justify-center py-12">
                <Ionicons name="chatbubbles-outline" size={48} color="#D1D5DB" />
                <Text className="mt-3 font-visby text-sm text-gray-400">No chat history</Text>
                <Text className="mt-1 font-visby text-xs text-gray-300">
                  Start a new conversation
                </Text>
              </View>
            ) : (
              sessions.map((session) => (
                <View key={session.id} className="mb-2 flex-row rounded-xl bg-gray-50 p-3">
                  <TouchableOpacity
                    className="flex-1"
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      onSelectSession(session.id);
                      onClose();
                    }}
                  >
                    <View className="mb-1 flex-row items-start justify-between">
                      <Text
                        className="flex-1 font-visby-bold text-sm text-gray-900"
                        numberOfLines={1}
                      >
                        {session.title}
                      </Text>
                      <Text className="font-visby text-xs text-gray-400">
                        {formatTime(session.timestamp)}
                      </Text>
                    </View>
                    <Text className="font-visby text-xs text-gray-500" numberOfLines={2}>
                      {session.lastMessage}
                    </Text>
                    <View className="mt-2 flex-row items-center gap-1">
                      <Ionicons name="chatbubble-outline" size={12} color="#9CA3AF" />
                      <Text className="font-visby text-xs text-gray-400">
                        {session.messageCount} messages
                      </Text>
                    </View>
                  </TouchableOpacity>

                  {/* Delete Button */}
                  <TouchableOpacity
                    onPress={() => {
                      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                      onDeleteSession?.(session.id);
                    }}
                    className="ml-2 items-center justify-center p-2"
                  >
                    <Ionicons name="trash-outline" size={18} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              ))
            )}
          </ScrollView>

          {/* Footer Actions */}
          <View className="border-t border-gray-200 p-4">
            <TouchableOpacity
              onPress={() => {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                onClearAll();
              }}
              className="flex-row items-center justify-center gap-2 rounded-xl bg-red-50 py-3"
            >
              <Ionicons name="trash-outline" size={18} color="#EF4444" />
              <Text className="font-visby-bold text-sm text-red-600">Clear All History</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </TouchableOpacity>
    </Modal>
  );
};
