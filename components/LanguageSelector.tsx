import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import {
  useSettingsStore,
  SUPPORTED_LANGUAGES,
  SupportedLanguage,
} from '@/lib/store/settingsStore';

interface LanguageSelectorProps {
  compact?: boolean;
}

export const LanguageSelector = ({ compact = false }: LanguageSelectorProps) => {
  const { language, setLanguage } = useSettingsStore();

  if (compact) {
    return (
      <View className="flex-row items-center gap-2">
        {SUPPORTED_LANGUAGES.map((lang) => (
          <TouchableOpacity
            key={lang.code}
            onPress={() => setLanguage(lang.code)}
            className={`rounded-full px-3 py-1.5 ${
              language === lang.code ? 'bg-[#8BD65E]' : 'bg-gray-200'
            }`}
          >
            <Text className={`text-sm ${language === lang.code ? 'text-white' : 'text-gray-700'}`}>
              {lang.flag}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  }

  return (
    <View className="gap-3">
      <Text className="font-visby-medium text-base text-gray-700">Voice Language</Text>
      {SUPPORTED_LANGUAGES.map((lang) => (
        <TouchableOpacity
          key={lang.code}
          onPress={() => setLanguage(lang.code)}
          className={`flex-row items-center justify-between rounded-2xl border p-4 ${
            language === lang.code ? 'border-[#8BD65E] bg-green-50' : 'border-gray-200 bg-white'
          }`}
        >
          <View className="flex-row items-center gap-3">
            <Text className="text-2xl">{lang.flag}</Text>
            <Text
              className={`font-visby text-base ${
                language === lang.code ? 'text-[#8BD65E]' : 'text-gray-700'
              }`}
            >
              {lang.label}
            </Text>
          </View>
          {language === lang.code && (
            <View className="h-5 w-5 items-center justify-center rounded-full bg-[#8BD65E]">
              <Text className="text-xs text-white">✓</Text>
            </View>
          )}
        </TouchableOpacity>
      ))}
    </View>
  );
};
