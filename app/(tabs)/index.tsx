import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { View } from 'react-native';

export default function TabIndex() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/(tabs)/feed');
  }, [router]);

  return <View />;
}
