import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { deleteItemAsync, getItemAsync, setItemAsync } from 'expo-secure-store';
import { Platform } from 'react-native';

const ExpoSecureStoreAdapter = {
  getItem: (key: string) => {
    return getItemAsync(key);
  },
  setItem: (key: string, value: string) => {
    if (value.length > 2048) {
      console.warn(
        'Value being stored in SecureStore is larger than 2048 bytes and it may not be stored successfully. In a future SDK version, this call may throw an error.',
      );
    }
    return setItemAsync(key, value);
  },
  removeItem: (key: string) => {
    return deleteItemAsync(key);
  },
};

export const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
export const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // FIXME : Use AsyncStorage beacause Expo Secure Store has issues if the data size is large
    storage: Platform.OS === 'web' ? AsyncStorage : ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
