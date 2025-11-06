import { Injectable } from '@angular/core';
import { RecipeData } from '../models/recipe.model';
import { FileStorageAdapter } from '../storage';
import { NotificationService } from '../../../shared/services/notification.service';
import { LoggerService } from './logger.service';
import { FileResolverService } from './file-resolver.service';
import { RecipeIndexEntry, ProgressCallback } from './io.types';
import JSZip from 'jszip';

@Injectable({
  providedIn: 'root'
})
export class ImportService {

  constructor(
    private notificationService: NotificationService,
    private logger: LoggerService,
    private fileResolver: FileResolverService
  ) {}


  async importFromZip(
    file: File,
    fileStorage: FileStorageAdapter,
    progressCallback?: ProgressCallback
  ): Promise<RecipeData[]> {
    try {
      if (typeof JSZip === 'undefined') {
        throw new Error('JSZip library not available');
      }

      this.logger.debug('Starting ZIP import for file', { fileName: file.name });

      const zip = new JSZip();
      const zipContent = await zip.loadAsync(file);

      let recipeIndex: RecipeIndexEntry[] | null = null;
      const indexFile = zipContent.file('index.json');
      if (indexFile) {
        try {
          const indexContent = await indexFile.async('string');
          const indexData = JSON.parse(indexContent);
          recipeIndex = indexData.recipes || indexData;
          this.logger.debug('Found index.json with recipe metadata', recipeIndex);
        } catch (error) {
          this.logger.warn('Failed to parse index.json', error);
        }
      }

      const importedRecipes: RecipeData[] = [];
      const folders = Object.keys(zipContent.files)
        .filter(path => path.includes('/') && !path.startsWith('__MACOSX') && !path.startsWith('index.json'))
        .map(path => path.split('/')[0])
        .filter((folder, index, self) => self.indexOf(folder) === index);

      let processedCount = 0;
      const totalSteps = folders.length;

      const updateProgress = (step: string) => {
        processedCount++;
        if (progressCallback) {
          progressCallback({
            step,
            current: processedCount,
            total: totalSteps
          });
        }
      };

      for (const folder of folders) {
        try {
          updateProgress(`Processing: ${folder}`);

          const recipeJsonFile = zipContent.file(`${folder}/recipe.json`);
          if (!recipeJsonFile) {
            this.logger.warn(`No recipe.json found in folder: ${folder}`);
            continue;
          }

          const recipeJsonContent = await recipeJsonFile.async('string');
          const recipe = JSON.parse(recipeJsonContent) as RecipeData;

          if (!this.validateRecipe(recipe)) {
            this.logger.warn(`Invalid recipe in folder: ${folder}`);
            continue;
          }

          if (recipeIndex) {
            const indexEntry = recipeIndex.find((entry: RecipeIndexEntry) => entry.folderId === folder);
            if (indexEntry && !indexEntry.active) {
              this.logger.debug(`Skipping inactive recipe: ${folder}`);
              continue;
            }
          }

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

                  const imageId = this.fileResolver.extractImageId(imageName);

                  const imageFileObj = new File([imageBlob], imageName, { type: this.fileResolver.getImageMimeType(imageName) });

                  await fileStorage.storeImage(imageId, imageFileObj);
                  this.logger.debug(`Stored image: ${imageName}`);
                } catch (error) {
                  this.logger.warn(`Failed to import image: ${imagePath}`, error);
                }
              }
            }
          }

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

                  const jsonFileObj = new File([jsonBlob], fileName, { type: 'application/json' });

                  await fileStorage.storeJsonFile(fileName, jsonFileObj);
                  this.logger.debug(`Stored JSON file: ${fileName}`);
                } catch (error) {
                  this.logger.warn(`Failed to import JSON file: ${jsonPath}`, error);
                }
              }
            }
          }

          importedRecipes.push(recipe);
          this.logger.debug(`Successfully imported recipe: ${recipe.title}`);

        } catch (error) {
          this.logger.error(`Error processing folder ${folder}`, error);
        }
      }

      if (progressCallback) {
        progressCallback({
          step: 'Import complete',
          current: totalSteps,
          total: totalSteps
        });
      }

      if (importedRecipes.length === 0) {
        this.notificationService.error('No valid recipes found in ZIP file');
      } else {
        this.notificationService.success(`Imported ${importedRecipes.length} recipe${importedRecipes.length > 1 ? 's' : ''} from ZIP`);
      }

      return importedRecipes;

    } catch (error) {
      this.logger.error('Error importing from ZIP', error);
      this.notificationService.error('Failed to import from ZIP file');
      return [];
    }
  }

  private validateRecipe(recipe: any): recipe is RecipeData {
    if (!recipe || typeof recipe !== 'object') {
      return false;
    }

    const requiredFields = ['title', 'category'];
    for (const field of requiredFields) {
      if (!recipe.hasOwnProperty(field) || !recipe[field]) {
        this.logger.warn(`Recipe missing required field: ${field}`);
        return false;
      }
    }

    const validCategories = ['Batch', 'Triggers', 'Data List', 'Action Button', 'Data Loader'];
    if (!validCategories.includes(recipe.category)) {
      this.logger.warn(`Invalid category: ${recipe.category}`);
      return false;
    }

    const arrayFields = ['DSPVersions', 'prerequisites', 'walkthrough', 'downloadableExecutables', 'relatedRecipes', 'keywords'];
    for (const field of arrayFields) {
      if (!recipe.hasOwnProperty(field)) {
        recipe[field] = [];
      } else if (!Array.isArray(recipe[field])) {
        this.logger.warn(`Field ${field} should be an array`);
        return false;
      }
    }

    if (recipe.walkthrough) {
      for (const step of recipe.walkthrough) {
        if (!step.step || !Array.isArray(step.config) || !Array.isArray(step.media)) {
          this.logger.warn('Invalid walkthrough step structure');
          return false;
        }
      }
    }

    return true;
  }


}
