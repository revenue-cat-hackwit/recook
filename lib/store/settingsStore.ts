import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type SupportedLanguage = 'id' | 'en' | 'auto';

interface LanguageOption {
  code: SupportedLanguage;
  label: string;
  flag: string;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: 'auto', label: 'Auto Detect', flag: '🌐' },
  { code: 'id', label: 'Bahasa Indonesia', flag: '🇮🇩' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
];

interface SettingsState {
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => Promise<void>;
  loadLanguage: () => Promise<void>;
}

const LANGUAGE_STORAGE_KEY = '@pirinku_language';

export const useSettingsStore = create<SettingsState>((set) => ({
  language: 'id', // Default to Indonesian

  setLanguage: async (lang: SupportedLanguage) => {
    try {
      await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
      set({ language: lang });
    } catch (error) {
      console.error('Failed to save language preference:', error);
    }
  },

  loadLanguage: async () => {
    try {
      const savedLang = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
      if (savedLang && ['id', 'en', 'auto'].includes(savedLang)) {
        set({ language: savedLang as SupportedLanguage });
      }
    } catch (error) {
      console.error('Failed to load language preference:', error);
    }
  },
}));
