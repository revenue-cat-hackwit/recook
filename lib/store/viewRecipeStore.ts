import { create } from 'zustand';
import { Recipe } from '@/lib/types';

interface ViewRecipeState {
  recipe: Recipe | null;
  setRecipe: (recipe: Recipe) => void;
  clearRecipe: () => void;
}

export const useViewRecipeStore = create<ViewRecipeState>((set) => ({
  recipe: null,
  setRecipe: (recipe) => set({ recipe }),
  clearRecipe: () => set({ recipe: null }),
}));
