import { Injectable } from '@angular/core';
import { SourceRecipeRecord } from '../../core/models/recipe.model';
import { RecipeLoggerService } from '../../core/services/logger.service';
import { createSafeString, getFileExtension, getExtensionFromFilename } from '../../core/utils';

/**
 * Recipe Image Naming Service
 *
 * Generates meaningful, safe, and unique filenames for recipe images.
 *
 * Naming convention for step media:
 * - Pattern: {category}-{stepName}-image-{counter}.{ext}
 * - Example: "batch-create-executable-image-1.jpg"
 *
 * Naming convention for general images:
 * - Pattern: general-image-{counter}.{ext}
 * - Example: "general-image-1.png"
 *
 * All names are:
 * - Lowercase
 * - Free of special characters
 * - Limited to 30 characters (base name)
 * - Unique within the recipe
 */
@Injectable({
  providedIn: 'root'
})
export class RecipeImageNamingService {
  private readonly MAX_NAME_LENGTH = 30;
  private readonly INVALID_CHARS_PATTERN = /[/\\?<>\\:*|"]/g;
  private readonly NON_WORD_CHARS_PATTERN = /[^\w\s-]/g;
  private readonly MULTIPLE_SPACES_PATTERN = /\s+/g;
  private readonly MULTIPLE_HYPHENS_PATTERN = /-+/g;
  private readonly LEADING_TRAILING_HYPHENS_PATTERN = /^-|-$/g;

  constructor(private logger: RecipeLoggerService) {
    this.logger.debug('RecipeImageNamingService initialized');
  }

  // ==================== Main Methods ====================

  /**
   * Generate meaningful image name for step media
   * Based on recipe category and step name
   */
  generateImageName(file: File, recipe: SourceRecipeRecord, stepIndex: number): string {
    try {
      if (!recipe) {
        return this.fallbackImageName();
      }

      const category = createSafeString(recipe.category || 'uncategorized');

      // Get current step name
      const step = recipe.walkthrough?.[stepIndex];
      const stepName = createSafeString(step?.step || 'step');

      // Get file extension
      const extension = getFileExtension(file);

      // Create base name
      const baseName = `${category}-${stepName}-image`;

      // Ensure unique name within current recipe
      return this.ensureUniqueImageName(baseName, extension, recipe);
    } catch (error) {
      this.logger.error('Error generating image name:', error);
      return this.fallbackImageName();
    }
  }

  /**
   * Generate simple name for general images
   */
  generateGeneralImageName(file: File, recipe: SourceRecipeRecord): string {
    try {
      if (!recipe) {
        return 'general-image';
      }

      // Get current general images count for indexing
      const existingCount = recipe.generalImages?.length || 0;

      // Create simple base name
      const baseName = existingCount === 0 ? 'general-image' : `general-image-${existingCount + 1}`;

      // Get file extension
      const extension = getFileExtension(file);

      // Ensure unique name within current recipe
      return this.ensureUniqueGeneralImageName(baseName, extension, recipe);
    } catch (error) {
      this.logger.error('Error generating general image name:', error);
      return 'general-image';
    }
  }

  /**
   * Update image name based on current recipe content
   * Used when recipe metadata changes (category, step name)
   */
  updateImageName(
    currentFileName: string,
    recipe: SourceRecipeRecord,
    stepIndex: number
  ): string {
    try {
      const extension = getExtensionFromFilename(currentFileName);
      const category = createSafeString(recipe.category || 'uncategorized');
      const step = recipe.walkthrough?.[stepIndex];
      const stepName = createSafeString(step?.step || 'step');

      const baseName = `${category}-${stepName}-image`;
      return this.ensureUniqueImageName(baseName, extension, recipe);
    } catch (error) {
      this.logger.error('Error updating image name:', error);
      return currentFileName;
    }
  }

  // ==================== Utility Methods ====================


  /**
   * Extract base name from image URL
   * Example: "images/batch-create-executable-image-1.jpg" -> "batch-create-executable-image-1"
   */
  extractBaseNameFromUrl(url: string): string {
    if (!url) return '';

    // Remove "images/" prefix if present
    const fileName = url.replace('images/', '');

    // Remove file extension
    const baseName = fileName.replace(/\.[^/.]+$/, '');

    return baseName;
  }

  /**
   * Build full image URL
   * Example: "batch-step-image-1", "jpg" -> "images/batch-step-image-1.jpg"
   */
  buildImageUrl(baseName: string, extension: string): string {
    return `images/${baseName}.${extension}`;
  }

  // ==================== Uniqueness Methods ====================

  /**
   * Ensure unique image name within current recipe (for step media)
   * Adds numeric suffix if needed
   */
  private ensureUniqueImageName(
    baseName: string,
    extension: string,
    recipe: SourceRecipeRecord
  ): string {
    const usedNames = this.collectUsedImageNames(recipe);

    let finalName = baseName;
    let counter = 1;

    while (usedNames.has(finalName)) {
      finalName = `${baseName}-${++counter}`;
    }

    return finalName;
  }

  /**
   * Ensure unique general image name within current recipe
   * Adds numeric suffix if needed
   */
  private ensureUniqueGeneralImageName(
    baseName: string,
    extension: string,
    recipe: SourceRecipeRecord
  ): string {
    const usedNames = this.collectUsedGeneralImageNames(recipe);

    let finalName = baseName;
    let counter = 2;

    while (usedNames.has(finalName)) {
      if (baseName === 'general-image') {
        finalName = `general-image-${counter}`;
      } else {
        // Extract number from baseName and increment
        const match = baseName.match(/general-image-(\d+)/);
        if (match) {
          const currentNum = parseInt(match[1]);
          finalName = `general-image-${currentNum + counter - 1}`;
        } else {
          finalName = `${baseName}-${counter}`;
        }
      }
      counter++;
    }

    return finalName;
  }

  /**
   * Collect all used image names from step media
   */
  private collectUsedImageNames(recipe: SourceRecipeRecord): Set<string> {
    const usedNames = new Set<string>();

    if (recipe.walkthrough) {
      recipe.walkthrough.forEach(step => {
        if (step.media) {
          step.media.forEach(media => {
            if (media.url && media.url.startsWith('images/')) {
              const baseName = this.extractBaseNameFromUrl(media.url);
              usedNames.add(baseName);
            }
          });
        }
      });
    }

    return usedNames;
  }

  /**
   * Collect all used general image names
   */
  private collectUsedGeneralImageNames(recipe: SourceRecipeRecord): Set<string> {
    const usedNames = new Set<string>();

    if (recipe.generalImages) {
      recipe.generalImages.forEach(image => {
        if (image.url && image.url.startsWith('images/')) {
          const baseName = this.extractBaseNameFromUrl(image.url);
          usedNames.add(baseName);
        }
      });
    }

    return usedNames;
  }

  /**
   * Fallback image name when generation fails
   */
  private fallbackImageName(): string {
    return `image-${Date.now()}`;
  }

  // ==================== Validation Methods ====================

  /**
   * Check if image name is safe for filesystem
   */
  isSafeFilename(filename: string): boolean {
    if (!filename || typeof filename !== 'string') {
      return false;
    }

    // Check for invalid characters
    if (this.INVALID_CHARS_PATTERN.test(filename)) {
      return false;
    }

    // Check length
    if (filename.length === 0 || filename.length > 255) {
      return false;
    }

    return true;
  }

  /**
   * Check if two image names are the same (case-insensitive)
   */
  isSameName(name1: string, name2: string): boolean {
    return name1.toLowerCase().trim() === name2.toLowerCase().trim();
  }

  /**
   * Get all image names from recipe (both step media and general)
   */
  getAllImageNames(recipe: SourceRecipeRecord): string[] {
    const names: string[] = [];

    // Collect from step media
    if (recipe.walkthrough) {
      recipe.walkthrough.forEach(step => {
        if (step.media) {
          step.media.forEach(media => {
            if (media.url) {
              names.push(this.extractBaseNameFromUrl(media.url));
            }
          });
        }
      });
    }

    // Collect from general images
    if (recipe.generalImages) {
      recipe.generalImages.forEach(image => {
        if (image.url) {
          names.push(this.extractBaseNameFromUrl(image.url));
        }
      });
    }

    return names;
  }

  /**
   * Count total images in recipe
   */
  countTotalImages(recipe: SourceRecipeRecord): number {
    let count = 0;

    // Count step media images
    if (recipe.walkthrough) {
      recipe.walkthrough.forEach(step => {
        if (step.media) {
          count += step.media.length;
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
   * Find duplicate image names in recipe
   */
  findDuplicateNames(recipe: SourceRecipeRecord): string[] {
    const allNames = this.getAllImageNames(recipe);
    const seen = new Set<string>();
    const duplicates = new Set<string>();

    allNames.forEach(name => {
      if (seen.has(name)) {
        duplicates.add(name);
      } else {
        seen.add(name);
      }
    });

    return Array.from(duplicates);
  }

  /**
   * Get file extension from File object (wrapper for utility function)
   * @deprecated Use getFileExtension from core/utils instead
   */
  getFileExtension(file: File): string {
    return getFileExtension(file);
  }
}
