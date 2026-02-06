import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import {
  View,
  FlatList,
  Animated,
  Easing,
  Text,
  Platform,
  Keyboard,
  TouchableOpacity,
  KeyboardAvoidingView,
} from 'react-native';
import { showAlert } from '@/lib/utils/globalAlert';
import { Danger, TickCircle, MagicStar, Trash, HambergerMenu } from 'iconsax-react-native';
import * as ImagePicker from 'expo-image-picker';
import { Message, Recipe } from '@/lib/types';
import { AIService } from '@/lib/services/aiService';

import { RecipeService } from '@/lib/services/recipeService';
import { ChatMessage } from '@/components/chat/ChatMessage';
import { ChatInput } from '@/components/chat/ChatInput';
import { EmptyChat } from '@/components/chat/EmptyChat';
import { ProButton } from '@/components/ProButton';
import * as Haptics from 'expo-haptics';
import { ChatHistoryDrawer } from '@/components/chat/ChatHistoryDrawer';
import { useRouter } from 'expo-router';



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
          <MagicStar size={24} color="#8BD65E" variant="Bold" />
        </Animated.View>
      </View>
      <Text className="text-right font-visby text-xs text-gray-400">
        Cooki can make mistakes. Please double check responses.
      </Text>
    </View>
  );
};

