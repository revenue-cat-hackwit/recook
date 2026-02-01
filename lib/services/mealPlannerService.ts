import { supabase, supabaseUrl, supabaseAnonKey } from '@/lib/supabase';
import { Recipe } from '@/lib/types';

export interface MealPlan {
  id: string;
  user_id: string;
  recipe_id: string;
  date: string; // YYYY-MM-DD
  meal_type: 'breakfast' | 'lunch' | 'dinner';
  recipe: Recipe;
}

export const MealPlannerService = {
  /**
   * Get meal plans for a specific date range
   */
  async getMealPlans(startDate: string, endDate: string): Promise<MealPlan[]> {
    const { data, error } = await supabase
      .from('meal_plans')
      .select(
        `
        *,
        recipe:user_recipes (
          id,
          title,
          ingredients,
          steps,
          image_url,
          time_minutes,
          calories_per_serving,
          description,
          difficulty,
          servings,
          tips,
          source_url,
          collections
        )
      `,
      )
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true });

    if (error) throw error;

    // Map Join Result to Type
    return data.map((item: any) => {
      const rawRecipe = item.recipe || {};
      const mappedRecipe: Recipe = {
        id: rawRecipe.id,
        title: rawRecipe.title || 'Unknown Recipe',
        ingredients: rawRecipe.ingredients || [],
        steps: rawRecipe.steps || [],
        imageUrl: rawRecipe.image_url, // Map to Type
        time_minutes: rawRecipe.time_minutes,
        calories_per_serving: rawRecipe.calories_per_serving,
        description: rawRecipe.description,
        difficulty: rawRecipe.difficulty,
        servings: rawRecipe.servings,
        tips: rawRecipe.tips,
        sourceUrl: rawRecipe.source_url,
        collections: rawRecipe.collections || [],
      };

      return {
        ...item,
        recipe: mappedRecipe,
      };
    });
  },

  /**
   * Add a recipe to meal plan
   */
  async addMealPlan(recipeId: string, date: string, mealType: string): Promise<void> {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw new Error('Not authenticated');

    const { error } = await supabase.from('meal_plans').insert({
      user_id: userData.user.id,
      recipe_id: recipeId,
      date: date,
      meal_type: mealType,
    });

    if (error) {
      // Handle constraint violation (already exists)
      if (error.code === '23505') {
        throw new Error('You already have this meal planned for this slot.');
      }
      throw error;
    }
  },

  /**
   * Remove a meal plan
   */
  async deleteMealPlan(id: string): Promise<void> {
    const { error } = await supabase.from('meal_plans').delete().eq('id', id);
    if (error) throw error;
  },

  /**
   * Auto-Generate Weekly Plan via AI
   */
   async generateWeeklyPlan(
    startDate: string, 
    preferences?: { goal?: string; dietType?: string; allergies?: string; calories?: string }
   ): Promise<void> {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw new Error('Not authenticated');

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;

    if (!token) throw new Error('No access token found');

    console.log('Generating plan for:', startDate);

    // Use direct fetch for better reliability/debugging
    // Ensure no double slashes if supabaseUrl ends with /
    const baseUrl = supabaseUrl.replace(/\/$/, '');
    const functionUrl = `${baseUrl}/functions/v1/generate-weekly-plan`;

    console.log('[MealPlanner] Fetching:', functionUrl);
    console.log('[MealPlanner] Token Prefix:', token.substring(0, 10) + '...');
    console.log('[MealPlanner] Anon Key Prefix:', supabaseAnonKey.substring(0, 10) + '...');

    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`, // Send User Token for RLS
        apikey: supabaseAnonKey,
      },
      body: JSON.stringify({ 
          startDate,
          customPreferences: preferences 
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      let errMsg = text;
      try {
        const json = JSON.parse(text);
        errMsg = json.message || json.error || text;
      } catch (e) {}
      throw new Error(`Server Error: ${errMsg}`);
    }

    const data = await response.json();
    if (!data.success) throw new Error(data.error || 'Failed to generate plan');
  },
};
