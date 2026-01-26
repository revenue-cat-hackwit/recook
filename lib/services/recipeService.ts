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
      const blob = await response.blob();

      const { error } = await supabase.storage.from('videos').upload(filePath, blob, {
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
  async generateFromVideo(videoUrl: string): Promise<Recipe> {
    try {
      const response = await fetch(`${supabaseUrl}/functions/v1/generate-recipe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify({
          videoUrl: videoUrl,
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
};
