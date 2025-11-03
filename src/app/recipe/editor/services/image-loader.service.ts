import { Injectable } from '@angular/core';
import { SourceRecipeRecord, RecipeStepMedia, RecipeGeneralImage } from '../../core/models/recipe.model';
import { RecipeLoggerService } from '../../core/services/logger.service';
import { RecipeFileStorageService } from './file-storage.service';

/**
 * Image Loading Result Interface
 */
export interface ImageLoadResult {
  success: boolean;
  displayUrl?: string;
  error?: string;
}

/**
 * Missing Images Report Interface
 */
export interface MissingImagesReport {
  totalImages: number;
  missingImages: string[];
  missingCount: number;
}

/**
 * Recipe Image Loader Service
 *
 * Handles loading and managing images for Recipe Editor:
 * - Loads images from IndexedDB
 * - Creates blob URLs (displayUrl) for rendering
 * - Handles static assets images
 * - Detects missing images
 * - Manages image lifecycle
 *
 * Image Types:
 * 1. IndexedDB images: User-uploaded images stored locally (start with "images/")
 * 2. Assets images: Static images from assets folder (start with "assets/")
 *
 * DisplayUrl: Temporary blob URL created for rendering images in the browser.
 * These URLs must be revoked when no longer needed to prevent memory leaks.
 */
@Injectable({
  providedIn: 'root'
})
export class RecipeImageLoaderService {
  // Cache of blob URLs for cleanup
  private activeBlobUrls = new Set<string>();

  constructor(
    private logger: RecipeLoggerService,
    private fileStorageService: RecipeFileStorageService
  ) {
    this.logger.debug('RecipeImageLoaderService initialized');
  }

  // ==================== Main Loading Methods ====================

  /**
   * Load all images for a recipe
   * Processes both walkthrough step media and general images
   */
  async loadAllImagesForRecipe(recipe: SourceRecipeRecord): Promise<void> {
    this.logger.debug('Loading all images for recipe:', recipe.title);

    try {
      // Load walkthrough step media images
      if (recipe.walkthrough && recipe.walkthrough.length > 0) {
        for (const step of recipe.walkthrough) {
          if (step.media && step.media.length > 0) {
            for (const media of step.media) {
              if (media.type === 'image' && media.url) {
                await this.loadImageForMedia(media);
              }
            }
          }
        }
      }

      // Load general images
      if (recipe.generalImages && recipe.generalImages.length > 0) {
        for (const image of recipe.generalImages) {
          if (image.url) {
            await this.loadImageForGeneralImage(image);
          }
        }
      }

      this.logger.debug('All images loaded for recipe:', recipe.title);
    } catch (error) {
      this.logger.error('Error loading all images for recipe:', error);
    }
  }

  /**
   * Load image for step media item
   * Updates media object with displayUrl
   */
  async loadImageForMedia(media: RecipeStepMedia): Promise<ImageLoadResult> {
    return this.loadImageInternal(media, 'media');
  }

  /**
   * Load image for general image item
   * Updates image object with displayUrl
   */
  async loadImageForGeneralImage(image: RecipeGeneralImage): Promise<ImageLoadResult> {
    return this.loadImageInternal(image, 'general');
  }

