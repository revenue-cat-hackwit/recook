import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Recipe } from '@/lib/types';
import { RecipeService } from '@/lib/services/recipeService';
import { Alert } from 'react-native';

const RECIPES_STORAGE_KEY = 'pirinku_local_recipes_v1';

export const useRecipeStorage = () => {
  const [savedRecipes, setSavedRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRecipes();
  }, []);

  const loadRecipes = async () => {
    try {
      setLoading(true);
      // 1. Load Local Cache first for speed
      const jsonValue = await AsyncStorage.getItem(RECIPES_STORAGE_KEY);
      if (jsonValue != null) {
        setSavedRecipes(JSON.parse(jsonValue));
      }

      // 2. Fetch from Cloud (Source of Truth)
      try {
        const cloudRecipes = await RecipeService.getUserRecipes();
        // Update State & Cache
        setSavedRecipes(cloudRecipes);
        await AsyncStorage.setItem(RECIPES_STORAGE_KEY, JSON.stringify(cloudRecipes));
      } catch (cloudError) {
        console.log('Cloud sync failed, using local cache:', cloudError);
      }
    } catch (e) {
      console.error('Failed to load recipes', e);
    } finally {
      setLoading(false);
    }
  };

  const saveRecipe = async (recipe: Recipe) => {
    try {
      // 1. Optimistic Update
      const optimisticList = [recipe, ...savedRecipes];
      setSavedRecipes(optimisticList);

      // Save to local cache immediately in case app closes
      await AsyncStorage.setItem(RECIPES_STORAGE_KEY, JSON.stringify(optimisticList));

      // 2. Save to Cloud
      const savedInCloud = await RecipeService.saveRecipe(recipe);

      // 3. Replace temp ID with real Cloud ID
      setSavedRecipes((current) => {
        const updated = current.map((r) => (r.id === recipe.id ? savedInCloud : r));
        AsyncStorage.setItem(RECIPES_STORAGE_KEY, JSON.stringify(updated));
        return updated;
      });
    } catch (e) {
      console.error('Save recipe error', e);
      Alert.alert('Cloud Sync Error', 'Recipe saved locally, but failed to sync to cloud.');
    }
  };

  const deleteRecipe = async (id: string) => {
    try {
      // Optimistic Delete
      const previousList = savedRecipes;
      const newList = savedRecipes.filter((r) => r.id !== id);
      setSavedRecipes(newList);
      await AsyncStorage.setItem(RECIPES_STORAGE_KEY, JSON.stringify(newList));

      // Delete from Cloud
      await RecipeService.deleteRecipe(id);
    } catch (e) {
      console.error('Delete recipe error', e);
      Alert.alert('Error', 'Failed to delete from cloud.');
      // Rollback? Not strictly necessary for MVP, but good practice.
    }
  };

  return {
    savedRecipes,
    isLoading: loading,
    saveRecipe,
    deleteRecipe,
    refreshRecipes: loadRecipes,
  };
};
