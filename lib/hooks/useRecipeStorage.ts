import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Recipe } from '@/lib/types';
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
      const jsonValue = await AsyncStorage.getItem(RECIPES_STORAGE_KEY);
      if (jsonValue != null) {
        setSavedRecipes(JSON.parse(jsonValue));
      }
    } catch (e) {
      console.error('Failed to load recipes', e);
    } finally {
      setLoading(false);
    }
  };

  const saveRecipe = async (recipe: Recipe) => {
    try {
      // Check if exists
      const exists = savedRecipes.find((r) => r.id === recipe.id);
      if (exists) return;

      const newHistory = [recipe, ...savedRecipes];
      setSavedRecipes(newHistory);
      await AsyncStorage.setItem(RECIPES_STORAGE_KEY, JSON.stringify(newHistory));
    } catch (e) {
      console.error('Save recipe error', e);
      Alert.alert('Error', 'Gagal menyimpan resep.');
    }
  };

  const deleteRecipe = async (id: string) => {
    try {
      const newHistory = savedRecipes.filter((r) => r.id !== id);
      setSavedRecipes(newHistory);
      await AsyncStorage.setItem(RECIPES_STORAGE_KEY, JSON.stringify(newHistory));
    } catch (e) {
      console.error('Delete recipe error', e);
      Alert.alert('Error', 'Gagal menghapus resep.');
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
