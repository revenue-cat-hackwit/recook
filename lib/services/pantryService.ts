import { supabase } from '@/lib/supabase';

export interface PantryItem {
  id: string;
  user_id: string;
  ingredient_name: string;
  quantity: string;
  category: string;
  expiry_date: string | null; // YYYY-MM-DD
  created_at: string;
}

export const PantryService = {
  /**
   * Fetch all pantry items for the user
   */
  async getPantryItems(): Promise<PantryItem[]> {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('pantry_items')
      .select('*')
      .eq('user_id', userData.user.id)
      .order('expiry_date', { ascending: true }); // Expiring soonest first

    if (error) throw error;
    return data as PantryItem[];
  },

  /**
   * Add a new item to pantry
   */
  async addItem(item: Partial<PantryItem>): Promise<PantryItem> {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('pantry_items')
      .insert({
        user_id: userData.user.id,
        ingredient_name: item.ingredient_name,
        quantity: item.quantity,
        category: item.category || 'Other',
        expiry_date: item.expiry_date,
      })
      .select()
      .single();

    if (error) throw error;
    return data as PantryItem;
  },

  /**
   * Update an item (e.g. quantity or expiry)
   */
  async updateItem(id: string, updates: Partial<PantryItem>): Promise<void> {
    const { error } = await supabase.from('pantry_items').update(updates).eq('id', id);

    if (error) throw error;
  },

  /**
   * Delete an item
   */
  async deleteItem(id: string): Promise<void> {
    const { error } = await supabase.from('pantry_items').delete().eq('id', id);

    if (error) throw error;
  },
};
