import { Injectable, ChangeDetectorRef } from '@angular/core';
import {
  SourceRecipeRecord,
  RecipeStepMedia,
  RecipeGeneralImage
} from '../../core/models/recipe.model';
import { RecipeFileStorageService } from './file-storage.service';
import { RecipeImageNamingService } from './image-naming.service';
import { NotificationService } from '../../../shared/services/notification.service';
import { RecipeLoggerService } from '../../core/services/logger.service';

/**
 * Image upload purpose types
 */
export type ImageUploadPurpose =
  | 'step-media'
  | 'general-image'
  | 'replace-step-media'
  | 'replace-general-image';

/**
 * Options for image upload operations
 */
export interface ImageUploadOptions {
  stepIndex?: number;
  existingObject?: any;
  targetInput?: HTMLInputElement;
}

/**
 * Result of image upload operation
 */
export interface ImageUploadResult {
  success: boolean;
  baseName?: string;
  fullFileName?: string;
  displayUrl?: string;
  error?: string;
}

/**
 * Service responsible for managing recipe image operations
 *
 * This service handles:
 * - Image file uploads (step media and general images)
 * - Image replacement operations
 * - Image deletion from recipe and storage
 * - Drag-and-drop image handling
 * - Image file name generation
 */
@Injectable({
  providedIn: 'root'
})
export class RecipeImageManagementService {

  constructor(
    private fileStorageService: RecipeFileStorageService,
    private imageNamingService: RecipeImageNamingService,
    private notificationService: NotificationService,
    private logger: RecipeLoggerService
  ) {}

  /**
   * Upload an image file for a recipe
   *
   * @param file - Image file to upload
   * @param recipe - Current recipe being edited
   * @param purpose - Purpose of the image (step-media, general-image, etc.)
   * @param options - Additional options (stepIndex, existingObject, etc.)
   * @param changeCallback - Callback to trigger change detection
   * @returns Promise<ImageUploadResult>
   */
  async uploadImage(
    file: File,
    recipe: SourceRecipeRecord,
    purpose: ImageUploadPurpose,
    options: ImageUploadOptions = {},
    changeCallback?: () => void
  ): Promise<ImageUploadResult> {
    // Validate file
    const validation = this.fileStorageService.validateImageFile(file);
    if (!validation.valid) {
      this.notificationService.error(validation.error || 'Invalid file');
      return { success: false, error: validation.error };
    }

    try {
      // Generate file name
      const { baseName, fullFileName } = this.generateImageFileName(
        file,
        recipe,
        purpose,
        options
      );

      // Store image in IndexedDB
      await this.fileStorageService.storeImage(baseName, file);

      // Generate display URL
      const displayUrl = URL.createObjectURL(file);

      // Update recipe with image
      this.updateRecipeWithImage(
        recipe,
        purpose,
        options,
        baseName,
        fullFileName,
        displayUrl,
        file
      );

      // Cleanup input if provided
      if (options.targetInput) {
        options.targetInput.value = '';
      }

      // Trigger change callback
      if (changeCallback) {
        changeCallback();
      }

      this.notificationService.success('Image uploaded successfully');

      return {
        success: true,
        baseName,
        fullFileName,
        displayUrl
      };
    } catch (error) {
      this.logger.error('Error uploading image:', error);
      this.notificationService.error('Failed to upload image');
      return { success: false, error: 'Upload failed' };
    }
  }

