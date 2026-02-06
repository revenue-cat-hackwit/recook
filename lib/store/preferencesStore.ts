import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserPreferences } from '@/lib/types';
import { AuthApiService } from '../services/authApiService';

interface PreferencesState {
  hasOnboarded: boolean;
  preferences: UserPreferences;
  isLoading: boolean;
  toggleCuisine: (cuisine: string) => Promise<void>;
  toggleTastePreference: (preference: string) => Promise<void>;
  toggleAllergy: (allergy: string) => Promise<void>;
  toggleEquipment: (tool: string) => Promise<void>;
  completeOnboarding: () => void;
  setHasOnboarded: (value: boolean) => void;
  sync: () => Promise<void>;
}

const DEFAULT_PREFERENCES: UserPreferences = {
  favoriteCuisines: [],
  tastePreferences: [],
  foodAllergies: [],
  whatsInYourKitchen: ['Stove', 'Pan', 'Knife'],
  otherTools: [],
};

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set, get) => ({
      hasOnboarded: false,
      preferences: DEFAULT_PREFERENCES,
      isLoading: false,

      completeOnboarding: () => set({ hasOnboarded: true }),

      setHasOnboarded: (value: boolean) => set({ hasOnboarded: value }),

      toggleCuisine: async (cuisine) => {
        const state = get();
        const exists = state.preferences.favoriteCuisines.includes(cuisine);
        const newCuisines = exists
          ? state.preferences.favoriteCuisines.filter((c) => c !== cuisine)
          : [...state.preferences.favoriteCuisines, cuisine];

        set((s) => ({
          preferences: { ...s.preferences, favoriteCuisines: newCuisines },
        }));

        try {
          await AuthApiService.createPersonalization({ favoriteCuisines: newCuisines });
        } catch (e) {
          console.error('Failed to update cuisines:', e);
        }
      },

      toggleTastePreference: async (preference) => {
        const state = get();
        const exists = state.preferences.tastePreferences.includes(preference);
        const newTastePreferences = exists
          ? state.preferences.tastePreferences.filter((t) => t !== preference)
          : [...state.preferences.tastePreferences, preference];

        set((s) => ({
          preferences: { ...s.preferences, tastePreferences: newTastePreferences },
        }));

        try {
          await AuthApiService.createPersonalization({ tastePreferences: newTastePreferences });
        } catch (e) {
          console.error('Failed to update taste preferences:', e);
        }
      },

      sync: async () => {
        set({ isLoading: true });
        try {
          // Use getPersonalization instead of getProfile
          const response = await AuthApiService.getPersonalization();
          
          if (response && response.data && response.data.personalization) {
            const data = response.data.personalization;
            set((state) => ({
              preferences: {
                ...state.preferences,
                favoriteCuisines: data.favoriteCuisines || state.preferences.favoriteCuisines,
                tastePreferences: data.tastePreferences || state.preferences.tastePreferences,
                foodAllergies: data.foodAllergies || state.preferences.foodAllergies,
                whatsInYourKitchen: data.whatsInYourKitchen || state.preferences.whatsInYourKitchen,
                otherTools: data.otherTools || state.preferences.otherTools,
              },
            }));
          }
        } catch (e) {
          console.error('Preferences Sync Error:', e);
        } finally {
          set({ isLoading: false });
        }
      },

      toggleAllergy: async (allergy) => {
        const state = get();
        const exists = state.preferences.foodAllergies.includes(allergy);
        const newAllergies = exists
          ? state.preferences.foodAllergies.filter((a) => a !== allergy)
          : [...state.preferences.foodAllergies, allergy];

        set((s) => ({
          preferences: { ...s.preferences, foodAllergies: newAllergies },
        }));

        try {
          await AuthApiService.createPersonalization({ foodAllergies: newAllergies });
        } catch (e) {
          console.error('Failed to update allergies:', e);
        }
      },

      toggleEquipment: async (tool) => {
        const state = get();
        const exists = state.preferences.whatsInYourKitchen.includes(tool);
        const newEquipment = exists
          ? state.preferences.whatsInYourKitchen.filter((t) => t !== tool)
          : [...state.preferences.whatsInYourKitchen, tool];

        set((s) => ({
          preferences: { ...s.preferences, whatsInYourKitchen: newEquipment },
        }));

        try {
          await AuthApiService.createPersonalization({ whatsInYourKitchen: newEquipment });
        } catch (e) {
          console.error('Failed to update equipment:', e);
        }
      },
    }),
    {
      name: 'pirinku_user_prefs_v1',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
