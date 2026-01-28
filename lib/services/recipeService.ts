import { supabase, supabaseUrl, supabaseAnonKey } from '@/lib/supabase';
import { Recipe } from '@/lib/types';

export const RecipeService = {
  /**
   * Upload video file significantly cleaner
   */
  async uploadVideo(uri: string): Promise<string> {
    const ext = uri.split('.').pop()?.toLowerCase() || 'mov';
    const fileName = `${Date.now()}.${ext}`;
    const filePath = `uploads/${fileName}`;

    try {
      const response = await fetch(uri);
      const arrayBuffer = await response.arrayBuffer();

      const { error } = await supabase.storage.from('videos').upload(filePath, arrayBuffer, {
        contentType: `video/${ext}`,
        upsert: false,
      });

      if (error) throw error;

      const { data } = supabase.storage.from('videos').getPublicUrl(filePath);
      return data.publicUrl;
    } catch (error) {
      console.error('RecipeService Upload Error:', error);
      throw error;
    }
  },

  /**
   * Generate recipe from video URL
   */
  async generateFromVideo(videoUrl: string, userPreferences?: any): Promise<Recipe> {
    try {
      const response = await fetch(`${supabaseUrl}/functions/v1/generate-recipe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify({
          videoUrl: videoUrl,
          userPreferences: userPreferences, // Send prefs to backend
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Recipe Gen Failed: ${errorText}`);
      }

      const data = await response.json();

      if (data.success && data.data) {
        return {
          ...data.data,
          sourceUrl: videoUrl,
          // ID and CreatedAt provided by client usually, or we can add here
        } as Recipe;
      } else {
        throw new Error('Invalid recipe data returned.');
      }
    } catch (error) {
      console.error('RecipeService Gen Error:', error);
      throw error;
    }
  },

  /**
   * Save recipe to Supabase (Cloud Sync)
   */
  async saveRecipe(recipe: Recipe): Promise<Recipe> {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('user_recipes')
      .insert({
        user_id: userData.user.id,
        title: recipe.title,
        description: recipe.description,
        ingredients: recipe.ingredients,
        steps: recipe.steps,
        time_minutes: recipe.time_minutes,
        difficulty: recipe.difficulty,
        servings: recipe.servings,
        calories_per_serving: recipe.calories_per_serving,
        tips: recipe.tips,
        source_url: recipe.sourceUrl,
        image_url: recipe.imageUrl, // Capture image for feed
      })
      .select()
      .single();

    if (error) {
      console.error('Save Recipe Error:', error);
      throw error;
    }

    return {
      ...recipe,
      id: data.id,
      createdAt: data.created_at,
    };
  },

  /**
   * Fetch user recipes from Cloud
   */
  async getUserRecipes(): Promise<Recipe[]> {
    const { data, error } = await supabase
      .from('user_recipes')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return data.map((row: any) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      ingredients: row.ingredients,
      steps: row.steps,
      time_minutes: row.time_minutes,
      difficulty: row.difficulty,
      servings: row.servings,
      calories_per_serving: row.calories_per_serving,
      tips: row.tips,
      sourceUrl: row.source_url,
      createdAt: row.created_at,
    }));
  },

  /**
   * Delete recipe
   */
  async deleteRecipe(id: string): Promise<void> {
    const { error } = await supabase.from('user_recipes').delete().eq('id', id);
    if (error) throw error;
  },
};
