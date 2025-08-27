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
      
      // Generate and add index.json
      updateProgress('Generating index.json...');
      const indexJson = this.generateRecipeIndex(recipes);
      zip.file('index.json', JSON.stringify(indexJson, null, 2));
      
      // Add deployment instructions
      updateProgress('Adding deployment instructions...');
      const instructions = this.generateRecipeUpdateInstructions(recipes);
      zip.file('DEPLOYMENT_INSTRUCTIONS.txt', instructions);
      
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
      this.notificationService.success(`${recipes.length} recipes exported as ZIP with index.json`);
      
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
      // Export as structured data with index
      const exportData = {
        metadata: {
          exportDate: new Date().toISOString(),
          version: '1.0.0',
          recipeCount: recipes.length,
          format: 'recipe-collection'
        },
        index: this.generateRecipeIndex(recipes),
        recipes: recipes
      };
      
      const jsonString = JSON.stringify(exportData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `recipes_${timestamp}.json`;
      
      this.downloadBlob(blob, filename);
      this.notificationService.success(`${recipes.length} recipes exported as JSON with index`);
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
          
          let recipes: SourceRecipeRecord[];
          
          // Handle structured export data with index
          if (data.metadata && data.recipes && data.index) {
            console.log('Importing structured recipe export with index');
            recipes = data.recipes;
            
            // Optionally validate index consistency
            if (data.index.recipes) {
              console.log(`Index contains ${data.index.recipes.length} recipes`);
            }
          } 
          // Handle simple array of recipes (legacy)
          else if (Array.isArray(data)) {
            recipes = data;
          } 
          // Handle single recipe
          else if (this.validateRecipe(data)) {
            recipes = [data];
          } else {
            throw new Error('Invalid data format - expected recipe collection or array');
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
            console.log(`Successfully imported ${validRecipes.length} recipes`);
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
   * Import recipes from ZIP file with images and resources
   */
  async importFromZip(
    file: File, 
    fileStorage: RecipeFileStorageService,
    progressCallback?: (progress: ExportProgress) => void
  ): Promise<SourceRecipeRecord[]> {
    try {
      // Check if JSZip is available
      if (typeof JSZip === 'undefined') {
        throw new Error('JSZip library not available');
      }
      
      console.log('Starting ZIP import for file:', file.name);
      
      // Read and extract ZIP file
      const zip = new JSZip();
      const zipContent = await zip.loadAsync(file);
      
      // Check for index.json first
      let recipeIndex: any = null;
      const indexFile = zipContent.file('index.json');
      if (indexFile) {
        try {
          const indexContent = await indexFile.async('string');
          recipeIndex = JSON.parse(indexContent);
          console.log('Found index.json with recipe metadata:', recipeIndex);
        } catch (error) {
          console.warn('Failed to parse index.json:', error);
        }
      }
      
      const importedRecipes: SourceRecipeRecord[] = [];
      const folders = Object.keys(zipContent.files)
        .filter(path => path.includes('/') && !path.startsWith('__MACOSX') && !path.startsWith('index.json'))
        .map(path => path.split('/')[0])
        .filter((folder, index, self) => self.indexOf(folder) === index);
      
      let processedCount = 0;
      const totalSteps = folders.length;
      
      // Update progress helper
      const updateProgress = (step: string) => {
        processedCount++;
        if (progressCallback) {
          progressCallback({
            step,
            current: processedCount,
            total: totalSteps,
            percentage: Math.round((processedCount / totalSteps) * 100)
          });
        }
      };
      
      // Process each recipe folder
      for (const folder of folders) {
        try {
          updateProgress(`Processing: ${folder}`);
          
          // Get recipe.json file
          const recipeJsonFile = zipContent.file(`${folder}/recipe.json`);
          if (!recipeJsonFile) {
            console.warn(`No recipe.json found in folder: ${folder}`);
            continue;
          }
          
          // Parse recipe JSON
          const recipeJsonContent = await recipeJsonFile.async('string');
          const recipe = JSON.parse(recipeJsonContent) as SourceRecipeRecord;
          
          // Validate recipe
          if (!this.validateRecipe(recipe)) {
            console.warn(`Invalid recipe in folder: ${folder}`);
            continue;
          }

          // If we have index metadata, use it to validate/enhance the recipe
          if (recipeIndex && recipeIndex.recipes) {
            const indexEntry = recipeIndex.recipes.find((entry: any) => entry.folderId === folder);
            if (indexEntry && !indexEntry.active) {
              console.log(`Skipping inactive recipe: ${folder}`);
              continue;
            }
          }
          
          // Process images
          const imagesFolder = zipContent.folder(`${folder}/images`);
          if (imagesFolder) {
            const imageFiles = Object.keys(zipContent.files)
              .filter(path => path.startsWith(`${folder}/images/`) && !path.endsWith('/'));
            
            for (const imagePath of imageFiles) {
              const imageFile = zipContent.file(imagePath);
              if (imageFile) {
                try {
                  const imageName = imagePath.split('/').pop()!;
                  const imageBlob = await imageFile.async('blob');
                  
                  // Extract image ID from filename
                  const imageId = this.extractImageId(imageName);
                  
                  // Create File object from blob
                  const imageFileObj = new File([imageBlob], imageName, { type: this.getImageMimeType(imageName) });
                  
                  // Store image in IndexedDB
                  await fileStorage.storeImage(imageId, imageFileObj);
                  console.log(`Stored image: ${imageName}`);
                } catch (error) {
                  console.warn(`Failed to import image: ${imagePath}`, error);
                }
              }
            }
          }
          
          // Process downloadable executables (JSON files)
          const executablesFolder = zipContent.folder(`${folder}/downloadExecutables`);
          if (executablesFolder) {
            const jsonFiles = Object.keys(zipContent.files)
              .filter(path => path.startsWith(`${folder}/downloadExecutables/`) && path.endsWith('.json'));
            
            for (const jsonPath of jsonFiles) {
              const jsonFile = zipContent.file(jsonPath);
              if (jsonFile) {
                try {
                  const fileName = jsonPath.split('/').pop()!;
                  const jsonBlob = await jsonFile.async('blob');
                  
                  // Create File object from blob
                  const jsonFileObj = new File([jsonBlob], fileName, { type: 'application/json' });
                  
                  // Store JSON file in IndexedDB
                  await fileStorage.storeJsonFile(fileName, jsonFileObj);
                  console.log(`Stored JSON file: ${fileName}`);
                } catch (error) {
                  console.warn(`Failed to import JSON file: ${jsonPath}`, error);
                }
              }
            }
          }
          
          // Add to imported recipes
          importedRecipes.push(recipe);
          console.log(`Successfully imported recipe: ${recipe.title}`);
          
        } catch (error) {
          console.error(`Error processing folder ${folder}:`, error);
        }
      }
      
      // Final progress update
      if (progressCallback) {
        progressCallback({
          step: 'Import complete',
          current: totalSteps,
          total: totalSteps,
          percentage: 100
        });
      }
      
      if (importedRecipes.length === 0) {
        this.notificationService.error('No valid recipes found in ZIP file');
      } else {
        this.notificationService.success(`Imported ${importedRecipes.length} recipe${importedRecipes.length > 1 ? 's' : ''} from ZIP`);
      }
      
      return importedRecipes;
      
    } catch (error) {
      console.error('Error importing from ZIP:', error);
      this.notificationService.error('Failed to import from ZIP file');
      return [];
    }
  }
  
  /**
   * Get MIME type from file extension
   */
  private getImageMimeType(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'png': return 'image/png';
      case 'jpg':
      case 'jpeg': return 'image/jpeg';
      case 'gif': return 'image/gif';
      case 'webp': return 'image/webp';
      default: return 'image/png';
    }
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
   * Generate recipe index for ZIP export
   */
  private generateRecipeIndex(recipes: SourceRecipeRecord[]): any {
    const indexRecipes = recipes
      .filter(recipe => recipe.id && recipe.title) // Only include recipes with valid id and title
      .map(recipe => ({
        folderId: recipe.id,
        name: recipe.id, // Use id as name for consistency
        category: recipe.category.toLowerCase().replace(/\s+/g, '-'), // Convert to kebab-case
        active: true
      }));

    return {
      recipes: indexRecipes
    };
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

  /**
   * Generate update instructions for exported recipes
   */
  generateRecipeUpdateInstructions(recipes: SourceRecipeRecord[]): string {
    const timestamp = new Date().toISOString();
    const totalRecipes = recipes.length;
    const categories = [...new Set(recipes.map(r => r.category))];

    const instructions = `
Recipe Export Update Instructions
================================
Export Date: ${timestamp}
Total Recipes: ${totalRecipes}
Categories: ${categories.join(', ')}

How to Deploy the Exported Recipes:
-----------------------------------

1. Recipe Data Structure:
   - index.json: Contains recipe metadata and configuration
   - [recipe-id]/recipe.json: Individual recipe definitions
   - [recipe-id]/images/: Recipe-specific images
   - [recipe-id]/downloadExecutables/: JSON executable files

2. For Production Deployment:
   - Copy index.json to src/assets/recipes/
   - Copy all recipe folders to src/assets/recipes/
   - Ensure the directory structure matches: src/assets/recipes/[recipe-id]/

3. Recipe System Integration:
   - The index.json file is automatically loaded by RecipeService
   - Only recipes marked as "active: true" in index.json will be displayed
   - Category names are normalized to kebab-case for routing

4. Build Process:
   - Run: node src/tools/generate-recipe-components.js
   - This will generate Angular components for each recipe
   - Run: ng build
   - Test: ng serve

5. Validation:
   - All recipes in the index must have corresponding folders
   - Each recipe folder must contain a recipe.json file
   - Image references in recipes must match actual image files

Exported Recipe List:
-------------------
${recipes.map((recipe, index) => `${index + 1}. ${recipe.title} (${recipe.id})`).join('\n')}

Notes:
------
- The index.json format follows RecipeIndexConfig interface requirements
- Recipe IDs are used as folder names and component identifiers
- Image paths use relative references: "images/[filename]"
- All downloadable executables are stored in downloadExecutables/ subdirectory
- Recipe categories are automatically converted to URL-friendly format
`;

    return instructions;
  }

  /**
   * Download recipe update instructions
   */
  downloadRecipeInstructions(recipes: SourceRecipeRecord[]): void {
    const instructions = this.generateRecipeUpdateInstructions(recipes);
    const blob = new Blob([instructions], { type: 'text/plain' });
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const filename = `recipe-deployment-instructions-${timestamp}.txt`;
    
    this.downloadBlob(blob, filename);
  }
}