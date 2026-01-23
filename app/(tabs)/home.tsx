import { useAuthStore } from '@/lib/store/authStore';
import { Text, View } from 'react-native';

export default function HomePage() {
  const signOut = useAuthStore((state) => state.signOut);
  return (
    <View className="font-visby-regular flex-1 items-center justify-center">
      <Text>Home Page</Text>
      <Text
        className="mt-4 rounded bg-red-500 px-4 py-2 text-white"
        onPress={async () => {
          await signOut();
        }}
      >
        Sign Out
      </Text>
    </View>
  );
}
