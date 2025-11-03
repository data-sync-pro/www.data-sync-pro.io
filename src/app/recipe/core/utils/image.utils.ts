/**
 * Image utility functions for recipe images
 */

/**
 * Extract image key/name from a URL or path
 * Handles various formats:
 * - "images/batch-step-image-1.jpg" -> "batch-step-image-1"
 * - "batch-step-image-1.jpg" -> "batch-step-image-1"
 * - "images/batch-step-image-1" -> "batch-step-image-1"
 *
 * @param url - Image URL or path
 * @returns Image key without path prefix and extension
 */
export function extractImageKey(url: string): string {
  if (!url) return '';

  // Remove "images/" prefix if present
  let key = url.replace(/^images\//, '');

  // Remove file extension
  key = key.replace(/\.[^/.]+$/, '');

  return key;
}

/**
 * Build full image URL from base name and extension
 *
 * @param baseName - Image base name (without extension)
 * @param extension - File extension (with or without dot)
 * @returns Full image URL with "images/" prefix
 *
 * @example
 * buildImageUrl('batch-step-image-1', 'jpg') // -> 'images/batch-step-image-1.jpg'
 * buildImageUrl('batch-step-image-1', '.jpg') // -> 'images/batch-step-image-1.jpg'
 */
export function buildImageUrl(baseName: string, extension: string): string {
  // Ensure extension has a dot prefix
  const ext = extension.startsWith('.') ? extension : `.${extension}`;
  return `images/${baseName}${ext}`;
}

/**
 * Parse an image path into its components
 *
 * @param path - Image path
 * @returns Object with path components
 *
 * @example
 * parseImagePath('images/batch-step-image-1.jpg')
 * // Returns: { prefix: 'images', baseName: 'batch-step-image-1', extension: 'jpg', fullName: 'batch-step-image-1.jpg' }
 */
export function parseImagePath(path: string): {
  prefix: string;
  baseName: string;
  extension: string;
  fullName: string;
} {
  if (!path) {
    return { prefix: '', baseName: '', extension: '', fullName: '' };
  }

  // Extract prefix (e.g., "images/")
  const lastSlashIndex = path.lastIndexOf('/');
  const prefix = lastSlashIndex >= 0 ? path.substring(0, lastSlashIndex) : '';
  const fullName = lastSlashIndex >= 0 ? path.substring(lastSlashIndex + 1) : path;

  // Extract base name and extension
  const lastDotIndex = fullName.lastIndexOf('.');
  const baseName = lastDotIndex >= 0 ? fullName.substring(0, lastDotIndex) : fullName;
  const extension = lastDotIndex >= 0 ? fullName.substring(lastDotIndex + 1) : '';

  return {
    prefix,
    baseName,
    extension,
    fullName
  };
}

/**
 * Check if a string is a valid image URL or path
 *
 * @param path - Path to check
 * @returns True if path looks like an image path
 */
export function isImagePath(path: string): boolean {
  if (!path) return false;

  const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'];
  const ext = path.split('.').pop()?.toLowerCase();

  return ext ? imageExtensions.includes(ext) : false;
}

/**
 * Normalize image path to ensure consistent format
 * Ensures path starts with "images/" and has proper extension
 *
 * @param path - Image path to normalize
 * @returns Normalized image path
 */
export function normalizeImagePath(path: string): string {
  if (!path) return '';

  // Remove leading slash if present
  let normalized = path.replace(/^\/+/, '');

  // Add "images/" prefix if not present
  if (!normalized.startsWith('images/')) {
    normalized = `images/${normalized}`;
  }

  return normalized;
}

/**
 * Extract counter number from an image name
 * Handles patterns like "batch-step-image-1", "image-2", etc.
 *
 * @param imageName - Image name
 * @returns Counter number, or null if no counter found
 *
 * @example
 * extractImageCounter('batch-step-image-1') // -> 1
 * extractImageCounter('general-image-5') // -> 5
 * extractImageCounter('no-counter') // -> null
 */
export function extractImageCounter(imageName: string): number | null {
  if (!imageName) return null;

  // Match number at the end of the name (optionally preceded by hyphen)
  const match = imageName.match(/-?(\d+)$/);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * Generate next image name in a sequence
 *
 * @param baseName - Base name without counter (e.g., "batch-step-image")
 * @param existingNames - Array of existing image names to check for conflicts
 * @returns New unique image name with counter
 *
 * @example
 * generateNextImageName('batch-step-image', ['batch-step-image-1', 'batch-step-image-2'])
 * // -> 'batch-step-image-3'
 */
export function generateNextImageName(baseName: string, existingNames: string[]): string {
  if (!existingNames || existingNames.length === 0) {
    return `${baseName}-1`;
  }

  // Find all counters in existing names with matching base
  const counters = existingNames
    .filter(name => name.startsWith(baseName))
    .map(name => extractImageCounter(name))
    .filter((counter): counter is number => counter !== null);

  // Get the maximum counter and add 1
  const maxCounter = counters.length > 0 ? Math.max(...counters) : 0;
  return `${baseName}-${maxCounter + 1}`;
}
