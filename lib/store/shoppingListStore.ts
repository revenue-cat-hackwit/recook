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
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) return;

        // Fetch pantry items for smart checking
        const { data: pantryData } = await supabase
          .from('pantry_items')
          .select('ingredient_name, quantity')
          .eq('user_id', userData.user.id);

        // Helper function to normalize units
        const normalizeToGrams = (qty: number, unit: string): number | null => {
          const unitLower = unit.toLowerCase().trim();
          const conversions: { [key: string]: number } = {
            kg: 1000,
            g: 1,
            mg: 0.001,
            lb: 453.592,
            oz: 28.3495,
            l: 1000,
            ml: 1,
            cup: 240,
            tbsp: 15,
            tsp: 5,
          };
          return conversions[unitLower] ? qty * conversions[unitLower] : null;
        };

        // Aggregate items with same name and unit
        const aggregatedMap = new Map<
          string,
          { name: string; quantity: number; unit: string; recipes: string[] }
        >();

        newItemsData.forEach((item) => {
          const key = `${item.name.toLowerCase().trim()}_${(item.unit || '').toLowerCase()}`;

          if (aggregatedMap.has(key)) {
            const existing = aggregatedMap.get(key)!;
            existing.quantity += item.quantity || 0;
            if (fromRecipe && !existing.recipes.includes(fromRecipe)) {
              existing.recipes.push(fromRecipe);
            }
          } else {
            aggregatedMap.set(key, {
              name: item.name,
              quantity: item.quantity || 0,
              unit: item.unit || '',
              recipes: fromRecipe ? [fromRecipe] : [],
            });
          }
        });

        // Check pantry and calculate deficit
        const itemsAfterPantryCheck: typeof aggregatedMap = new Map();

        aggregatedMap.forEach((aggItem) => {
          let finalQuantity = aggItem.quantity;

          // Find matching pantry item
          const pantryItem = pantryData?.find((p: any) => {
            const pantryName = p.ingredient_name?.toLowerCase().trim() || '';
            const itemName = aggItem.name.toLowerCase().trim();
            return pantryName.includes(itemName) || itemName.includes(pantryName);
          });

          if (pantryItem && aggItem.unit) {
            // Extract pantry quantity and unit
            const pantryQtyStr = pantryItem.quantity || '';
            const pantryMatch = pantryQtyStr.match(/^([\d.]+)\s*([a-zA-Z]+)?$/);

            if (pantryMatch) {
              const pantryQty = parseFloat(pantryMatch[1]);
              const pantryUnit = pantryMatch[2] || aggItem.unit;

              // Try to normalize and compare
              const neededNormalized = normalizeToGrams(aggItem.quantity, aggItem.unit);
              const availableNormalized = normalizeToGrams(pantryQty, pantryUnit);

              if (neededNormalized && availableNormalized) {
                const deficit = neededNormalized - availableNormalized;

                if (deficit > 0) {
                  // Need more - convert back to original unit
                  const unitConversion = normalizeToGrams(1, aggItem.unit) || 1;
                  finalQuantity = Math.ceil(deficit / unitConversion);
                } else {
                  // Have enough - skip adding
                  finalQuantity = 0;
                }
              }
            }
          }

          if (finalQuantity > 0) {
            itemsAfterPantryCheck.set(aggItem.name + aggItem.unit, {
              ...aggItem,
              quantity: finalQuantity,
            });
          }
        });

        // Check if items already exist in shopping list
        const existingItems = get().items;
        const itemsToAdd: ShoppingItem[] = [];
        const itemsToUpdate: { id: string; quantity: number }[] = [];

        itemsAfterPantryCheck.forEach((aggItem) => {
          const existing = existingItems.find(
            (i) =>
              i.name.toLowerCase().trim() === aggItem.name.toLowerCase().trim() &&
              (i.unit || '').toLowerCase() === aggItem.unit.toLowerCase() &&
              !i.isChecked,
          );

          if (existing) {
            // Update existing item - add quantities
            const newQty = (existing.quantity || 0) + aggItem.quantity;
            itemsToUpdate.push({ id: existing.id, quantity: newQty });
          } else {
            // Add new item
            const recipeText = aggItem.recipes.length > 0 ? aggItem.recipes.join(', ') : fromRecipe;
            itemsToAdd.push({
              id: Date.now().toString() + Math.random(),
              name: aggItem.name,
              quantity: aggItem.quantity,
              unit: aggItem.unit,
              isChecked: false,
              fromRecipe: recipeText,
            });
          }
        });

        // Optimistic update
        set((state) => ({
          items: [
            ...itemsToAdd,
            ...state.items.map((item) => {
              const update = itemsToUpdate.find((u) => u.id === item.id);
              return update ? { ...item, quantity: update.quantity } : item;
            }),
          ],
        }));

        // Cloud operations
        if (itemsToAdd.length > 0) {
          const payload = itemsToAdd.map((item) => ({
            user_id: userData.user!.id,
            name: item.name,
            quantity: item.quantity,
            unit: item.unit,
            from_recipe_name: item.fromRecipe,
            is_checked: false,
          }));
          await supabase.from('shopping_list_items').insert(payload);
        }

        if (itemsToUpdate.length > 0) {
          for (const update of itemsToUpdate) {
            await supabase
              .from('shopping_list_items')
              .update({ quantity: update.quantity })
              .eq('id', update.id);
          }
        }

        // Sync to get correct IDs
        get().sync();
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
