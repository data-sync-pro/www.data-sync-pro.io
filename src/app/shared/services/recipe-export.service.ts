import { Injectable } from '@angular/core';
import { SourceRecipeRecord } from '../models/recipe.model';
import { RecipeFileStorageService } from './recipe-file-storage.service';
import { NotificationService } from './notification.service';

declare const JSZip: any;

export interface ExportProgress {
  step: string;
  current: number;
  total: number;
  percentage: number;
}

@Injectable({
  providedIn: 'root'
})
export class RecipeExportService {
  
  constructor(
    private notificationService: NotificationService
  ) {}
  
  /**
   * Export single recipe as JSON file
   */
  async exportSingleRecipe(recipe: SourceRecipeRecord): Promise<void> {
    try {
      const jsonString = JSON.stringify(recipe, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const filename = `${recipe.id || 'recipe'}.json`;
      
      this.downloadBlob(blob, filename);
      this.notificationService.success(`Recipe exported: ${filename}`);
    } catch (error) {
      console.error('Error exporting single recipe:', error);
      this.notificationService.error('Failed to export recipe');
    }
  }
  
  /**
   * Export all recipes as ZIP with folder structure and images
   */
  async exportAllAsZip(
    recipes: SourceRecipeRecord[], 
    fileStorage: RecipeFileStorageService,
    onProgress?: (progress: ExportProgress) => void
  ): Promise<void> {
    try {
      // Check if JSZip is available
      if (typeof JSZip === 'undefined') {
        throw new Error('JSZip library not available');
      }
      
      const zip = new JSZip();
      let processedCount = 0;
      const totalSteps = recipes.length * 2; // Recipe + images for each
      
      // Progress update helper
      const updateProgress = (step: string) => {
        if (onProgress) {
          onProgress({
            step,
            current: processedCount,
            total: totalSteps,
            percentage: Math.round((processedCount / totalSteps) * 100)
          });
        }
      };
      
      // Process each recipe
      for (const recipe of recipes) {
        if (!recipe.id) continue;
        
        updateProgress(`Processing recipe: ${recipe.title}`);
        
        // Create recipe folder
        const recipeFolder = zip.folder(recipe.id);
        if (!recipeFolder) continue;
        
        // Add recipe.json
        const recipeJson = JSON.stringify(recipe, null, 2);
        recipeFolder.file('recipe.json', recipeJson);
        processedCount++;
        
        // Process images
        updateProgress(`Processing images for: ${recipe.title}`);
        
        if (recipe.walkthrough) {
          const imagesFolder = recipeFolder.folder('images');
          
          for (const step of recipe.walkthrough) {
            if (step.media) {
              for (const media of step.media) {
                if (media.type === 'image' && media.url.startsWith('images/')) {
                  try {
                    // Extract image ID from URL
                    const imageName = media.url.split('/')[1];
                    const imageId = this.extractImageId(imageName);
                    
                    // Get image from IndexedDB
                    const imageFile = await fileStorage.getImage(imageId);
                    if (imageFile && imagesFolder) {
                      imagesFolder.file(imageName, imageFile);
                    }
                  } catch (error) {
                    console.warn(`Failed to add image ${media.url}:`, error);
                  }
                }
              }
            }
          }
        }
        
        // Process general images
        if (recipe.generalImages) {
          const imagesFolder = recipeFolder.folder('images');
          
          for (const image of recipe.generalImages) {
            if (image.url && image.url.startsWith('images/')) {
              try {
                const imageName = image.url.split('/')[1];
                const imageId = this.extractImageId(imageName);
                
                const imageFile = await fileStorage.getImage(imageId);
                if (imageFile && imagesFolder) {
                  imagesFolder.file(imageName, imageFile);
                }
              } catch (error) {
                console.warn(`Failed to add general image ${image.url}:`, error);
              }
            }
          }
        }
        
        // Process downloadable executables (JSON files)
        if (recipe.downloadableExecutables && recipe.downloadableExecutables.length > 0) {
          const executablesFolder = recipeFolder.folder('downloadExecutables');
          
          for (const executable of recipe.downloadableExecutables) {
            if (executable.filePath) {
              try {
                // Extract JSON file name from path
                const fileName = executable.filePath.replace('downloadExecutables/', '');
                
                // Get JSON file from IndexedDB
                const jsonFile = await fileStorage.getJsonFile(fileName);
                if (jsonFile && executablesFolder) {
                  executablesFolder.file(fileName, jsonFile);
                }
              } catch (error) {
                console.warn(`Failed to add JSON file ${executable.filePath}:`, error);
              }
            }
          }
        }
        
        processedCount++;
      }
      
      // Generate ZIP
      updateProgress('Generating ZIP file...');
      
      const zipBlob = await zip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 }
      });
      
      // Download
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `recipes_export_${timestamp}.zip`;
      
