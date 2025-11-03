import { Injectable } from '@angular/core';
import { SourceRecipeRecord } from '../../core/models/recipe.model';
import { RecipeLoggerService } from '../../core/services/logger.service';
import { LocalStorageService } from '../../core/services/local-storage.service';
import { cleanRecipeForStorage } from '../../core/utils';
import { EditorTab } from './state.service';

@Injectable({
  providedIn: 'root'
})
export class RecipeStorageService {
  private readonly STORAGE_KEY_PREFIX = 'recipe_editor_';
  private readonly EDITED_RECIPES_KEY = this.STORAGE_KEY_PREFIX + 'edited_recipes';
  private readonly TABS_KEY = this.STORAGE_KEY_PREFIX + 'tabs';
  private readonly EDITED_IDS_KEY = this.STORAGE_KEY_PREFIX + 'edited_ids';

  constructor(
    private logger: RecipeLoggerService,
    private storage: LocalStorageService
  ) {}

  /**
   * Save a recipe to localStorage
   */
  saveRecipe(recipe: SourceRecipeRecord): boolean {
    try {
      if (!recipe.id) {
        this.logger.error('Recipe must have an ID to be saved');
        return false;
      }

      // Clean the recipe before saving using shared utility
      const cleanedRecipe = cleanRecipeForStorage(recipe);

      // Get existing edited recipes
      const editedRecipes = this.getAllEditedRecipes();
      
      // Find and update or add new
      const existingIndex = editedRecipes.findIndex(r => r.id === cleanedRecipe.id);
      if (existingIndex >= 0) {
        editedRecipes[existingIndex] = cleanedRecipe;
      } else {
        editedRecipes.push(cleanedRecipe);
      }
      
      // Save to localStorage
      this.storage.setItem(this.EDITED_RECIPES_KEY, editedRecipes);
      
      // Update edited IDs list
      this.updateEditedIds(editedRecipes);
      
      return true;
    } catch (error) {
      this.logger.error('Error saving recipe:', error);
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
      this.logger.error('Error getting edited recipe:', error);
      return null;
    }
  }
  
  /**
   * Get all edited recipes
   * Uses LocalStorageService for consistent access
   */
  getAllEditedRecipes(): SourceRecipeRecord[] {
    return this.storage.getItem<SourceRecipeRecord[]>(this.EDITED_RECIPES_KEY, []) || [];
  }

  /**
   * Get list of edited recipe IDs
   * Uses LocalStorageService for consistent access
   */
  getEditedRecipeIds(): string[] {
    return this.storage.getItem<string[]>(this.EDITED_IDS_KEY, []) || [];
  }
  
  /**
   * Update the list of edited recipe IDs
   */
  private updateEditedIds(recipes: SourceRecipeRecord[]): void {
    const ids = recipes.map(r => r.id).filter(id => id);
    this.storage.setItem(this.EDITED_IDS_KEY, ids);
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

      this.storage.setItem(this.EDITED_RECIPES_KEY, filteredRecipes);
      this.updateEditedIds(filteredRecipes);

      return true;
    } catch (error) {
      this.logger.error('Error deleting edited recipe:', error);
      return false;
    }
  }
  
  /**
   * Save tabs state
   */
  saveTabs(tabs: EditorTab[]): boolean {
    try {
      // Filter out sensitive data before saving
      const tabsToSave = tabs.map(tab => ({
        id: tab.id,
        title: tab.title,
        recipe: tab.recipe,
        hasChanges: tab.hasChanges,
        isActive: tab.isActive
      }));
      
      this.storage.setItem(this.TABS_KEY, tabsToSave);
      return true;
    } catch (error) {
      this.logger.error('Error saving tabs:', error);
      return false;
    }
  }
  
  /**
   * Get saved tabs
   * Uses LocalStorageService for consistent access
   */
  getSavedTabs(): EditorTab[] | null {
    return this.storage.getItem<EditorTab[]>(this.TABS_KEY);
  }

  /**
   * Clear specific recipe data
   */
  clearRecipe(recipeId: string): boolean {
    return this.deleteEditedRecipe(recipeId);
  }

  /**
   * Clear all stored data
   * Uses LocalStorageService clear with prefix
   */
  clearAll(): boolean {
    try {
      const count = this.storage.clear(this.STORAGE_KEY_PREFIX);
      return count > 0 || this.storage.getKeys(this.STORAGE_KEY_PREFIX).length === 0;
    } catch (error) {
      this.logger.error('Error clearing all data:', error);
      return false;
    }
  }
  
  /**
   * Get storage size info
   * Uses LocalStorageService for key enumeration
   */
  getStorageInfo(): { used: number; available: number; percentage: number } {
    try {
      let totalSize = 0;

      // Calculate size of our data using LocalStorageService
      const keys = this.storage.getKeys(this.STORAGE_KEY_PREFIX);
      keys.forEach(key => {
        const value = this.storage.getItem<string>(key);
        if (value) {
          totalSize += key.length + JSON.stringify(value).length;
        }
      });
      
      // Estimate available (localStorage typically has 5-10MB limit)
      const estimatedLimit = 5 * 1024 * 1024; // 5MB in bytes
      
      return {
        used: totalSize,
        available: estimatedLimit,
        percentage: (totalSize / estimatedLimit) * 100
      };
    } catch (error) {
      this.logger.error('Error getting storage info:', error);
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

      // Save using LocalStorageService
      this.storage.setItem(this.EDITED_RECIPES_KEY, mergedRecipes);
      this.updateEditedIds(mergedRecipes);

      return true;
    } catch (error) {
      this.logger.error('Error importing recipes:', error);
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