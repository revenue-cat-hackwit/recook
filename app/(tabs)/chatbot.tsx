import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import {
  View,
  FlatList,
  Alert,
  Animated,
  Easing,
  Text,
  Platform,
  Keyboard,
  TouchableOpacity,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Message, Recipe } from '@/lib/types';
import { AIService } from '@/lib/services/aiService';
import { RecipeService } from '@/lib/services/recipeService';
import { ChatMessage } from '@/components/chat/ChatMessage';
import { ChatInput } from '@/components/chat/ChatInput';
import { EmptyChat } from '@/components/chat/EmptyChat';
import { Ionicons } from '@expo/vector-icons';
import { useSubscriptionStore } from '@/lib/store/subscriptionStore';
import RevenueCatUI from 'react-native-purchases-ui';
import * as Haptics from 'expo-haptics';
import { ChatHistoryDrawer } from '@/components/chat/ChatHistoryDrawer';

const dummyMessages: Message[] = [
  {
    id: '1',
    role: 'assistant',
    content:
      "Hi, I'm Cooki! 🍳 I'm here to help you turn those viral links into real meals. What are we cooking today?",
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
          <Ionicons name="sparkles" size={24} color="#8BD65E" />
        </Animated.View>
      </View>
      <Text className="text-right font-visby text-xs text-gray-400">
        Cooki can make mistakes. Please double check responses.
      </Text>
    </View>
  );
};

