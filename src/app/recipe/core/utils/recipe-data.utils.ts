import { SourceRecipeRecord } from '../models/recipe.model';

/**
 * Options for cleaning recipe data
 */
export interface CleanRecipeOptions {
  /**
   * Remove runtime/display properties (displayUrl, imageKey)
   */
  removeRuntimeProps?: boolean;

  /**
   * Remove internal editor properties (internalId, editorState)
   */
  removeInternalProps?: boolean;

  /**
   * Normalize image URLs to relative paths (remove absolute path prefixes)
   */
  normalizeImagePaths?: boolean;

  /**
   * Custom step names mapping (index -> custom name)
   * Used to replace 'Custom' step with actual custom name
   */
  customStepNames?: { [index: number]: string };
}

/**
 * Deep clone an object using the best available method
 */
function deepClone<T>(obj: T): T {
  if (typeof structuredClone !== 'undefined') {
    return structuredClone(obj);
  }
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Extract relative path from absolute recipe path
 * Examples:
 * - 'assets/recipes/category/images/image.jpg' -> 'images/image.jpg'
 * - 'images/image.jpg' -> 'images/image.jpg'
 */
function normalizeImageUrl(url: string): string {
  if (!url) return url;

  // If already relative (starts with 'images/'), return as-is
  if (url.startsWith('images/')) {
    return url;
  }

  // Extract relative path from absolute path
  if (url.includes('assets/recipes/')) {
    const match = url.match(/images\/[^/]+$/);
    if (match) {
      return match[0];
    }
  }

  return url;
}

/**
 * Extract relative path for downloadable executables
 */
function normalizeExecutablePath(path: string): string {
  if (!path) return path;

  // If already relative (starts with 'downloadExecutables/'), return as-is
  if (path.startsWith('downloadExecutables/')) {
    return path;
  }

  // Extract relative path from absolute path
  if (path.includes('assets/recipes/')) {
    const match = path.match(/downloadExecutables\/[^/]+$/);
    if (match) {
      return match[0];
    }
  }

  return path;
}

/**
 * Clean a recipe object by removing runtime properties and normalizing paths
 *
 * This function provides flexible recipe data cleaning for different use cases:
 * - Storage: Remove runtime props, normalize paths
 * - Export: Remove internal props, handle custom steps
 * - Preview: Remove internal props only
 *
 * @param recipe - Source recipe to clean
 * @param options - Cleaning options
 * @returns Cleaned recipe object
 *
 * @example
 * // Clean for storage
 * const cleaned = cleanRecipeData(recipe, {
 *   removeRuntimeProps: true,
 *   normalizeImagePaths: true
 * });
 *
 * @example
 * // Clean for export
 * const cleaned = cleanRecipeData(recipe, {
 *   removeInternalProps: true,
 *   removeRuntimeProps: true,
 *   customStepNames: { 0: 'My Custom Step' }
 * });
 */
export function cleanRecipeData(
  recipe: SourceRecipeRecord,
  options: CleanRecipeOptions = {}
): SourceRecipeRecord {
  if (!recipe) {
    return recipe;
  }

  // Deep clone to avoid modifying the original
  const cleaned = deepClone(recipe);

  // Remove internal editor properties
  if (options.removeInternalProps) {
    delete (cleaned as any).internalId;
    delete (cleaned as any).editorState;
  }

  // Clean walkthrough step media
  if (cleaned.walkthrough && Array.isArray(cleaned.walkthrough)) {
    cleaned.walkthrough.forEach((step: any, index: number) => {
      if (step.media && Array.isArray(step.media)) {
        step.media.forEach((media: any) => {
          // Remove runtime properties
          if (options.removeRuntimeProps) {
            delete media.displayUrl;
            delete media.imageKey;
          }

          // Normalize image URL to relative path
          if (options.normalizeImagePaths && media.url) {
            media.url = normalizeImageUrl(media.url);
          }
        });
      }

      // Replace 'Custom' step with actual custom name
      if (options.customStepNames && step.step === 'Custom') {
        const customName = options.customStepNames[index];
        if (customName) {
          step.step = customName;
        }
      }
    });
  }

  // Clean general images
  if (cleaned.generalImages && Array.isArray(cleaned.generalImages)) {
    cleaned.generalImages.forEach((image: any) => {
      // Remove runtime properties
      if (options.removeRuntimeProps) {
        delete image.displayUrl;
        delete image.imageKey;
      }

      // Normalize image URL to relative path
      if (options.normalizeImagePaths && image.url) {
        image.url = normalizeImageUrl(image.url);
      }
    });
  }

  // Clean downloadable executables
  if (cleaned.downloadableExecutables && Array.isArray(cleaned.downloadableExecutables)) {
    cleaned.downloadableExecutables.forEach((executable: any) => {
      // Normalize file path to relative path
      if (options.normalizeImagePaths && executable.filePath) {
        executable.filePath = normalizeExecutablePath(executable.filePath);
      }
    });
  }

  return cleaned;
}

/**
 * Preset: Clean recipe for localStorage storage
 * Removes runtime properties and normalizes paths
 */
export function cleanRecipeForStorage(recipe: SourceRecipeRecord): SourceRecipeRecord {
  return cleanRecipeData(recipe, {
    removeRuntimeProps: true,
    normalizeImagePaths: true
  });
}

/**
 * Preset: Clean recipe for export/download
 * Removes internal and runtime properties
 */
export function cleanRecipeForExport(
  recipe: SourceRecipeRecord,
  customStepNames?: { [index: number]: string }
): SourceRecipeRecord {
  return cleanRecipeData(recipe, {
    removeInternalProps: true,
    removeRuntimeProps: true,
    customStepNames
  });
}
