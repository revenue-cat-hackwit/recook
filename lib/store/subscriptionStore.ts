import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import Purchases, { PurchasesPackage } from 'react-native-purchases';
import { Platform } from 'react-native';
import { SubscriptionState } from '@/lib/types';
import { ENTITLEMENT_ID, REVENUECAT_API_KEYS, FREE_GENERATION_LIMIT } from '@/lib/constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const useSubscriptionStore = create<SubscriptionState>()(
  persist(
    (set, get) => ({
      isPro: false,
      offerings: null,
      currentCustomerInfo: null,
      loading: false,

      generatedToday: 0,
      lastGeneratedDate: null,

      initialize: async () => {
        set({ loading: true });
        try {
          if (Platform.OS === 'ios') {
            Purchases.configure({ apiKey: REVENUECAT_API_KEYS.apple });
          } else if (Platform.OS === 'android') {
            Purchases.configure({ apiKey: REVENUECAT_API_KEYS.google });
          }

          await Purchases.setLogLevel(Purchases.LOG_LEVEL.WARN);

          // Fetch cached/latest info
          let customerInfo = null;
          try {
            customerInfo = await Purchases.getCustomerInfo();
          } catch (e) {
            // silent fail for network
          }

          // Check Entitlements
          let isPro = false;
          if (customerInfo && customerInfo.entitlements.active[ENTITLEMENT_ID]) {
            isPro = true;
          }

          // Date Reset Logic
          const today = new Date().toDateString();
          const lastDate = get().lastGeneratedDate;
          let currentUsage = get().generatedToday;

          if (lastDate !== today) {
            currentUsage = 0;
            set({ generatedToday: 0, lastGeneratedDate: today });
          }

          // Load Offerings in background
          if (!get().offerings) {
            // Only if not cached
            try {
              const offerings = await Purchases.getOfferings();
              if (offerings.current) {
                set({ offerings: offerings.current });
              }
            } catch (e) {}
          }

          set({
            isPro,
            currentCustomerInfo: customerInfo,
            loading: false,
          });
        } catch (e) {
          console.error('RC Init Error:', e);
          set({ loading: false });
        }
      },

      purchasePackage: async (pack: PurchasesPackage) => {
        set({ loading: true });
        try {
          const { customerInfo } = await Purchases.purchasePackage(pack);
          const isPro = customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;

          set({
            currentCustomerInfo: customerInfo,
            isPro,
            loading: false,
          });

          return isPro;
        } catch (e: any) {
          if (!e.userCancelled) {
            console.error('Purchase Error:', e);
          }
          set({ loading: false });
          return false;
        }
      },

      restorePurchases: async () => {
        set({ loading: true });
        try {
          const customerInfo = await Purchases.restorePurchases();
          const isPro = customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;

          set({
            currentCustomerInfo: customerInfo,
            isPro,
            loading: false,
          });

          return isPro;
        } catch (e) {
          console.error('Restore Error:', e);
          set({ loading: false });
          return false;
        }
      },

      checkCanGenerate: () => {
        const { isPro, generatedToday, lastGeneratedDate } = get();

        // 1. Pro Users = Unlimited
        if (isPro) return true;

        // 2. Check Date Reset (redundant safety check)
        const today = new Date().toDateString();
        if (lastGeneratedDate !== today) {
          set({ generatedToday: 0, lastGeneratedDate: today });
          return true; // Limit resets, so they have 0 usage
        }

        // 3. Free Limit
        return generatedToday < FREE_GENERATION_LIMIT;
      },

      incrementUsage: () => {
        const { generatedToday } = get();
        const today = new Date().toDateString();
        set({
          generatedToday: generatedToday + 1,
          lastGeneratedDate: today,
        });
      },
    }),
    {
      name: 'pirinku_subscription_v1',
      storage: createJSONStorage(() => AsyncStorage),
      // Don't persist things that should be fresh
      partialize: (state) => ({
        generatedToday: state.generatedToday,
        lastGeneratedDate: state.lastGeneratedDate,
        // optionally persist isPro for offline access, verify on init
        isPro: state.isPro,
      }),
    },
  ),
);
