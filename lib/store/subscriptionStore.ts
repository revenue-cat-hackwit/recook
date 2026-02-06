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
          console.log('💰 [Store] Checking Entitlements against ID:', ENTITLEMENT_ID);
          let isPro = false;
          if (customerInfo && customerInfo.entitlements.active[ENTITLEMENT_ID]) {
            console.log('✅ [Store] User HAS active entitlement!');
            isPro = true;
          } else {
            console.log('❌ [Store] User DOES NOT have active entitlement.');
            if (customerInfo) {
               console.log('💰 [Store] Available Entitlements:', Object.keys(customerInfo.entitlements.active));
            }
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

      reset: async () => {
        try {
          // Check if anonymous to avoid error "Called logOut but the current user is anonymous"
          const isAnon = await Purchases.isAnonymous();
          if (!isAnon) {
            await Purchases.logOut();
            console.log('✅ [Store] RevenueCat Logged Out');
          } else {
            console.log('ℹ️ [Store] User is already anonymous, skipping RC logout.');
          }
        } catch (e: any) {
          // Suppress specific anonymous error if it leaks through
          if (e.message && e.message.includes('anonymous')) {
             console.log('ℹ️ [Store] RC Logout skipped (User was anonymous).');
          } else {
             console.warn('⚠️ [Store] RevenueCat Logout Error:', e);
          }
        }
        
        // Reset state
        set({
          isPro: false,
          currentCustomerInfo: null,
          generatedToday: 0,
          lastGeneratedDate: null,
          loading: false,
        });
      },

      identifyUser: async (userId: string) => {
        set({ loading: true });
        try {
          const { customerInfo } = await Purchases.logIn(userId);
          console.log(`✅ [Store] User Identified: ${userId}`);
          
          const isPro = customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
          
          set({
            currentCustomerInfo: customerInfo,
            isPro,
            loading: false
          });
        } catch (e) {
          console.error('RC Identify Error:', e);
          set({ loading: false });
        }
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
