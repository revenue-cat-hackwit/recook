import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Recipe } from '@/lib/types';
import { RecipeService } from '@/lib/services/recipeService';
import { Alert } from 'react-native';

const RECIPES_STORAGE_KEY = 'pirinku_local_recipes_v1';

export const useRecipeStorage = () => {
  const [savedRecipes, setSavedRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const PAGE_SIZE = 50;

  useEffect(() => {
    loadRecipes();
  }, []);

  const loadRecipes = async (refresh = false) => {
    try {
      if (refresh) {
        setLoading(true);
        setPage(0);
        setHasMore(true);
      } else {
        // Initial load check cache
      }

      // If refresh, we want page 0.
      const targetPage = refresh ? 0 : 0;

      // 1. Load Local Cache first ONLY on initial full reload
      if (refresh) {
        const jsonValue = await AsyncStorage.getItem(RECIPES_STORAGE_KEY);
        if (jsonValue != null) {
          setSavedRecipes(JSON.parse(jsonValue));
        }
      }

      // 2. Fetch from Cloud
      try {
        const cloudRecipes = await RecipeService.getUserRecipes(targetPage, PAGE_SIZE);

        if (cloudRecipes.length < PAGE_SIZE) setHasMore(false);
        else setHasMore(true);

        setSavedRecipes(cloudRecipes);

        // Only cache the first page to keep app fast on startup
        if (targetPage === 0) {
          await AsyncStorage.setItem(RECIPES_STORAGE_KEY, JSON.stringify(cloudRecipes));
        }
      } catch (cloudError) {
        console.log('Cloud sync failed, using local cache:', cloudError);
      }
    } catch (e) {
      console.error('Failed to load recipes', e);
    } finally {
      setLoading(false);
    }
  };

  const loadMore = async () => {
    if (!hasMore || loading || loadingMore) return;

    try {
      setLoadingMore(true);
      const nextPage = page + 1;
      const newRecipes = await RecipeService.getUserRecipes(nextPage, PAGE_SIZE);

      if (newRecipes.length < PAGE_SIZE) setHasMore(false);

      if (newRecipes.length > 0) {
        setSavedRecipes((prev) => [...prev, ...newRecipes]);
        setPage(nextPage);
      }
    } catch (e) {
      console.error('Load more failed', e);
    } finally {
      setLoadingMore(false);
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

  const updateRecipe = async (recipe: Recipe) => {
    try {
      // Optimistic Update
      const newList = savedRecipes.map((r) => (r.id === recipe.id ? recipe : r));
      setSavedRecipes(newList);
      await AsyncStorage.setItem(RECIPES_STORAGE_KEY, JSON.stringify(newList));

      // Update Cloud
      await RecipeService.updateRecipe(recipe);
    } catch (e) {
      console.error('Update recipe error', e);
      Alert.alert('Error', 'Failed to update recipe in cloud.');
    }
  };

  return {
    savedRecipes,
    isLoading: loading,
    isLoadingMore: loadingMore,
    hasMore,
    saveRecipe,
    deleteRecipe,
    updateRecipe,
    refreshRecipes: () => loadRecipes(true),
    loadMore,
  };
};
