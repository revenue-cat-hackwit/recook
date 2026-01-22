import '../global.css';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useFonts } from 'expo-font';

export default function Layout() {
  const [fontsLoaded] = useFonts({
    'VisbyCF-Regular': require('../assets/fonts/VisbyCF-Regular.otf'),
    'VisbyCF-Medium': require('../assets/fonts/VisbyCF-Medium.otf'),
    'VisbyCF-Bold': require('../assets/fonts/VisbyCF-Bold.otf'),
    // Tambah lainnya jika perlu
  });

  if (!fontsLoaded) {
    return null; // Loading screen bisa ditambah nanti
  }

  return (
    <Tabs>
      <Tabs.Screen
        name="feed"
        options={{
          title: 'Feed',
          tabBarIcon: ({ color, size }) => <Ionicons name="newspaper" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="chatbot"
        options={{
          title: 'AI Chatbot Masak',
          tabBarIcon: ({ color, size }) => <Ionicons name="chatbubble" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="generate"
        options={{
          title: 'AI Generate Resep',
          tabBarIcon: ({ color, size }) => <Ionicons name="videocam" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="store"
        options={{
          title: 'Store',
          tabBarIcon: ({ color, size }) => <Ionicons name="storefront" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <Ionicons name="person" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