      this.downloadBlob(zipBlob, filename);
      this.notificationService.success(`${recipes.length} recipes exported as ZIP`);
      
    } catch (error) {
      console.error('Error exporting recipes as ZIP:', error);
      this.notificationService.error('Failed to export recipes as ZIP');
    }
  }
  
  /**
   * Export recipes as JSON file (data only)
   */
  async exportAsJSON(recipes: SourceRecipeRecord[]): Promise<void> {
    try {
      const jsonString = JSON.stringify(recipes, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `recipes_${timestamp}.json`;
      
      this.downloadBlob(blob, filename);
      this.notificationService.success(`${recipes.length} recipes exported as JSON`);
    } catch (error) {
      console.error('Error exporting recipes as JSON:', error);
      this.notificationService.error('Failed to export recipes as JSON');
    }
  }
  
  /**
   * Import recipe from JSON file
   */
  async importRecipe(file: File): Promise<SourceRecipeRecord | null> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      
      reader.onload = (event) => {
        try {
          const jsonString = event.target?.result as string;
          const recipe = JSON.parse(jsonString) as SourceRecipeRecord;
          
          // Validate recipe structure
          if (this.validateRecipe(recipe)) {
            resolve(recipe);
          } else {
            this.notificationService.error('Invalid recipe format');
            resolve(null);
          }
        } catch (error) {
          console.error('Error parsing recipe JSON:', error);
          this.notificationService.error('Failed to parse recipe file');
          resolve(null);
        }
      };
      
      reader.onerror = () => {
        this.notificationService.error('Failed to read file');
        resolve(null);
      };
      
      reader.readAsText(file);
    });
  }
  
  /**
   * Import multiple recipes from JSON file
   */
  async importRecipes(file: File): Promise<SourceRecipeRecord[] | null> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      
      reader.onload = (event) => {
        try {
          const jsonString = event.target?.result as string;
          const data = JSON.parse(jsonString);
          
          // Handle both single recipe and array of recipes
          let recipes: SourceRecipeRecord[];
          if (Array.isArray(data)) {
            recipes = data;
          } else if (this.validateRecipe(data)) {
            recipes = [data];
          } else {
            throw new Error('Invalid data format');
          }
          
          // Validate all recipes
          const validRecipes = recipes.filter(recipe => this.validateRecipe(recipe));
          
          if (validRecipes.length === 0) {
            this.notificationService.error('No valid recipes found in file');
            resolve(null);
          } else {
            if (validRecipes.length < recipes.length) {
              this.notificationService.warning(`${recipes.length - validRecipes.length} invalid recipes skipped`);
            }
            resolve(validRecipes);
          }
        } catch (error) {
          console.error('Error parsing recipes JSON:', error);
          this.notificationService.error('Failed to parse recipes file');
          resolve(null);
        }
      };
      
      reader.onerror = () => {
        this.notificationService.error('Failed to read file');
        resolve(null);
      };
      
      reader.readAsText(file);
    });
  }
  
  /**
   * Validate recipe structure
   */
  private validateRecipe(recipe: any): recipe is SourceRecipeRecord {
    if (!recipe || typeof recipe !== 'object') {
      return false;
    }
    
    // Check required fields
    const requiredFields = ['title', 'category'];
    for (const field of requiredFields) {
      if (!recipe.hasOwnProperty(field) || !recipe[field]) {
        console.warn(`Recipe missing required field: ${field}`);
        return false;
      }
    }
    
    // Check category is valid
    const validCategories = ['Batch', 'Triggers', 'Data List', 'Action Button', 'Data Loader'];
    if (!validCategories.includes(recipe.category)) {
      console.warn(`Invalid category: ${recipe.category}`);
      return false;
    }
    
    // Ensure required arrays exist
    const arrayFields = ['DSPVersions', 'prerequisites', 'walkthrough', 'downloadableExecutables', 'relatedRecipes', 'keywords'];
    for (const field of arrayFields) {
      if (!recipe.hasOwnProperty(field)) {
        recipe[field] = [];
      } else if (!Array.isArray(recipe[field])) {
        console.warn(`Field ${field} should be an array`);
        return false;
      }
    }
    
    // Validate walkthrough structure
    if (recipe.walkthrough) {
      for (const step of recipe.walkthrough) {
        if (!step.step || !Array.isArray(step.config) || !Array.isArray(step.media)) {
          console.warn('Invalid walkthrough step structure');
          return false;
        }
      }
    }
    
    return true;
  }
  
  /**
   * Generate recipe ID from title
   */
  generateRecipeId(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }
  
  /**
   * Extract image ID from image filename
   */
  private extractImageId(imageName: string): string {
    // Expected format: img_timestamp_random_originalname.ext
    const parts = imageName.split('_');
    if (parts.length >= 3) {
      return parts[0] + '_' + parts[1] + '_' + parts[2];
    }
    return imageName;
  }
  
  /**
   * Download blob as file
   */
  private downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up object URL
    setTimeout(() => URL.revokeObjectURL(url), 100);
  }
  
  /**
   * Get file size in bytes
   */
  getFileSize(content: string): number {
    return new Blob([content]).size;
  }
  
  /**
   * Format file size for display
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }
}