export default function Chatbot() {
  const router = useRouter();
  const flatListRef = useRef<FlatList>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatSessions, setChatSessions] = useState<any[]>([]);
  // Current chat title ID (null means new chat)
  const [currentTitleId, setCurrentTitleId] = useState<string | null>(null);

  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [savedRecipes, setSavedRecipes] = useState<Recipe[]>([]);
  const [historyDrawerVisible, setHistoryDrawerVisible] = useState(false);
  const [chatHistoryLoading, setChatHistoryLoading] = useState(false);

  // Keyboard listener to scroll to bottom when keyboard shows
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', () => {
      // Scroll to bottom when keyboard opens, with delays to allow layout to settle
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 200);
      // Safety check later
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 500);
    });

    return () => {
      keyboardDidShowListener.remove();
    };
  }, []);

  useEffect(() => {
    // Initial load: Try to get sessions first, if any, load the latest one.
    loadSessions();
    loadSavedRecipes();
  }, []);

  // Reload sessions when drawer is opened
  useEffect(() => {
    if (historyDrawerVisible) {
      loadSessions();
    }
  }, [historyDrawerVisible]);

  const loadSessions = async () => {
    setChatHistoryLoading(true);
    try {
      const sessions = await AIService.getSessions();
      setChatSessions(sessions);
      
      // If we have sessions but no current chat selected, select the first one
      if (sessions.length > 0 && !currentTitleId) {
        setCurrentTitleId(sessions[0].id);
        loadHistory(sessions[0].id);
      } else if (sessions.length === 0) {
        // Start fresh
        setCurrentTitleId(null);
        setMessages([]);
      }
      return sessions;
    } catch (error) {
      console.error('Failed to load chat sessions:', error);
      return [];
    } finally {
      setChatHistoryLoading(false);
    }
  };

  const loadHistory = async (sessionId: string) => {
    setLoading(true);
    try {
      const history = await AIService.getHistory(sessionId);
      setMessages(history);
    } catch (e) {
      console.error('Failed to load history', e);
      setMessages([]);
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

  // Helper for generating UUIDs
  const generateUUID = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };

  const sendMessage = async () => {
    if (!inputText.trim() && !loading) return;

    const userMessageContent = inputText.trim();
    
    // Create a temporary ID for optimistic UI
    const tempId = generateUUID();
    
    // 1. Prepare User Message
    const userMessage: Message = {
      id: tempId,
      role: 'user',
      content: userMessageContent,
      timestamp: Date.now(),
    };

    // 2. Optimistic Update
    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      let sessionId = currentTitleId;

      // 3. New Session Handling (if no session selected)
      if (!sessionId) {
        // Create session in DB first to get a real ID and set title from first message
        const newSessionId = await AIService.createSession(userMessageContent.slice(0, 50));
        if (newSessionId) {
            sessionId = newSessionId;
            setCurrentTitleId(sessionId);
        } else {
            // Fallback if DB fails (offline mode?) - tough choice, maybe error or fallback to local
            throw new Error("Failed to start new conversation");
        }
      }

      // 4. Save User Message to DB (Background)
      AIService.saveMessage('user', userMessageContent, sessionId);

      // 5. Call AI Edge Function
      const allMessages = [...messages, userMessage]; 
      const aiResponseContent = await AIService.sendMessage(allMessages);

      if (aiResponseContent) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        const aiMessage: Message = {
          id: generateUUID(),
          role: 'assistant',
          content: aiResponseContent,
          timestamp: Date.now(),
        };

        // 6. Update UI with AI Response
        setMessages((prev) => [...prev, aiMessage]);

        // 7. Save AI Message to DB
        AIService.saveMessage('assistant', aiResponseContent, sessionId);
        
        // 8. Refresh sessions list
        loadSessions(); 
      } else {
        throw new Error('Empty response from AI');
      }
    } catch (error: any) {
      console.error('[Chatbot] Error calling AI:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      
      const errorMessage = error.message.includes('Unauthorized') 
          ? 'Please login to use Cooki.' 
          : 'Sorry, Cooki is taking a break. Try again later.';

      showAlert('Error', errorMessage, undefined, {
        icon: <Danger size={32} color="#EF4444" variant="Bold" />,
        type: 'destructive',
      });
      
      // Remove the optimistic user message if failed
      setMessages((prev) => prev.filter((msg) => msg.id !== tempId));
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      showAlert(
        'Permission Denied',
        'Cooki needs gallery access to see your ingredients.',
        undefined,
        {
          icon: <Danger size={32} color="#EF4444" variant="Bold" />,
          type: 'destructive',
        },
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
        showAlert('Error', 'Failed to process image. Please try again.', undefined, {
          icon: <Danger size={32} color="#EF4444" variant="Bold" />,
          type: 'destructive',
        });
        return;
      }
      const base64 = `data:image/jpeg;base64,${asset.base64}`;
      
      let sessionId = currentTitleId;
      if (!sessionId) {
          // Create session for Image Analysis
          const newSessionId = await AIService.createSession("Image Analysis");
          if (newSessionId) {
             sessionId = newSessionId;
             setCurrentTitleId(sessionId);
          } else {
             throw new Error("Failed to start image session");
          }
      }

      const userMessage: Message = {
        id: generateUUID(),
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
      AIService.saveMessage('user', userMessage.content!, sessionId);

      try {
        const allMessages = messages.concat(userMessage);

        const aiResponseContent = await AIService.sendMessage(allMessages);

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        const aiMessage: Message = {
          id: generateUUID(),
          role: 'assistant',
          content: aiResponseContent,
          timestamp: Date.now(),
        };

        setMessages((prev) => [...prev, aiMessage]);

        // Save AI with Session ID
        AIService.saveMessage('assistant', aiResponseContent, sessionId);
        loadSessions();
      } catch (error: any) {
        console.error('Error analyzing image:', error);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        showAlert(
          'Error',
          'Failed to analyze image. Please ensure you have a stable internet connection.',
          undefined,
          {
            icon: <Danger size={32} color="#EF4444" variant="Bold" />,
            type: 'destructive',
          },
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
        showAlert('No Recipe Found', 'No recipe found to save from the last chat.', undefined, {
          icon: <Danger size={32} color="#EF4444" variant="Bold" />,
        });
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
            .map((l) => {
              // Remove bullet points and numbering
              const cleaned = l.replace(/^[-•\d.)\s]+/, '').trim();

              // Try to parse quantity, unit, and item
              // Pattern: "200g Chicken" or "2 cups flour" or "1/2 tsp salt"
              const match = cleaned.match(/^([\d./]+)\s*([a-zA-Z]+)?\s+(.+)$/);

              if (match) {
                return {
                  quantity: match[1],
                  unit: match[2] || 'pcs',
                  item: match[3],
                };
              }

              // If no pattern match, treat whole string as item with quantity 1
              return {
                quantity: '1',
                unit: 'pcs',
                item: cleaned,
              };
            })
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
        showAlert(
          'Parse Failed',
          'Could not detect a recipe. Ensure Cooki provided a clear format (Ingredients & Instructions).',
          undefined,
          {
            icon: <Danger size={32} color="#F59E0B" variant="Bold" />,
          },
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
      showAlert('Saved! 📖', `Recipe "${title}" has been saved to your collection.`, undefined, {
        icon: <TickCircle size={32} color="#10B981" variant="Bold" />,
      });
    } catch (error) {
      console.error('Failed to save recipe:', error);
      showAlert('Error', 'Failed to save recipe. Please try again.', undefined, {
        icon: <Danger size={32} color="#EF4444" variant="Bold" />,
        type: 'destructive',
      });
    }
  };

  // Get recipe recommendations
  const handleGetRecommendations = () => {
    if (savedRecipes.length === 0) {
      showAlert(
        'No Saved Recipes',
        "You don't have any saved recipes yet. Save some from chat or the Generate tab!",
        undefined,
        {
          icon: <Danger size={32} color="#F59E0B" variant="Bold" />,
        },
      );
      return;
    }

    const recommendationPrompt = `Give me 3 recipe recommendations similar to or variations of my saved recipes. Keep it simple and delicious!`;
    setInputText(recommendationPrompt);
    // Auto-send
    setTimeout(() => sendMessage(), 100);
  };

  return (
    <>
      <ChatHistoryDrawer
        visible={historyDrawerVisible}
        onClose={() => setHistoryDrawerVisible(false)}
        sessions={chatSessions} // Use real sessions
        loading={chatHistoryLoading}
        onSelectSession={(id) => {
          console.log('Selected session:', id);
          setCurrentTitleId(id);
          loadHistory(id);
          setHistoryDrawerVisible(false);
        }}
        onDeleteSession={(sessionId) => {
          showAlert('Delete Chat', 'Remove this conversation?', [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Delete',
              style: 'destructive',
              onPress: async () => {
                try {
                  await AIService.deleteSession(sessionId);
                  await loadSessions();

                  // If current session is deleted, start new one
                  if (sessionId === currentTitleId) {
                    setMessages([]);
                    setCurrentTitleId(null);
                  }

                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                } catch (e) {
                  showAlert('Error', 'Failed to delete chat', undefined, {
                    icon: <Danger size={32} color="#EF4444" variant="Bold" />,
                    type: 'destructive',
                  });
                }
              },
            },
          ]);
        }}
        onNewChat={() => {
          setMessages([]);
          setInputText('');
          setCurrentTitleId(null);
          setHistoryDrawerVisible(false);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          showAlert('New Chat Started', 'Ready for a fresh conversation! 🍳', undefined, {
            icon: <TickCircle size={32} color="#10B981" variant="Bold" />,
          });
        }}
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 120 : 0}
      >
        <View className="flex-1">
          {/* Header with Hamburger Menu */}
          <View className="flex-row items-center justify-between bg-white px-4 pb-3 pt-12">
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setHistoryDrawerVisible(true);
              }}
              className="rounded-full bg-gray-100 p-2"
            >
              <HambergerMenu size={24} color="#333" variant="Outline" />
            </TouchableOpacity>

            <Text className="font-visby-bold text-xl text-[#8BD65E]">Cooki</Text>

            <ProButton />
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
              paddingBottom: 180, // Maximum space for keyboard + input
              backgroundColor: '#ffffff',
              flexGrow: 1,
            }}
            onScroll={Animated.event([], { useNativeDriver: false })}
            scrollEventThrottle={16}
            ListHeaderComponent={loading ? <ThinkingIndicator /> : null}
            ListEmptyComponent={
              <EmptyChat
                onSuggestionPress={(text) => {
                  setInputText(text);
                  // Trigger send after setting input text
                  setTimeout(() => sendMessage(), 100);
                }}
              />
            }
            keyboardShouldPersistTaps="handled"
            onContentSizeChange={() => {
              // Auto scroll to bottom when new message
              if(messages.length > 0) {
                 flatListRef.current?.scrollToEnd({ animated: true });
              }
            }}
          />

          {/* Floating Input Box */}
          <View
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              backgroundColor: 'transparent', // Transparent background as requested
              paddingBottom: Platform.OS === 'ios' ? 0 : 10,
            }}
          >
            <ChatInput
              value={inputText}
              onChangeText={setInputText}
              onSend={sendMessage}
              onPickImage={pickImage}
              loading={loading}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </>
  );
}