  /**
   * Internal method to load image for any image object
   * @param imageObject - Media or GeneralImage object
   * @param imageType - Type for logging purposes
   */
  private async loadImageInternal(
    imageObject: RecipeStepMedia | RecipeGeneralImage,
    imageType: 'media' | 'general'
  ): Promise<ImageLoadResult> {
    try {
      if (!imageObject.url) {
        return { success: false, error: 'No image URL provided' };
      }

      // Handle assets images (static images)
      if (this.isAssetsImage(imageObject.url)) {
        const assetsUrl = this.normalizeAssetsImageUrl(imageObject.url);
        this.logger.debug(`Loading assets ${imageType} image: ${assetsUrl}`);

        (imageObject as any).displayUrl = assetsUrl;
        return { success: true, displayUrl: assetsUrl };
      }

      // Handle IndexedDB images (uploaded images)
      if (this.isIndexedDBImage(imageObject.url)) {
        const imageKey = this.extractImageKey(imageObject.url);
        this.logger.debug(`Loading ${imageType} image with key: ${imageKey}`);

        const imageFile = await this.fileStorageService.getImage(imageKey);

        if (imageFile) {
          const displayUrl = this.createBlobUrl(imageFile);
          (imageObject as any).displayUrl = displayUrl;
          this.logger.debug(`Successfully loaded ${imageType} image: ${displayUrl}`);
          return { success: true, displayUrl };
        } else {
          this.logger.warn(`No image file found for ${imageType} key: ${imageKey}`);
          return { success: false, error: 'Image not found in storage' };
        }
      }

      return { success: false, error: 'Unsupported image URL format' };
    } catch (error) {
      this.logger.error(`Error loading image for ${imageType}:`, error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // ==================== Missing Images Detection ====================

  /**
   * Check for missing images after import
   * Returns report of missing images
   */
  async checkMissingImagesAfterImport(recipe: SourceRecipeRecord): Promise<MissingImagesReport> {
    const missingImages: string[] = [];
    let totalImages = 0;

    try {
      // Check walkthrough step media images
      if (recipe.walkthrough) {
        for (const step of recipe.walkthrough) {
          if (step.media) {
            for (const media of step.media) {
              if (media.type === 'image' && media.url && this.isIndexedDBImage(media.url)) {
                totalImages++;
                const imageKey = this.extractImageKey(media.url);
                const exists = await this.fileStorageService.imageExists(imageKey);

                if (!exists) {
                  missingImages.push(media.url);
                }
              }
            }
          }
        }
      }

      // Check general images
      if (recipe.generalImages) {
        for (const image of recipe.generalImages) {
          if (image.url && this.isIndexedDBImage(image.url)) {
            totalImages++;
            const imageKey = this.extractImageKey(image.url);
            const exists = await this.fileStorageService.imageExists(imageKey);

            if (!exists) {
              missingImages.push(image.url);
            }
          }
        }
      }

      // Log warning if missing images found
      if (missingImages.length > 0) {
        this.logger.warn(`Missing ${missingImages.length} images after import:`, missingImages);
      }

      return {
        totalImages,
        missingImages,
        missingCount: missingImages.length
      };
    } catch (error) {
      this.logger.error('Error checking missing images:', error);
      return {
        totalImages,
        missingImages,
        missingCount: missingImages.length
      };
    }
  }

  /**
   * Check if a specific image is missing from storage
   */
  async isMissingImage(imageUrl: string): Promise<boolean> {
    if (!imageUrl || !this.isIndexedDBImage(imageUrl)) {
      return false;
    }

    try {
      const imageKey = this.extractImageKey(imageUrl);
      const exists = await this.fileStorageService.imageExists(imageKey);
      return !exists;
    } catch (error) {
      this.logger.error('Error checking if image is missing:', error);
      return true; // Assume missing if error occurs
    }
  }

  // ==================== URL Management ====================

  /**
   * Create blob URL from File
   * Registers URL for cleanup
   */
  private createBlobUrl(file: File): string {
    const url = URL.createObjectURL(file);
    this.activeBlobUrls.add(url);
    return url;
  }

  /**
   * Revoke a blob URL
   * Removes from active URLs and frees memory
   */
  revokeBlobUrl(url: string): void {
    if (this.activeBlobUrls.has(url)) {
      URL.revokeObjectURL(url);
      this.activeBlobUrls.delete(url);
      this.logger.debug('Revoked blob URL:', url);
    }
  }

  /**
   * Revoke all active blob URLs
   * Call this when cleaning up or destroying component
   */
  revokeAllBlobUrls(): void {
    this.activeBlobUrls.forEach(url => {
      URL.revokeObjectURL(url);
    });
    this.activeBlobUrls.clear();
    this.logger.debug('All blob URLs revoked');
  }

  /**
   * Get count of active blob URLs
   * Useful for debugging memory leaks
   */
  getActiveBlobUrlCount(): number {
    return this.activeBlobUrls.size;
  }

  // ==================== Helper Methods ====================

  /**
   * Check if URL is an IndexedDB image
   */
  isIndexedDBImage(url: string): boolean {
    return url.startsWith('images/');
  }

  /**
   * Check if URL is an assets image
   */
  isAssetsImage(url: string): boolean {
    // Check if it's already an assets path
    if (url.startsWith('assets/')) {
      return true;
    }

    // Check if it's a relative image path that should be converted to assets path
    // Format: "images/recipe/{folderId}/{imageName}.{ext}"
    const relativePath = url.match(/^images\/recipe\/([a-zA-Z0-9_-]+)\//);
    return !!relativePath;
  }

  /**
   * Normalize assets image URL
   * Converts relative paths to absolute assets paths
   */
  normalizeAssetsImageUrl(url: string): string {
    // Already an assets path
    if (url.startsWith('assets/')) {
      return url;
    }

    // Convert relative recipe image path to assets path
    // Format: "images/recipe/{folderId}/{imageName}.{ext}" -> "assets/recipes/{folderId}/{imageName}.{ext}"
    const match = url.match(/^images\/recipe\/([a-zA-Z0-9_-]+)\/(.+)$/);
    if (match) {
      const folderId = match[1];
      const fileName = match[2];
      return `assets/recipes/${folderId}/${fileName}`;
    }

    // Fallback: return as-is
    return url;
  }

  /**
   * Extract image key from URL
   * Example: "images/batch-step-image-1.jpg" -> "batch-step-image-1"
   */
  extractImageKey(url: string): string {
    if (!url) return '';

    // Remove "images/" prefix
    const fileName = url.replace('images/', '');

    // Remove file extension
    const imageKey = fileName.replace(/\.[^/.]+$/, '');

    return imageKey;
  }

  /**
   * Extract file name from URL
   * Example: "images/batch-step-image-1.jpg" -> "batch-step-image-1.jpg"
   */
  extractFileName(url: string): string {
    if (!url) return '';
    return url.replace('images/', '');
  }

  /**
   * Check if media object has a displayUrl
   */
  hasDisplayUrl(media: RecipeStepMedia | RecipeGeneralImage): boolean {
    return !!(media as any).displayUrl;
  }

  /**
   * Get displayUrl from media object
   */
  getDisplayUrl(media: RecipeStepMedia | RecipeGeneralImage): string | undefined {
    return (media as any).displayUrl;
  }

  /**
   * Clear displayUrl from media object
   * Optionally revokes the blob URL
   */
  clearDisplayUrl(media: RecipeStepMedia | RecipeGeneralImage, revoke: boolean = true): void {
    const displayUrl = (media as any).displayUrl;

    if (displayUrl && revoke) {
      this.revokeBlobUrl(displayUrl);
    }

    delete (media as any).displayUrl;
  }

  // ==================== Batch Operations ====================

  /**
   * Preload images for faster rendering
   * Loads images in parallel
   */
  async preloadImages(imageUrls: string[]): Promise<void> {
    const promises = imageUrls.map(url => this.preloadSingleImage(url));
    await Promise.allSettled(promises);
  }

  /**
   * Preload a single image
   */
  private async preloadSingleImage(url: string): Promise<void> {
    if (this.isIndexedDBImage(url)) {
      const imageKey = this.extractImageKey(url);
      await this.fileStorageService.getImage(imageKey);
    }
  }

  /**
   * Count total images in recipe
   */
  countImagesInRecipe(recipe: SourceRecipeRecord): number {
    let count = 0;

    // Count step media images
    if (recipe.walkthrough) {
      recipe.walkthrough.forEach(step => {
        if (step.media) {
          count += step.media.filter(m => m.type === 'image').length;
        }
      });
    }

    // Count general images
    if (recipe.generalImages) {
      count += recipe.generalImages.length;
    }

    return count;
  }

  /**
   * Get all image URLs from recipe
   */
  getAllImageUrls(recipe: SourceRecipeRecord): string[] {
    const urls: string[] = [];

    // Collect from step media
    if (recipe.walkthrough) {
      recipe.walkthrough.forEach(step => {
        if (step.media) {
          step.media.forEach(media => {
            if (media.type === 'image' && media.url) {
              urls.push(media.url);
            }
          });
        }
      });
    }

    // Collect from general images
    if (recipe.generalImages) {
      recipe.generalImages.forEach(image => {
        if (image.url) {
          urls.push(image.url);
        }
      });
    }

    return urls;
  }

  // ==================== Cleanup ====================

  /**
   * Cleanup when component is destroyed
   * Revokes all blob URLs to prevent memory leaks
   */
  cleanup(): void {
    this.revokeAllBlobUrls();
    this.logger.debug('Image loader cleanup complete');
  }
}
