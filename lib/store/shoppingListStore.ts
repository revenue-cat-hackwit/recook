import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ShoppingItem } from '@/lib/types';
import { supabase } from '@/lib/supabase';

interface ShoppingListState {
  items: ShoppingItem[];
  isLoading: boolean;
  addItem: (name: string, fromRecipe?: string, quantity?: number, unit?: string) => Promise<void>;
  addMultiple: (
    items: { name: string; quantity?: number; unit?: string }[],
    fromRecipe?: string,
  ) => Promise<void>;
  toggleItem: (id: string) => Promise<void>;
  updateItem: (id: string, updates: Partial<ShoppingItem>) => Promise<void>;
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
              quantity: d.quantity,
              unit: d.unit,
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

      addItem: async (name, fromRecipe, quantity, unit) => {
        // Optimistic
        const tempId = Date.now().toString();
        const newItem: ShoppingItem = {
          id: tempId,
          name,
          quantity,
          unit,
          isChecked: false,
          fromRecipe,
        };
        set((state) => ({ items: [newItem, ...state.items] }));

        // Cloud
        const { data: userData } = await supabase.auth.getUser();
        if (userData.user) {
          const { data } = await supabase
            .from('shopping_list_items')
            .insert({
              user_id: userData.user.id,
              name,
              quantity,
              unit,
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

      addMultiple: async (newItemsData, fromRecipe) => {
        // Optimistic
        const newItems: ShoppingItem[] = newItemsData.map((item) => ({
          id: Date.now().toString() + Math.random(),
          name: item.name,
          quantity: item.quantity,
          unit: item.unit,
          isChecked: false,
          fromRecipe,
        }));
        set((state) => ({ items: [...newItems, ...state.items] }));

        // Cloud
        const { data: userData } = await supabase.auth.getUser();
        if (userData.user) {
          const payload = newItemsData.map((item) => ({
            user_id: userData.user!.id,
            name: item.name,
            quantity: item.quantity,
            unit: item.unit,
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
      updateItem: async (id, updates) => {
        // Optimistic
        set((state) => ({
          items: state.items.map((item) => (item.id === id ? { ...item, ...updates } : item)),
        }));

        // Cloud
        if (id.length > 20) {
          const payload: any = {};
          if (updates.name !== undefined) payload.name = updates.name;
          if (updates.quantity !== undefined) payload.quantity = updates.quantity;
          if (updates.unit !== undefined) payload.unit = updates.unit;
          if (updates.isChecked !== undefined) payload.is_checked = updates.isChecked;

          if (Object.keys(payload).length > 0) {
            await supabase.from('shopping_list_items').update(payload).eq('id', id);
          }
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