  /**
   * Handle drag-and-drop image file for step media
   */
  async handleStepImageDrop(
    event: DragEvent,
    recipe: SourceRecipeRecord,
    stepIndex: number,
    changeCallback?: () => void
  ): Promise<void> {
    event.preventDefault();
    const files = event.dataTransfer?.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      await this.uploadImage(
        files[i],
        recipe,
        'step-media',
        { stepIndex },
        changeCallback
      );
    }
  }

  /**
   * Handle drag-and-drop image file for general images
   */
  async handleGeneralImageDrop(
    event: DragEvent,
    recipe: SourceRecipeRecord,
    changeCallback?: () => void
  ): Promise<void> {
    event.preventDefault();
    const files = event.dataTransfer?.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      await this.uploadImage(
        files[i],
        recipe,
        'general-image',
        {},
        changeCallback
      );
    }
  }

  /**
   * Remove step media image
   */
  removeStepMedia(
    recipe: SourceRecipeRecord,
    stepIndex: number,
    mediaIndex: number,
    changeCallback?: () => void
  ): void {
    if (!recipe?.walkthrough?.[stepIndex]) return;

    const media = recipe.walkthrough[stepIndex].media[mediaIndex];

    // Delete from IndexedDB if it's a stored image
    if (media.url.startsWith('images/')) {
      const fileName = media.url.replace('images/', '');
      const baseName = fileName.replace(/\.[^/.]+$/, '');
      this.fileStorageService.deleteImage(baseName);
    }

    recipe.walkthrough[stepIndex].media.splice(mediaIndex, 1);

    if (changeCallback) {
      changeCallback();
    }
  }

  /**
   * Remove general image
   */
  removeGeneralImage(
    recipe: SourceRecipeRecord,
    imageIndex: number,
    changeCallback?: () => void
  ): void {
    if (!recipe?.generalImages) return;

    const image = recipe.generalImages[imageIndex];

    // Delete from IndexedDB if it has an imageId
    if (image.imageId) {
      this.fileStorageService.deleteImage(image.imageId);
    }

    recipe.generalImages.splice(imageIndex, 1);

    if (changeCallback) {
      changeCallback();
    }

    this.notificationService.success('General image removed');
  }

  /**
   * Add empty general image entry
   */
  addEmptyGeneralImage(recipe: SourceRecipeRecord, changeCallback?: () => void): void {
    if (!recipe) return;

    const newGeneralImage: RecipeGeneralImage = {
      type: 'image',
      url: '',
      alt: ''
    };

    if (!recipe.generalImages) {
      recipe.generalImages = [];
    }

    recipe.generalImages.push(newGeneralImage);

    if (changeCallback) {
      changeCallback();
    }
  }

  /**
   * Generate image file name based on purpose
   * @private
   */
  private generateImageFileName(
    file: File,
    recipe: SourceRecipeRecord,
    purpose: ImageUploadPurpose,
    options: ImageUploadOptions
  ): { baseName: string; fullFileName: string } {
    let baseName: string;
    let fullFileName: string;

    if (purpose === 'step-media') {
      baseName = this.imageNamingService.generateImageName(
        file,
        recipe,
        options.stepIndex!
      );
      const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      fullFileName = `${baseName}.${extension}`;
    } else if (purpose === 'general-image') {
      baseName = this.imageNamingService.generateGeneralImageName(file, recipe);
      const extension = file.name.split('.').pop()?.toLowerCase() || 'png';
      fullFileName = `${baseName}.${extension}`;
    } else {
      // For replace operations, use random ID
      const imageId = this.fileStorageService.generateImageId();
      const originalName = this.fileStorageService.sanitizeFileName(file.name);
      baseName = imageId;
      fullFileName = `${imageId}_${originalName}`;
    }

    return { baseName, fullFileName };
  }

  /**
   * Update recipe object with uploaded image
   * @private
   */
  private updateRecipeWithImage(
    recipe: SourceRecipeRecord,
    purpose: ImageUploadPurpose,
    options: ImageUploadOptions,
    baseName: string,
    fullFileName: string,
    displayUrl: string,
    file: File
  ): void {
    if (purpose === 'step-media') {
      const media: RecipeStepMedia = {
        type: 'image',
        url: `images/${fullFileName}`,
        alt: file.name.replace(/\.[^/.]+$/, '')
      };
      (media as any).displayUrl = displayUrl;
      recipe.walkthrough[options.stepIndex!].media.push(media);
    } else if (purpose === 'general-image') {
      const generalImage: RecipeGeneralImage = {
        type: 'image',
        url: `images/${fullFileName}`,
        alt: file.name.replace(/\.[^/.]+$/, ''),
        imageId: baseName
      };
      (generalImage as any).displayUrl = displayUrl;
      if (!recipe.generalImages) {
        recipe.generalImages = [];
      }
      recipe.generalImages.push(generalImage);
    } else if (purpose === 'replace-step-media' || purpose === 'replace-general-image') {
      options.existingObject!.url = `images/${fullFileName}`;
      (options.existingObject as any).displayUrl = displayUrl;
    }
  }
}
