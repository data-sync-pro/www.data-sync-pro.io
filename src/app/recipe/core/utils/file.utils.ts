/**
 * File utility functions
 */

/**
 * Format file size for display
 * @param bytes - File size in bytes
 * @returns Formatted file size string (e.g., "1.5 MB")
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Get file extension from File object
 * @param file - File object
 * @returns File extension in lowercase (e.g., "jpg")
 */
export function getFileExtension(file: File): string {
  const extension = file.name.split('.').pop()?.toLowerCase();
  return extension || 'jpg';
}

/**
 * Get file extension from filename string
 * @param filename - Filename string
 * @returns File extension in lowercase (e.g., "jpg")
 */
export function getExtensionFromFilename(filename: string): string {
  const extension = filename.split('.').pop()?.toLowerCase();
  return extension || 'jpg';
}
