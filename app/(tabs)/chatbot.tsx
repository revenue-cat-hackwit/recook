import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { View, FlatList, Alert, Animated, Easing, Text, Platform, Keyboard } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Message } from '@/lib/types';
import { AIService } from '@/lib/services/aiService';
import { ChatMessage } from '@/components/chat/ChatMessage';
import { ChatInput } from '@/components/chat/ChatInput';
import { EmptyChat } from '@/components/chat/EmptyChat';
import { Ionicons } from '@expo/vector-icons';
import { useSubscriptionStore } from '@/lib/store/subscriptionStore';
import RevenueCatUI from 'react-native-purchases-ui';
import * as Haptics from 'expo-haptics';

const dummyMessages: Message[] = [
  {
    id: '1',
    role: 'assistant',
    content:
      'Halo! Saya Chef Bot Pirinku 👨‍🍳. Ada bahan apa di kulkasmu hari ini? Atau mau ide masak apa?',
    timestamp: Date.now() - 300000,
  },
  {
    id: '2',
    role: 'user',
    content: 'Aku punya ayam, bawang putih, dan kecap manis',
    timestamp: Date.now() - 240000,
  },
  {
    id: '3',
    role: 'assistant',
    content:
      '🍗 **Resep Ayam Kecap Manis**\n\n**Bahan:**\n- 500g ayam potong\n- 4 siung bawang putih\n- 3 sdm kecap manis\n- Garam dan merica secukupnya\n\n**Cara Masak:**\n1. Goreng ayam hingga kecokelatan\n2. Tumis bawang putih hingga harum\n3. Masukkan ayam, tambahkan kecap manis\n4. Aduk rata, masak hingga bumbu meresap\n\nSelamat mencoba! 😋',
    timestamp: Date.now() - 180000,
  },
  {
    id: '4',
    role: 'user',
    content: 'Wah enak! Kalau mau bikin nasi goreng gimana?',
    timestamp: Date.now() - 120000,
  },
  {
    id: '5',
    role: 'assistant',
    content:
      '🍚 **Resep Nasi Goreng Sederhana**\n\n**Bahan:**\n- 2 piring nasi putih (sebaiknya nasi dingin)\n- 2 butir telur\n- 3 siung bawang putih\n- 2 sdm kecap manis\n- Garam secukupnya\n\n**Cara Masak:**\n1. Kocok telur, buat orak-arik\n2. Tumis bawang putih hingga harum\n3. Masukkan nasi, aduk rata\n4. Tambahkan kecap manis dan garam\n5. Masak hingga nasi kering dan harum\n\nTips: Gunakan api besar agar nasi tidak lembek! 🔥',
    timestamp: Date.now() - 60000,
  },
];

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
  const [messages, setMessages] = useState<Message[]>([]);

  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);

  // Subscription Hooks
  const { checkCanGenerate, incrementUsage, initialize } = useSubscriptionStore();

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    const history = await AIService.getHistory();
    if (history.length > 0) {
      setMessages(history); // Replace with cloud history
    }
  };

  const handlePresentPaywall = async () => {
    const paywallResult = await RevenueCatUI.presentPaywall();
    if (
      paywallResult === RevenueCatUI.PAYWALL_RESULT.PURCHASED ||
      paywallResult === RevenueCatUI.PAYWALL_RESULT.RESTORED
    ) {
      await initialize();
    }
  };

  const sendMessage = async () => {
    if (!inputText.trim() && !loading) return;

    // 1. CHECK QUOTA for Chat
    if (!checkCanGenerate()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert(
        'Daily Limit Reached 🍳',
        'You have used your free interactions for today. Upgrade to Pro for unlimited chat!',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Upgrade to Pro', onPress: handlePresentPaywall },
        ],
      );
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputText.trim(),
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Save User Msg
    AIService.saveMessage('user', userMessage.content!);

    try {
      const allMessages = messages.concat(userMessage); // optimize this if history is huge (limit context)

      console.log('[Chatbot] Sending via Service:', { count: allMessages.length });

      const aiResponseContent = await AIService.sendMessage(allMessages);

      // 2. Increment Usage on Success
      incrementUsage();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: aiResponseContent,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, aiMessage]);

      // Save AI Msg
      AIService.saveMessage('assistant', aiResponseContent);
    } catch (error: any) {
      console.error('[Chatbot] Error calling AI:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', 'Maaf, Chef Bot sedang sibuk. Coba lagi nanti ya!');
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    // 1. CHECk QUOTA for Image Upload
    if (!checkCanGenerate()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert(
        'Daily Limit Reached 🍳',
        'You have used your free interactions for today. Upgrade to Pro for unlimited photo analysis!',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Upgrade to Pro', onPress: handlePresentPaywall },
        ],
      );
      return;
    }

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
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
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
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      // Save User Msg (Image + Text)
      AIService.saveMessage('user', userMessage.content!);

      try {
        const allMessages = messages.concat(userMessage);

        const aiResponseContent = await AIService.sendMessage(allMessages);

        // 2. Increment Usage on Success
        incrementUsage();
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: aiResponseContent,
          timestamp: Date.now(),
        };

        setMessages((prev) => [...prev, aiMessage]);

        // Save AI
        AIService.saveMessage('assistant', aiResponseContent);
      } catch (error: any) {
        console.error('Error analyzing image:', error);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert('Error', 'Gagal menganalisis gambar. Pastikan koneksi internet lancar.');
      } finally {
        setLoading(false);
      }
    }
  };

  const keyboardHeight = useRef(new Animated.Value(0)).current;

  useLayoutEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSubscription = Keyboard.addListener(showEvent, (e) => {
      Animated.spring(keyboardHeight, {
        toValue: e.endCoordinates.height * 0.8,
        useNativeDriver: false,
        friction: 12,
        tension: 140,
      }).start();
    });

    const hideSubscription = Keyboard.addListener(hideEvent, () => {
      Animated.spring(keyboardHeight, {
        toValue: 0,
        useNativeDriver: false,
        friction: 12,
        tension: 140,
      }).start();
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  return (
    <View className="flex-1">
      <Animated.FlatList
        ref={flatListRef}
        data={dummyMessages.reverse()}
        renderItem={({ item }: { item: Message }) => <ChatMessage message={item} />}
        keyExtractor={(_, index) => index.toString()}
        contentContainerStyle={{
          padding: 16,
          paddingBottom: keyboardHeight,
          backgroundColor: '#ffffff',
          flexGrow: 1,
        }}
        ListHeaderComponent={loading ? <ThinkingIndicator /> : null}
        ListEmptyComponent={<EmptyChat />}
        keyboardShouldPersistTaps="handled"
      />
      <Animated.View
        style={{
          position: 'absolute',
          bottom: keyboardHeight,
          left: 0,
          right: 0,
        }}
      >
        <ChatInput
          value={inputText}
          onChangeText={setInputText}
          onSend={sendMessage}
          onPickImage={pickImage}
          loading={loading}
        />
      </Animated.View>
    </View>
  );
}