export default function Chatbot() {
  const flatListRef = useRef<FlatList>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatSessions, setChatSessions] = useState<any[]>([]);
  // Initialize with a new session ID if none exists, or load last session
  const [currentSessionId, setCurrentSessionId] = useState<string>(
    Date.now().toString(36) + Math.random().toString(36).substr(2),
  );

  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [savedRecipes, setSavedRecipes] = useState<Recipe[]>([]);
  const [historyDrawerVisible, setHistoryDrawerVisible] = useState(false);

  // Subscription Hooks
  const { checkCanGenerate, incrementUsage, initialize } = useSubscriptionStore();

  useEffect(() => {
    // Initial load: Try to get sessions first, if any, load the latest one.
    // If not, we stay with the default new random session ID.
    loadSessions().then((sessions) => {
      if (sessions.length > 0) {
        // Load the most recent session
        const lastSession = sessions[0];
        setCurrentSessionId(lastSession.id);
        loadHistory(lastSession.id);
      } else {
        // New user or no history, keeps the random ID initialized in state
      }
    });
    loadSavedRecipes();
  }, []);

  // Reload sessions when drawer is opened
  useEffect(() => {
    if (historyDrawerVisible) {
      loadSessions();
    }
  }, [historyDrawerVisible]);

  const loadSessions = async () => {
    const sessions = await AIService.getSessions();
    setChatSessions(sessions);
    return sessions;
  };

  const loadHistory = async (sessionId: string) => {
    setLoading(true);
    try {
      const history = await AIService.getHistory(sessionId);
      setMessages(history);
    } catch (e) {
      console.error('Failed to load history', e);
    } finally {
      setLoading(false);
    }
  };

  const loadSavedRecipes = async () => {
    try {
      const recipes = await RecipeService.getUserRecipes();
      setSavedRecipes(recipes);
    } catch (e) {
      console.error('Failed to load recipes:', e);
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

    // Save User Msg with Session ID
    AIService.saveMessage('user', userMessage.content!, currentSessionId);

    try {
      const allMessages = messages.concat(userMessage);

      console.log('[Chatbot] Sending via Service:', { count: allMessages.length });

      // Add context about saved recipes if user asks for recommendations
      const isAskingForRecommendation =
        inputText.toLowerCase().includes('rekomen') ||
        inputText.toLowerCase().includes('suggest') ||
        inputText.toLowerCase().includes('ide') ||
        inputText.toLowerCase().includes('masak apa');

      let contextMessage = '';
      if (isAskingForRecommendation && savedRecipes.length > 0) {
        const recipeList = savedRecipes
          .slice(0, 10)
          .map((r) => r.title)
          .join(', ');
        contextMessage = `\n\n[Context: User has ${savedRecipes.length} saved recipes including: ${recipeList}. You can recommend similar recipes or variations based on these.]`;
      }

      const aiResponseContent = await AIService.sendMessage(
        contextMessage
          ? [
              ...allMessages.slice(0, -1),
              { ...userMessage, content: userMessage.content + contextMessage },
            ]
          : allMessages,
      );

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

      // Save AI Msg with Session ID
      AIService.saveMessage('assistant', aiResponseContent, currentSessionId);

      // Update session list in background to reflect new message immediately in drawer next time
      loadSessions();
    } catch (error: any) {
      console.error('[Chatbot] Error calling AI:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', 'Sorry, Cooki is busy right now. Please try again later!');
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
      Alert.alert('Permission Denied', 'Cooki needs gallery access to see your ingredients.');
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
        Alert.alert('Error', 'Failed to process image. Please try again.');
        return;
      }
      const base64 = `data:image/jpeg;base64,${asset.base64}`;
      const userMessage: Message = {
        id: Date.now().toString(),
        role: 'user',
        content: [
          {
            type: 'text',
            text: inputText.trim() || 'Please create a recipe from the ingredients in this image',
          },
          { type: 'image_url', image_url: { url: base64 } },
        ],
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setInputText('');
      setLoading(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      // Save User Msg (Image + Text) with Session ID
      AIService.saveMessage('user', userMessage.content!, currentSessionId);

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

        // Save AI with Session ID
        AIService.saveMessage('assistant', aiResponseContent, currentSessionId);
        loadSessions();
      } catch (error: any) {
        console.error('Error analyzing image:', error);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert(
          'Error',
          'Failed to analyze image. Please ensure you have a stable internet connection.',
        );
      } finally {
        setLoading(false);
      }
    }
  };

  // Parse and save recipe from AI response
  const handleSaveLastRecipe = async () => {
    try {
      // Get the last assistant message
      const lastAIMessage = [...messages].reverse().find((m) => m.role === 'assistant');

      if (!lastAIMessage || typeof lastAIMessage.content !== 'string') {
        Alert.alert('No Recipe Found', 'No recipe found to save from the last chat.');
        return;
      }

      const content = lastAIMessage.content;

      // Simple parsing - look for recipe title (usually in bold or after emoji)
      const titleMatch = content.match(/(?:\*\*|🍳|🍚|🍗|🥘|🍜)\s*(.+?)(?:\*\*|\n)/);
      const title = titleMatch ? titleMatch[1].trim() : 'Recipe from Chat';

      // Extract ingredients (lines starting with -, •, or numbers)
      const ingredientsMatch = content.match(/(?:Bahan|Ingredients?):?\s*\n((?:[-•\d].*\n?)+)/i);
      const ingredients = ingredientsMatch
        ? ingredientsMatch[1]
            .split('\n')
            .filter((l) => l.trim())
            .map((l) => l.replace(/^[-•\d.)\s]+/, '').trim())
        : [];

      // Extract steps
      const stepsMatch = content.match(
        /(?:Cara|Steps?|Instructions?|Langkah):?\s*\n((?:[\d].*\n?)+)/i,
      );
      const stepsText = stepsMatch ? stepsMatch[1] : '';
      const steps = stepsText
        .split('\n')
        .filter((l) => l.trim())
        .map((instruction, idx) => ({
          step: (idx + 1).toString(),
          instruction: instruction.replace(/^\d+[.)]\s*/, '').trim(),
        }));

      if (ingredients.length === 0 && steps.length === 0) {
        Alert.alert(
          'Parse Failed',
          'Could not detect a recipe. Ensure Cooki provided a clear format (Ingredients & Instructions).',
        );
        return;
      }

      const recipe: Recipe = {
        title,
        description: `Saved from chat on ${new Date().toLocaleDateString()}`,
        ingredients,
        steps,
        time_minutes: '30',
        calories_per_serving: '0',
        servings: '2',
        difficulty: 'Medium',
        createdAt: new Date().toISOString(),
        collections: ['From Chat'],
      };

      await RecipeService.saveRecipe(recipe);
      await loadSavedRecipes(); // Refresh

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Saved! 📖', `Recipe "${title}" has been saved to your collection.`);
    } catch (error) {
      console.error('Failed to save recipe:', error);
      Alert.alert('Error', 'Failed to save recipe. Please try again.');
    }
  };

  // Get recipe recommendations
  const handleGetRecommendations = () => {
    if (savedRecipes.length === 0) {
      Alert.alert(
        'No Saved Recipes',
        "You don't have any saved recipes yet. Save some from chat or the Generate tab!",
      );
      return;
    }

    const recommendationPrompt = `Give me 3 recipe recommendations similar to or variations of my saved recipes. Keep it simple and delicious!`;
    setInputText(recommendationPrompt);
    // Auto-send
    setTimeout(() => sendMessage(), 100);
  };

  // Keyboard animation for floating input
  const keyboardHeight = useRef(new Animated.Value(0)).current;

  useLayoutEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSubscription = Keyboard.addListener(showEvent, (e) => {
      Animated.spring(keyboardHeight, {
        toValue: e.endCoordinates.height,
        useNativeDriver: false,
        friction: 12,
        tension: 140,
      }).start();

      // Scroll to bottom when keyboard shows to reveal latest messages
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
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

  // Mock chat sessions removed - fetch from DB

  return (
    <>
      <ChatHistoryDrawer
        visible={historyDrawerVisible}
        onClose={() => setHistoryDrawerVisible(false)}
        sessions={chatSessions} // Use real sessions
        onSelectSession={(id) => {
          console.log('Selected session:', id);
          setCurrentSessionId(id);
          loadHistory(id);
          setHistoryDrawerVisible(false);
        }}
        onDeleteSession={(sessionId) => {
          Alert.alert('Delete Chat', 'Remove this conversation?', [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Delete',
              style: 'destructive',
              onPress: async () => {
                try {
                  await AIService.deleteSession(sessionId);
                  await loadSessions();

                  // If current session is deleted, start new one
                  if (sessionId === currentSessionId) {
                    setMessages([]);
                    setCurrentSessionId(
                      Date.now().toString(36) + Math.random().toString(36).substr(2),
                    );
                  }

                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                } catch (e) {
                  Alert.alert('Error', 'Failed to delete chat');
                }
              },
            },
          ]);
        }}
        onNewChat={() => {
          setMessages([]);
          setInputText('');
          // Generate new Session ID
          setCurrentSessionId(Date.now().toString(36) + Math.random().toString(36).substr(2));
          setHistoryDrawerVisible(false);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          Alert.alert('New Chat Started', 'Ready for a fresh conversation! 🍳');
        }}
        onClearAll={() => {
          Alert.alert(
            'Clear History',
            'Are you sure you want to delete all chat history? This cannot be undone.',
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                  try {
                    await AIService.clearHistory();
                    setMessages([]);
                    setChatSessions([]);
                    setHistoryDrawerVisible(false);
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  } catch (e) {
                    Alert.alert('Error', 'Failed to clear history');
                  }
                },
              },
            ],
          );
        }}
      />

      <View className="flex-1">
        <View className="flex-1">
          {/* Header with Hamburger Menu */}
          <View className="flex-row items-center justify-between bg-white px-4 pb-3 pt-12 shadow-sm">
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setHistoryDrawerVisible(true);
              }}
              className="rounded-full bg-gray-100 p-2"
            >
              <Ionicons name="menu" size={24} color="#333" />
            </TouchableOpacity>

            <Text className="font-visby-bold text-xl text-[#8BD65E]">Cooki</Text>

            <TouchableOpacity
              onPress={async () => {
                const paywallResult = await RevenueCatUI.presentPaywall();
                if (
                  paywallResult === RevenueCatUI.PAYWALL_RESULT.PURCHASED ||
                  paywallResult === RevenueCatUI.PAYWALL_RESULT.RESTORED
                ) {
                  await initialize();
                }
              }}
              className="rounded-full bg-purple-50 px-3 py-1.5"
            >
              <Text className="font-visby-bold text-xs text-purple-600">Upgrade</Text>
            </TouchableOpacity>
          </View>

          <Animated.FlatList
            ref={flatListRef}
            data={messages}
            renderItem={({ item }: { item: Message }) => (
              <ChatMessage
                message={item}
                onSaveRecipe={handleSaveLastRecipe}
                onGetIdeas={handleGetRecommendations}
              />
            )}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{
              padding: 16,
              paddingBottom: 400, // Extra padding to ensure bubbles visible above keyboard
              backgroundColor: '#ffffff',
              flexGrow: 1,
            }}
            onScroll={Animated.event([], { useNativeDriver: false })}
            scrollEventThrottle={16}
            ListHeaderComponent={loading ? <ThinkingIndicator /> : null}
            ListEmptyComponent={<EmptyChat />}
            keyboardShouldPersistTaps="handled"
            onContentSizeChange={() => {
              // Auto scroll to bottom when new message
              flatListRef.current?.scrollToEnd({ animated: true });
            }}
            // Dynamically adjust content inset when keyboard appears
            contentInset={{ bottom: keyboardHeight }}
            contentInsetAdjustmentBehavior="automatic"
          />

          {/* Floating Input Box with Transparent Background */}
          <Animated.View
            style={{
              position: 'absolute',
              bottom: keyboardHeight,
              left: 0,
              right: 0,
              backgroundColor: 'transparent',
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
      </View>
    </>
  );
}
