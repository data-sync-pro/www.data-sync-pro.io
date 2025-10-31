import { Injectable } from '@angular/core';
import { RecipeExportService } from './recipe-export.service';
import { SourceRecipeRecord } from '../../shared/models/recipe.model';

export interface RecipePreviewData {
  recipeId: string;
  title: string;
  category: string;
  recipeData: SourceRecipeRecord;
  timestamp: number;
}

@Injectable({
  providedIn: 'root'
})
export class RecipePreviewService {
  private readonly PREVIEW_KEY_PREFIX = 'recipe-preview-';
  
  constructor(
    private exportService: RecipeExportService
  ) {}

  /**
   * Save preview data to session storage
   */
  savePreviewData(data: RecipePreviewData): void {
    const storageKey = `${this.PREVIEW_KEY_PREFIX}${data.recipeId}`;
    
    // Update the data with timestamp
    const processedData: RecipePreviewData = {
      ...data,
      timestamp: Date.now()
    };
    
    // Save to session storage
    sessionStorage.setItem(storageKey, JSON.stringify(processedData));
  }

  /**
   * Get preview data from session storage
   */
  getPreviewData(recipeId: string): RecipePreviewData | null {
    const storageKey = `${this.PREVIEW_KEY_PREFIX}${recipeId}`;
    const storedData = sessionStorage.getItem(storageKey);
    
    if (!storedData) {
      return null;
    }
    
    try {
      return JSON.parse(storedData) as RecipePreviewData;
    } catch (error) {
      console.error('Error parsing recipe preview data:', error);
      return null;
    }
  }

  /**
   * Clear preview data for a specific recipe
   */
  clearPreviewData(recipeId: string): void {
    const storageKey = `${this.PREVIEW_KEY_PREFIX}${recipeId}`;
    sessionStorage.removeItem(storageKey);
  }

  /**
   * Clear all preview data
   */
  clearAllPreviewData(): void {
    const keysToRemove: string[] = [];
    
    // Find all preview keys
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && key.startsWith(this.PREVIEW_KEY_PREFIX)) {
        keysToRemove.push(key);
      }
    }
    
    // Remove them
    keysToRemove.forEach(key => sessionStorage.removeItem(key));
  }

  /**
   * Open preview in new tab using existing Recipe page
   */
  openPreviewInNewTab(recipeId: string, data: RecipePreviewData): { success: boolean; window?: Window; url?: string } {
    // Save the preview data first
    this.savePreviewData(data);
    
    // Create preview URL
    const url = `/recipes?preview=true&recipeId=${recipeId}`;
    
    try {
      // Try to open with minimal parameters to avoid popup blocking
      const previewWindow = window.open(url, `recipe_preview_${recipeId.replace(/[^a-zA-Z0-9]/g, '_')}`);
      
      if (previewWindow) {
        // Success - window opened
        return { success: true, window: previewWindow };
      } else {
        // Popup blocked - return URL for fallback
        return { success: false, url };
      }
    } catch (error) {
      console.error('Error opening recipe preview window:', error);
      return { success: false, url };
    }
  }

  /**
   * Update preview data and notify open preview windows
   */
  updatePreviewData(data: RecipePreviewData): void {
    const storageKey = `${this.PREVIEW_KEY_PREFIX}${data.recipeId}`;
    
    // Ensure timestamp is current
    const updatedData = {
      ...data,
      timestamp: Date.now()
    };
    const dataString = JSON.stringify(updatedData);
    
    console.log('📤 Updating recipe preview data for:', data.recipeId, 'at', new Date().toLocaleTimeString());
    
    // Method 1: Direct sessionStorage update (triggers real storage events)
    // First remove the key, then set it to ensure the storage event fires
    sessionStorage.removeItem(storageKey);
    sessionStorage.setItem(storageKey, dataString);
    
    console.log('✅ Recipe preview data saved to sessionStorage');
    
    // Method 2: Also try localStorage as backup (some browsers handle this better for cross-tab)
    const backupKey = `backup-${storageKey}`;
    localStorage.removeItem(backupKey);
    localStorage.setItem(backupKey, dataString);
    
    console.log('💾 Recipe preview backup saved to localStorage');
  }
}