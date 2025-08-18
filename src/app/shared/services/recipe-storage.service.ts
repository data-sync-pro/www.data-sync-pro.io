import { Injectable } from '@angular/core';
import { SourceRecipeRecord } from '../models/recipe.model';

interface RecipeTab {
  id: string;
  title: string;
  recipe: SourceRecipeRecord;
  hasChanges: boolean;
  isActive: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class RecipeStorageService {
  private readonly STORAGE_KEY_PREFIX = 'recipe_editor_';
  private readonly EDITED_RECIPES_KEY = this.STORAGE_KEY_PREFIX + 'edited_recipes';
  private readonly TABS_KEY = this.STORAGE_KEY_PREFIX + 'tabs';
  private readonly EDITED_IDS_KEY = this.STORAGE_KEY_PREFIX + 'edited_ids';
  
  constructor() {}
  
  /**
   * Save a recipe to localStorage
   */
  saveRecipe(recipe: SourceRecipeRecord): boolean {
    try {
      if (!recipe.id) {
        console.error('Recipe must have an ID to be saved');
        return false;
      }
      
      // Get existing edited recipes
      const editedRecipes = this.getAllEditedRecipes();
      
      // Find and update or add new
      const existingIndex = editedRecipes.findIndex(r => r.id === recipe.id);
      if (existingIndex >= 0) {
        editedRecipes[existingIndex] = recipe;
      } else {
        editedRecipes.push(recipe);
      }
      
      // Save to localStorage
      localStorage.setItem(this.EDITED_RECIPES_KEY, JSON.stringify(editedRecipes));
      
      // Update edited IDs list
      this.updateEditedIds(editedRecipes);
      
      return true;
    } catch (error) {
      console.error('Error saving recipe:', error);
      return false;
    }
  }
  
  /**
   * Get a specific edited recipe
   */
  getEditedRecipe(recipeId: string): SourceRecipeRecord | null {
    try {
      const editedRecipes = this.getAllEditedRecipes();
      return editedRecipes.find(r => r.id === recipeId) || null;
    } catch (error) {
      console.error('Error getting edited recipe:', error);
      return null;
    }
  }
  
  /**
   * Get all edited recipes
   */
  getAllEditedRecipes(): SourceRecipeRecord[] {
    try {
      const data = localStorage.getItem(this.EDITED_RECIPES_KEY);
      if (!data) {
        return [];
      }
      return JSON.parse(data);
    } catch (error) {
      console.error('Error getting all edited recipes:', error);
      return [];
    }
  }
  
  /**
   * Get list of edited recipe IDs
   */
  getEditedRecipeIds(): string[] {
    try {
      const data = localStorage.getItem(this.EDITED_IDS_KEY);
      if (!data) {
        return [];
      }
      return JSON.parse(data);
    } catch (error) {
      console.error('Error getting edited recipe IDs:', error);
      return [];
    }
  }
  
  /**
   * Update the list of edited recipe IDs
   */
  private updateEditedIds(recipes: SourceRecipeRecord[]): void {
    const ids = recipes.map(r => r.id).filter(id => id);
    localStorage.setItem(this.EDITED_IDS_KEY, JSON.stringify(ids));
  }
  
  /**
   * Delete an edited recipe
   */
  deleteEditedRecipe(recipeId: string): boolean {
    try {
      const editedRecipes = this.getAllEditedRecipes();
      const filteredRecipes = editedRecipes.filter(r => r.id !== recipeId);
      
      if (filteredRecipes.length === editedRecipes.length) {
        return false; // Recipe not found
      }
      
      localStorage.setItem(this.EDITED_RECIPES_KEY, JSON.stringify(filteredRecipes));
      this.updateEditedIds(filteredRecipes);
      
      return true;
    } catch (error) {
      console.error('Error deleting edited recipe:', error);
      return false;
    }
  }
  
  /**
   * Save tabs state
   */
  saveTabs(tabs: RecipeTab[]): boolean {
    try {
      // Filter out sensitive data before saving
      const tabsToSave = tabs.map(tab => ({
        id: tab.id,
        title: tab.title,
        recipe: tab.recipe,
        hasChanges: tab.hasChanges,
        isActive: tab.isActive
      }));
      
      localStorage.setItem(this.TABS_KEY, JSON.stringify(tabsToSave));
      return true;
    } catch (error) {
      console.error('Error saving tabs:', error);
      return false;
    }
  }
  
  /**
   * Get saved tabs
   */
  getSavedTabs(): RecipeTab[] | null {
    try {
      const data = localStorage.getItem(this.TABS_KEY);
      if (!data) {
        return null;
      }
      return JSON.parse(data);
    } catch (error) {
      console.error('Error getting saved tabs:', error);
      return null;
    }
  }
  
  /**
   * Clear specific recipe data
   */
  clearRecipe(recipeId: string): boolean {
    return this.deleteEditedRecipe(recipeId);
  }
  
  /**
   * Clear all stored data
   */
  clearAll(): boolean {
    try {
      // Get all keys that start with our prefix
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.STORAGE_KEY_PREFIX)) {
          keysToRemove.push(key);
        }
      }
      
      // Remove all our keys
      keysToRemove.forEach(key => localStorage.removeItem(key));
      
      return true;
    } catch (error) {
      console.error('Error clearing all data:', error);
      return false;
    }
  }
  
  /**
   * Get storage size info
   */
  getStorageInfo(): { used: number; available: number; percentage: number } {
    try {
      let totalSize = 0;
      
      // Calculate size of our data
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.STORAGE_KEY_PREFIX)) {
          const value = localStorage.getItem(key);
          if (value) {
            totalSize += key.length + value.length;
          }
        }
      }
      
      // Estimate available (localStorage typically has 5-10MB limit)
      const estimatedLimit = 5 * 1024 * 1024; // 5MB in bytes
      
      return {
        used: totalSize,
        available: estimatedLimit,
        percentage: (totalSize / estimatedLimit) * 100
      };
    } catch (error) {
      console.error('Error getting storage info:', error);
      return { used: 0, available: 0, percentage: 0 };
    }
  }
  
  /**
   * Import recipes from JSON
   */
  importRecipes(recipes: SourceRecipeRecord[]): boolean {
    try {
      const existingRecipes = this.getAllEditedRecipes();
      
      // Merge with existing, replacing duplicates
      const recipeMap = new Map<string, SourceRecipeRecord>();
      
      // Add existing recipes
      existingRecipes.forEach(r => {
        if (r.id) {
          recipeMap.set(r.id, r);
        }
      });
      
      // Add/replace with imported recipes
      recipes.forEach(r => {
        if (r.id) {
          recipeMap.set(r.id, r);
        }
      });
      
      // Convert back to array
      const mergedRecipes = Array.from(recipeMap.values());
      
      // Save
      localStorage.setItem(this.EDITED_RECIPES_KEY, JSON.stringify(mergedRecipes));
      this.updateEditedIds(mergedRecipes);
      
      return true;
    } catch (error) {
      console.error('Error importing recipes:', error);
      return false;
    }
  }
  
  /**
   * Export all recipes as JSON string
   */
  exportRecipesAsJson(): string {
    const recipes = this.getAllEditedRecipes();
    return JSON.stringify(recipes, null, 2);
  }
}