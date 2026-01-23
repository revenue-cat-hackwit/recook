import { View, Text, Button } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/lib/store/authStore';

export default function Profile() {
  const setCredentials = useAuthStore((state) => state.setCredentials);

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (!error) {
      setCredentials(null, null);
    } else {
      console.error('Logout error:', error.message);
    }
  };

  return (
    <View className="flex-1 items-center justify-center">
      <Text className="mb-4 text-lg font-bold">Profile Screen</Text>
      <Button title="Logout" onPress={handleLogout} color="#FF6B6B" />
    </View>
  );
}
