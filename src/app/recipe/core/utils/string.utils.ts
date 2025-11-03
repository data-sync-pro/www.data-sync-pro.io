/**
 * String utility functions for file naming and sanitization
 */

/**
 * Options for sanitizing file names
 */
export interface SanitizeOptions {
  /** Convert to lowercase (default: true) */
  lowercase?: boolean;
  /** Character to replace spaces with (default: '-') */
  spaceReplacement?: string;
  /** Maximum length (default: null - no limit) */
  maxLength?: number | null;
  /** Fallback value if result is empty (default: 'unnamed') */
  fallback?: string;
}

const DEFAULT_OPTIONS: Required<SanitizeOptions> = {
  lowercase: true,
  spaceReplacement: '-',
  maxLength: null,
  fallback: 'unnamed'
};

/**
 * Sanitize a string for use as a safe filename
 * Removes invalid filename characters and normalizes the string
 *
 * @param text - Text to sanitize
 * @param options - Sanitization options
 * @returns Sanitized string safe for use in filenames
 *
 * @example
 * sanitizeFileName('My Recipe!', { lowercase: true, maxLength: 20 })
 * // Returns: 'my-recipe'
 *
 * @example
 * sanitizeFileName('Test File.txt', { spaceReplacement: '_', lowercase: false })
 * // Returns: 'Test_File.txt'
 */
export function sanitizeFileName(text: string, options: SanitizeOptions = {}): string {
  if (!text || typeof text !== 'string') {
    return options.fallback ?? DEFAULT_OPTIONS.fallback;
  }

  const opts = { ...DEFAULT_OPTIONS, ...options };

  let result = text.trim();

  // Convert to lowercase if requested
  if (opts.lowercase) {
    result = result.toLowerCase();
  }

  // Remove invalid filename characters
  result = result.replace(/[/\\?<>\\:*|"]/g, '');

  // Remove non-word characters (keep only word characters, spaces, and hyphens)
  result = result.replace(/[^\w\s-]/g, '');

  // Replace spaces with the specified replacement character
  result = result.replace(/\s+/g, opts.spaceReplacement);

  // Replace multiple replacement characters with single one
  if (opts.spaceReplacement === '-') {
    result = result.replace(/-+/g, '-');
    // Remove leading/trailing hyphens
    result = result.replace(/^-|-$/g, '');
  } else if (opts.spaceReplacement === '_') {
    result = result.replace(/_+/g, '_');
    // Remove leading/trailing underscores
    result = result.replace(/^_|_$/g, '');
  }

  // Apply length limit if specified
  if (opts.maxLength && opts.maxLength > 0) {
    result = result.substring(0, opts.maxLength);
  }

  // Return fallback if result is empty
  return result || opts.fallback;
}

/**
 * Create a safe string for use in image filenames
 * Convenience function with common defaults for image naming
 *
 * @param text - Text to convert
 * @param maxLength - Maximum length (default: 30)
 * @returns Safe string for image filenames
 */
export function createSafeString(text: string, maxLength: number = 30): string {
  return sanitizeFileName(text, {
    lowercase: true,
    spaceReplacement: '-',
    maxLength,
    fallback: 'unnamed'
  });
}

/**
 * Generate a safe folder name from a title
 * Handles conflicts by appending a counter if the name already exists
 *
 * @param title - Title to convert to folder name
 * @param existingFolders - Set of existing folder names to check for conflicts
 * @param maxLength - Maximum length (default: 50)
 * @returns Safe folder name, with counter appended if necessary
 */
export function generateFolderName(
  title: string,
  existingFolders?: Set<string>,
  maxLength: number = 50
): string {
  const baseName = sanitizeFileName(title, {
    lowercase: true,
    spaceReplacement: '-',
    maxLength,
    fallback: 'unnamed-folder'
  });

  // Handle conflicts if existingFolders is provided
  if (existingFolders) {
    let finalName = baseName;
    let counter = 2;

    while (existingFolders.has(finalName)) {
      finalName = `${baseName}-${counter}`;
      counter++;
    }

    return finalName;
  }

  return baseName;
}
