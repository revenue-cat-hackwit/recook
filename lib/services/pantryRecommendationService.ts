import { supabase, supabaseUrl, supabaseAnonKey } from '@/lib/supabase';
import { Recipe, Ingredient } from '@/lib/types';
import { RecipeService } from './recipeService';
import { AuthApiService } from './authApiService';

export interface PantryRecommendationParams {
  pantryItems: string[];
  maxIngredients?: number;
  cuisine?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  timeLimit?: number;
  servings?: number;
}

export interface MissingIngredient {
  item: string;
  quantity: number | string;
  unit: string;
  isEssential: boolean;
}

export interface RecipeWithPantryMatch extends Recipe {
  pantryMatchScore: number;
  usedPantryItems: string[];
  missingIngredients: MissingIngredient[];
  alternativeSuggestions?: string[];
}

export const PantryRecommendationService = {
  /**
   * Get recipe recommendations based on pantry items
   * Combines AI-generated recipes with existing saved recipes
   */
  async getRecommendations(params: PantryRecommendationParams): Promise<RecipeWithPantryMatch[]> {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw new Error('User not authenticated');

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;

    if (!token) {
      throw new Error('No active session found');
    }

    try {
      // Fetch both AI recommendations and existing recipes in parallel
      const [aiRecommendations, existingRecipes] = await Promise.all([
        this.getAIRecommendations(params, token),
        this.getExistingRecipeMatches(params.pantryItems)
      ]);

      // Combine and sort by match score
      const allRecommendations = [...existingRecipes, ...aiRecommendations]
        .sort((a, b) => b.pantryMatchScore - a.pantryMatchScore)
        .slice(0, 6); // Return top 6 recommendations

      return allRecommendations;
    } catch (error: any) {
      console.error('Pantry Recommendation Error:', error);
      throw error;
    }
  },

  /**
   * Get AI-generated recommendations from edge function
   */
  async getAIRecommendations(params: PantryRecommendationParams, token: string): Promise<RecipeWithPantryMatch[]> {
    try {
      // Fetch personalization data first
      let customPreferences = {};
      try {
        const personalRes = await AuthApiService.getPersonalization();
        if (personalRes?.data?.personalization) {
           customPreferences = personalRes.data.personalization;
        }
      } catch(e) { console.log('Failed to fetch prefs for pantry rec:', e); }

      const response = await fetch(`${supabaseUrl}/functions/v1/pantry-recommendations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          apikey: supabaseAnonKey,
        },
        body: JSON.stringify({
          pantryItems: params.pantryItems,
          maxIngredients: params.maxIngredients || 5,
          cuisine: params.cuisine || 'any',
          difficulty: params.difficulty || 'easy',
          timeLimit: params.timeLimit || 60,
          servings: params.servings || 2,
          customPreferences: customPreferences,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Pantry recommendations API error:', errorText);
        throw new Error(`Recommendation failed: ${response.status} ${errorText}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to get recommendations');
      }

      // Transform AI-generated recommendations to Recipe format
      return data.data.map((recipe: any): RecipeWithPantryMatch => ({
        id: recipe.id || `ai-rec-${Date.now()}-${Math.random()}`,
        title: recipe.title,
        description: recipe.description || `Made with ingredients from your pantry`,
        ingredients: recipe.ingredients || [],
        steps: recipe.steps || [],
        time_minutes: String(recipe.time_minutes || '30'),
        difficulty: recipe.difficulty?.toLowerCase() || 'easy',
        servings: String(recipe.servings || '2'),
        calories_per_serving: String(recipe.calories_per_serving || '0'),
        tips: recipe.tips || '',
        sourceUrl: recipe.sourceUrl || '',
        imageUrl: recipe.imageUrl || 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800',
        createdAt: new Date().toISOString(),
        pantryMatchScore: recipe.matchScore || 0,
        missingIngredients: recipe.missingIngredients || [],
        usedPantryItems: recipe.usedPantryItems || [],
        alternativeSuggestions: recipe.alternativeSuggestions || [],
      }));
    } catch (error: any) {
      console.error('AI Recommendation Error:', error);
      // Return empty array instead of throwing to allow existing recipes to still show
      return [];
    }
  },

  /**
   * Get existing saved recipes that match pantry items
   */
  async getExistingRecipeMatches(pantryItems: string[]): Promise<RecipeWithPantryMatch[]> {
    try {
      const recipes = await RecipeService.getUserRecipes(0, 100);
      const pantryItemsLower = pantryItems.map(item => item.toLowerCase().trim());

      return recipes
        .map(recipe => {
          const recipeIngredients = recipe.ingredients || [];
          const ingredientNames = recipeIngredients.map((ing: Ingredient) => 
            ing.item.toLowerCase().trim()
          );

          // Calculate which pantry items are used
          const usedPantryItems = pantryItemsLower.filter(pantryItem =>
            ingredientNames.some(ingredient =>
              ingredient.includes(pantryItem) || pantryItem.includes(ingredient)
            )
          );

          // Calculate missing ingredients
          const missingIngredients = recipeIngredients.filter((ing: Ingredient) => {
            const ingredientLower = ing.item.toLowerCase().trim();
            return !pantryItemsLower.some(pantryItem =>
              ingredientLower.includes(pantryItem) || pantryItem.includes(ingredientLower)
            );
          }).map((ing: Ingredient) => ({
            item: ing.item,
            quantity: ing.quantity,
            unit: ing.unit,
            isEssential: true, // Assume all missing are essential for saved recipes
          }));

          // Calculate match score
          const matchScore = ingredientNames.length > 0 
            ? usedPantryItems.length / ingredientNames.length 
            : 0;

          return {
            ...recipe,
            pantryMatchScore: matchScore,
            usedPantryItems,
            missingIngredients,
            alternativeSuggestions: [],
          } as RecipeWithPantryMatch;
        })
        .filter(recipe => recipe.pantryMatchScore > 0.3) // At least 30% match
        .sort((a, b) => b.pantryMatchScore - a.pantryMatchScore)
        .slice(0, 3); // Top 3 existing recipes
    } catch (error: any) {
      console.error('Error fetching existing recipes:', error);
      return [];
    }
  },

  /**
   * Get pantry items that will expire soon (within 3 days)
   */
  async getExpiringSoonItems(): Promise<{name: string, daysLeft: number}[]> {
    const { data: userData, error: authError } = await supabase.auth.getUser();
    if (authError || !userData.user) throw new Error('User not authenticated');

    const today = new Date().toISOString().split('T')[0];
    const threeDaysLater = new Date();
    threeDaysLater.setDate(threeDaysLater.getDate() + 3);
    const threeDaysLaterStr = threeDaysLater.toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('pantry_items')
      .select('ingredient_name, expiry_date')
      .eq('user_id', userData.user.id)
      .gte('expiry_date', today)
      .lte('expiry_date', threeDaysLaterStr)
      .order('expiry_date', { ascending: true });

    if (error) {
      console.error('Error fetching expiring items:', error);
      throw error;
    }

    if (!data || data.length === 0) {
      return [];
    }

    return data.map(item => {
      const expDate = new Date(item.expiry_date!);
      const now = new Date();
      const daysLeft = Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return {
        name: item.ingredient_name,
        daysLeft: daysLeft,
      };
    });
  },

  /**
   * Get recommendations specifically for expiring items
   */
  async getRecipesForExpiringItems(): Promise<RecipeWithPantryMatch[]> {
    const expiringItems = await this.getExpiringSoonItems();
    
    if (expiringItems.length === 0) {
      return [];
    }

    return this.getRecommendations({
      pantryItems: expiringItems.map(item => item.name),
      maxIngredients: 3, // Focus on simple recipes for expiring items
      timeLimit: 30, // Quick recipes
    });
  },

  /**
   * Get all pantry items for current user
   */
  async getPantryItems(): Promise<{name: string; category: string}[]> {
    const { data: userData, error: authError } = await supabase.auth.getUser();
    if (authError || !userData.user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('pantry_items')
      .select('ingredient_name, category')
      .eq('user_id', userData.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching pantry items:', error);
      throw error;
    }

    return data?.map(item => ({
      name: item.ingredient_name,
      category: item.category || 'Other',
    })) || [];
  },
};

export default PantryRecommendationService;