import { Injectable } from '@angular/core';
import { RecipeData, EditorTab, StepMedia } from '../../core/models/recipe.model';
import { ImageNamingService } from './image-naming.service';
import { FileStorageAdapter } from '../../core/storage';
import { Store } from '../../core/store/recipe.store';
import { LoggerService } from '../../core/services/logger.service';

export interface RecipeChangeResult {
  tabUpdated: boolean;
  titleChanged: boolean;
  imagesScheduled: boolean;
}

export interface TitleChangeResult {
  changed: boolean;
  oldTitle: string;
  newTitle: string;
}

@Injectable({
  providedIn: 'root'
})
export class ChangeCoordinatorService {
  private imageNameUpdateTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private imageNamingService: ImageNamingService,
    private fileStorageService: FileStorageAdapter,
    private store: Store,
    private logger: LoggerService
  ) {}

  onRecipeChange(
    recipe: RecipeData,
    tab: EditorTab,
    previousTitle: string
  ): RecipeChangeResult {
    const result: RecipeChangeResult = {
      tabUpdated: false,
      titleChanged: false,
      imagesScheduled: false
    };

    if (!tab.hasChanges) {
      this.store.updateEditorTab(tab.id, { hasChanges: true });
      result.tabUpdated = true;
      this.logger.debug('Tab marked as modified', { tabId: tab.id, recipeId: recipe.id });
    }

    if (previousTitle && previousTitle !== recipe.title) {
      result.titleChanged = true;
      this.handleTitleChange(recipe, previousTitle);
      this.logger.debug('Title change detected', {
        recipeId: recipe.id,
        oldTitle: previousTitle,
        newTitle: recipe.title
      });
    }

    return result;
  }

  private handleTitleChange(
    recipe: RecipeData,
    previousTitle: string
  ): TitleChangeResult {
    const result: TitleChangeResult = {
      changed: previousTitle !== recipe.title,
      oldTitle: previousTitle,
      newTitle: recipe.title
    };

    if (result.changed) {
      this.scheduleImageNameUpdate(recipe);

      this.logger.info('Title changed, image updates scheduled', {
        recipeId: recipe.id,
        oldTitle: previousTitle,
        newTitle: recipe.title
      });
    }

    return result;
  }

  scheduleImageNameUpdate(recipe: RecipeData): void {
    if (this.imageNameUpdateTimeout) {
      clearTimeout(this.imageNameUpdateTimeout);
    }

    this.imageNameUpdateTimeout = setTimeout(() => {
      this.updateImageNamesForContentChange(recipe);
    }, 2000);

    this.logger.debug('Image name update scheduled', { recipeId: recipe.id });
  }

  async updateImageNamesForContentChange(recipe: RecipeData): Promise<void> {
    try {
      let updated = false;

      if (recipe.walkthrough && Array.isArray(recipe.walkthrough)) {
        for (let stepIndex = 0; stepIndex < recipe.walkthrough.length; stepIndex++) {
          const step = recipe.walkthrough[stepIndex];
          if (step.media && Array.isArray(step.media)) {
            const mediaUpdated = await this.updateStepMediaNames(step.media, stepIndex, recipe);
            updated = updated || mediaUpdated;
          }
        }
      }

      if (updated) {
        this.logger.info('Image names updated for recipe', { recipeId: recipe.id });
      }
    } catch (error) {
      this.logger.error('Failed to update image names', error);
    }
  }

  private async updateStepMediaNames(
    media: StepMedia[],
    stepIndex: number,
    recipe: RecipeData
  ): Promise<boolean> {
    let updated = false;

    for (const mediaItem of media) {
      const itemUpdated = await this.updateSingleMediaName(mediaItem, stepIndex, recipe);
      updated = updated || itemUpdated;
    }

    return updated;
  }

  private async updateSingleMediaName(
    media: StepMedia,
    stepIndex: number,
    recipe: RecipeData
  ): Promise<boolean> {
    try {
      if (!media.url || !media.url.startsWith('images/')) {
        return false;
      }

      const currentFileName = media.url.replace('images/', '');
      const currentKey = currentFileName.replace(/\.[^/.]+$/, '');

      const imageFile = await this.fileStorageService.getImage(currentKey);
      if (!imageFile) {
        return false;
      }

      const newKey = this.imageNamingService.generateImageName(imageFile, recipe, stepIndex);

      if (currentKey === newKey) {
        return false;
      }

      const extension = currentFileName.split('.').pop() || 'jpg';
      const newFileName = `${newKey}.${extension}`;

      await this.fileStorageService.storeImage(newKey, imageFile);
      await this.fileStorageService.deleteImage(currentKey);

      media.url = `images/${newFileName}`;

      if ((media as any).displayUrl) {
        URL.revokeObjectURL((media as any).displayUrl);
        delete (media as any).displayUrl;
      }

      this.logger.debug('Media name updated', {
        recipeId: recipe.id,
        stepIndex,
        oldName: currentFileName,
        newName: newFileName
      });

      return true;
    } catch (error) {
      this.logger.error('Failed to update media name', error);
      return false;
    }
  }

  cancelScheduledUpdates(): void {
    if (this.imageNameUpdateTimeout) {
      clearTimeout(this.imageNameUpdateTimeout);
      this.imageNameUpdateTimeout = null;
      this.logger.debug('Scheduled image updates cancelled');
    }
  }
}
