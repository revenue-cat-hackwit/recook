import { supabase, supabaseUrl, supabaseAnonKey } from '@/lib/supabase';
import { Recipe } from '@/lib/types';

export const RecipeService = {
  /**
   * Upload video file significantly cleaner
   */
  /**
   * Upload media file (Video or Image)
   */
  async uploadMedia(uri: string): Promise<string> {
    const ext = uri.split('.').pop()?.toLowerCase() || 'jpg';
    const isVideo = ['mp4', 'mov', 'avi'].includes(ext);
    const contentType = isVideo ? `video/${ext}` : `image/${ext}`;

    // Clean filename
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
    const bucket = 'videos'; // Re-using videos bucket for now, or change to 'media' if available

    try {
      const response = await fetch(uri);
      const arrayBuffer = await response.arrayBuffer();

      const { error } = await supabase.storage.from(bucket).upload(fileName, arrayBuffer, {
        contentType: contentType,
        upsert: false,
      });

      if (error) throw error;

      const { data } = supabase.storage.from(bucket).getPublicUrl(fileName);
      return data.publicUrl;
    } catch (error) {
      console.error('RecipeService Upload Error:', error);
      throw error;
    }
  },

  /**
   * Generate food image from text prompt
   */
  async generateImage(prompt: string): Promise<string> {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw new Error('User not authenticated');

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;

    // Use custom fetch with longer timeout (180s) instead of supabase.functions.invoke
    // because image generation can take 60-120 seconds
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 180000); // 3 minutes

    try {
      const response = await fetch(`${supabaseUrl}/functions/v1/generate-food-image`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          apikey: supabaseAnonKey,
        },
        body: JSON.stringify({ prompt }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Image generation failed: ${errorText}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to generate image');
      }

      return data.imageUrl;
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error('Image generation timeout - please try again');
      }
      throw error;
    }
  },

  /**
   * Step 1: Extract Media from URL (Social Media support)
   */
  async extractMedia(videoUrl: string): Promise<{ mediaItems: any[]; sourceUrl?: string }> {
    try {
      const response = await fetch(`${supabaseUrl}/functions/v1/extract-media`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify({ videoUrl }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Media Extraction Failed: ${errorText}`); // Shortened error
      }

      const data = await response.json();
      if (data.success && data.data) {
        return data.data; // Returns { mediaItems: [], sourceUrl: ... }
      } else {
        throw new Error('Invalid media extraction response.');
      }
    } catch (error) {
      console.error('Extract Media Error:', error);
      throw error;
    }
  },

  /**
   * Step 2: Generate recipe from Processed Media Items
   * Now accepts an object with mediaItems or the old videoUrl for backward compat
   */
    async generateFromVideo(
    input: { videoUrl?: string; mediaItems?: any[]; title?: string; description?: string },
    userPreferences?: any,
  ): Promise<Recipe> {
    try {
      // Create a sanitized payload
      const payload: any = {
        ...input,
        userPreferences: userPreferences,
      };

      // Workaround: The backend/AI provider seems to crash if 'videoUrl' is provided 
      // alongside mediaItems or if it tries to use 'video_url' message type which is unsupported.
      // If we have extracted mediaItems (images/text), we should rely on those and omit videoUrl
      // to prevent the backend from attempting to format it incorrectly.
      if (payload.mediaItems && payload.mediaItems.length > 0) {
         delete payload.videoUrl;
      }

      const response = await fetch(`${supabaseUrl}/functions/v1/generate-recipe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Recipe Gen Failed: ${errorText}`);
      }

      const data = await response.json();

      // Check if backend returned an error (e.g., no food detected)
      if (data.error) {
        // Preserve the original error message from backend
        throw new Error(
          JSON.stringify({
            error: data.error,
            message: data.message || 'Recipe generation failed',
          }),
        );
      }

      if (data.success && data.data) {
        return {
          ...data.data,
          // Handle sourceUrl if backend doesn't return it
          sourceUrl: input.videoUrl || data.data.sourceUrl,
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
        image_url: recipe.imageUrl,
        collections: recipe.collections || [],
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
   * Update existing recipe
   */
  async updateRecipe(recipe: Recipe): Promise<void> {
    const { error } = await supabase
      .from('user_recipes')
      .update({
        title: recipe.title,
        description: recipe.description,
        ingredients: recipe.ingredients,
        steps: recipe.steps,
        tips: recipe.tips,
        image_url: recipe.imageUrl,
        collections: recipe.collections,
        time_minutes: recipe.time_minutes,
        calories_per_serving: recipe.calories_per_serving,
        servings: recipe.servings,
      })
      .eq('id', recipe.id);

    if (error) {
      console.error('Update Recipe Error:', error);
      throw error;
    }
  },
  async getUserRecipes(page = 0, limit = 20): Promise<Recipe[]> {
    const from = page * limit;
    const to = from + limit - 1;

    const { data, error } = await supabase
      .from('user_recipes')
      .select('*')
      .order('created_at', { ascending: false })
      .range(from, to);

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
      imageUrl: row.image_url,
      createdAt: row.created_at,
      collections: row.collections || [],
    }));
  },

  /**
   * Delete recipe
   */
  async deleteRecipe(id: string): Promise<void> {
    const { error } = await supabase.from('user_recipes').delete().eq('id', id);
    if (error) throw error;
  },

  /**
   * Calculate Nutrition using AI
   */
  async calculateNutrition(
    ingredients: string[],
    servings: string,
  ): Promise<{ time_minutes: string; calories_per_serving: string }> {
    const prompt = `
      I have a recipe with these ingredients:
      ${ingredients.join('\n- ')}
      
      Servings: ${servings}

      Please estimate:
      1. Total cooking/prep time in minutes (approx).
      2. Calories per serving.

      Return ONLY a valid JSON object like this:
      {
        "time_minutes": "15",
        "calories_per_serving": "300"
      }
      Do not include markdown formatting or extra text.
      `;

    const response = await fetch(`${supabaseUrl}/functions/v1/ai-assistant`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify({
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 100,
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to calculate nutrition');
    }

    const data = await response.json();
    if (!data.success) throw new Error(data.error);

    // Parse JSON from content
    let content = data.data.message.trim();
    // Clean markdown if present
    if (content.startsWith('```json')) {
      content = content.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (content.startsWith('```')) {
      content = content.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    try {
      const result = JSON.parse(content);
      return {
        time_minutes: String(result.time_minutes || '15'),
        calories_per_serving: String(result.calories_per_serving || '0'),
      };
    } catch (e) {
      console.error('Failed to parse AI nutrition response', content);
      throw new Error('Could not parse nutrition data');
    }
  },
  async findRecipeByTitle(title: string): Promise<Recipe | null> {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return null;

    const { data, error } = await supabase
      .from('user_recipes')
      .select('*')
      .eq('user_id', userData.user.id)
      .ilike('title', title)
      .limit(1)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
       console.error("Error checking dupe:", error);
       return null;
    }
    if (!data) return null;
    
    // Map to Recipe
    return {
      id: data.id,
      title: data.title,
      description: data.description,
      ingredients: data.ingredients,
      steps: data.steps,
      time_minutes: data.time_minutes,
      difficulty: data.difficulty,
      servings: data.servings,
      calories_per_serving: data.calories_per_serving,
      tips: data.tips,
      sourceUrl: data.source_url,
      imageUrl: data.image_url,
      createdAt: data.created_at,
      collections: data.collections || [],
    };
  },
};
