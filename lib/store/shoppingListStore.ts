import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ShoppingItem } from '@/lib/types';
import { supabase } from '@/lib/supabase';

interface ShoppingListState {
  items: ShoppingItem[];
  isLoading: boolean;
  addItem: (name: string, fromRecipe?: string) => Promise<void>;
  addMultiple: (names: string[], fromRecipe?: string) => Promise<void>;
  toggleItem: (id: string) => Promise<void>;
  removeItem: (id: string) => Promise<void>;
  clearAll: () => Promise<void>;
  sync: () => Promise<void>; // Fetch from cloud
}

export const useShoppingListStore = create<ShoppingListState>()(
  persist(
    (set, get) => ({
      items: [],
      isLoading: false,

      sync: async () => {
        set({ isLoading: true });
        try {
          const { data: userData } = await supabase.auth.getUser();
          if (!userData.user) return;

          const { data, error } = await supabase
            .from('shopping_list_items')
            .select('*')
            .order('created_at', { ascending: false });

          if (!error && data) {
            const cloudItems: ShoppingItem[] = data.map((d: any) => ({
              id: d.id,
              name: d.name,
              isChecked: d.is_checked,
              fromRecipe: d.from_recipe_name,
            }));
            set({ items: cloudItems }); // Source of truth
          }
        } catch (e) {
          console.error('Shopping List Sync Error:', e);
        } finally {
          set({ isLoading: false });
        }
      },

      addItem: async (name, fromRecipe) => {
        // Optimistic
        const tempId = Date.now().toString();
        const newItem: ShoppingItem = { id: tempId, name, isChecked: false, fromRecipe };
        set((state) => ({ items: [newItem, ...state.items] }));

        // Cloud
        const { data: userData } = await supabase.auth.getUser();
        if (userData.user) {
          const { data } = await supabase
            .from('shopping_list_items')
            .insert({
              user_id: userData.user.id,
              name,
              from_recipe_name: fromRecipe,
              is_checked: false,
            })
            .select()
            .single();

          if (data) {
            // Replace temp ID
            set((state) => ({
              items: state.items.map((i) => (i.id === tempId ? { ...i, id: data.id } : i)),
            }));
          }
        }
      },

      addMultiple: async (names, fromRecipe) => {
        // Optimistic
        const newItems: ShoppingItem[] = names.map((name) => ({
          id: Date.now().toString() + Math.random(),
          name,
          isChecked: false,
          fromRecipe,
        }));
        set((state) => ({ items: [...newItems, ...state.items] }));

        // Cloud
        const { data: userData } = await supabase.auth.getUser();
        if (userData.user) {
          const payload = names.map((name) => ({
            user_id: userData.user!.id,
            name,
            from_recipe_name: fromRecipe,
            is_checked: false,
          }));

          await supabase.from('shopping_list_items').insert(payload);
          // We won't bother replacing IDs for bulk add strictly right now to save complexity,
          // but calling sync() afterwards is good practice.
          get().sync();
        }
      },

      toggleItem: async (id) => {
        const current = get().items.find((i) => i.id === id);
        if (!current) return;

        // Optimistic
        set((state) => ({
          items: state.items.map((item) =>
            item.id === id ? { ...item, isChecked: !item.isChecked } : item,
          ),
        }));

        // Cloud
        // Only if ID is a real UUID (length > 20 usually), not a timestamp
        if (id.length > 20) {
          await supabase
            .from('shopping_list_items')
            .update({ is_checked: !current.isChecked })
            .eq('id', id);
        }
      },

      removeItem: async (id) => {
        // Optimistic
        set((state) => ({
          items: state.items.filter((item) => item.id !== id),
        }));

        // Cloud
        if (id.length > 20) {
          await supabase.from('shopping_list_items').delete().eq('id', id);
        }
      },

      clearAll: async () => {
        set({ items: [] });
        const { data: userData } = await supabase.auth.getUser();
        if (userData.user) {
          await supabase.from('shopping_list_items').delete().eq('user_id', userData.user.id);
        }
      },
    }),
    {
      name: 'pirinku_shopping_list_v1',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
