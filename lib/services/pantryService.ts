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

  /**
   * AI Vision: Analyze pantry image
   */
  async analyzeFromImage(imageUrl: string): Promise<Partial<PantryItem>[]> {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw new Error('Not authenticated');

    try {
      const { data, error } = await supabase.functions.invoke('analyze-pantry-image', {
        body: { imageUrl },
      });

      if (error) {
        console.error('Analyze Pantry Error:', error);

        // Provide more specific error messages
        if (error.message?.includes('FunctionsHttpError')) {
          throw new Error(
            'AI service is temporarily unavailable. The backend function may not be deployed or is experiencing issues.',
          );
        }

        throw new Error(error.message || 'Failed to analyze image');
      }

      if (!data) {
        throw new Error('No response from AI service');
      }

      if (!data.success) {
        throw new Error(data.error || 'Failed to analyze image');
      }

      return data.data || [];
    } catch (error: any) {
      // Re-throw with clearer message
      if (error.message) {
        throw error;
      }
      throw new Error('Failed to analyze pantry image. Please try again.');
    }
  },
};
