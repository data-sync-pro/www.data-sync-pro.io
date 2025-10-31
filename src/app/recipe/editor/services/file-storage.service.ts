import { Injectable } from '@angular/core';
import { RecipeLoggerService } from '../../core/services/logger.service';

interface StoredImage {
  id: string;
  file: File;
  timestamp: number;
}

interface StoredJsonFile {
  id: string;
  file: File;
  timestamp: number;
}

@Injectable({
  providedIn: 'root'
})
export class RecipeFileStorageService {
  private dbName = 'RecipeEditorDB';
  private imageStoreName = 'images';
  private jsonStoreName = 'jsonFiles';
  private db: IDBDatabase | null = null;
  private initPromise: Promise<IDBDatabase> | null = null;

  // Constants
  private readonly RANDOM_STRING_LENGTH = 9;
  private readonly RANDOM_STRING_RADIX = 36;
  private readonly MAX_FILE_SIZE_MB = 5;
  private readonly MAX_FILE_SIZE_BYTES = this.MAX_FILE_SIZE_MB * 1024 * 1024;
  private readonly DEFAULT_CLEANUP_DAYS = 30;
  private readonly TIME_MS_PER_SECOND = 1000;
  private readonly TIME_SECONDS_PER_MINUTE = 60;
  private readonly TIME_MINUTES_PER_HOUR = 60;
  private readonly TIME_HOURS_PER_DAY = 24;

  constructor(private logger: RecipeLoggerService) {}

  /**
   * Generic database operation wrapper
   * Reduces code duplication by handling common DB transaction patterns
   */
  private async performDbOperation<T>(
    storeName: string,
    mode: IDBTransactionMode,
    operation: (store: IDBObjectStore) => IDBRequest<T>
  ): Promise<T> {
    await this.init();

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([storeName], mode);
      const store = transaction.objectStore(storeName);
      const request = operation(store);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Initialize IndexedDB
   */
  async init(): Promise<IDBDatabase> {
    if (this.initPromise) {
      return this.initPromise;
    }
    
    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 2);
      
      request.onerror = () => {
        this.logger.error('Failed to open IndexedDB:', request.error);
        reject(request.error);
      };
      
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        const oldVersion = event.oldVersion;
        const newVersion = event.newVersion;
        
        this.logger.debug(`Upgrading IndexedDB from version ${oldVersion} to ${newVersion}`);
        
        // Version 1: Create images store (for new installations or upgrades from version 0)
        if (oldVersion < 1) {
          if (!db.objectStoreNames.contains(this.imageStoreName)) {
            const store = db.createObjectStore(this.imageStoreName, { keyPath: 'id' });
            store.createIndex('timestamp', 'timestamp', { unique: false });
            this.logger.debug('Created images object store');
          }
        }
        
        // Version 2: Create JSON files store (for upgrades from version 1)
        if (oldVersion < 2) {
          if (!db.objectStoreNames.contains(this.jsonStoreName)) {
            const store = db.createObjectStore(this.jsonStoreName, { keyPath: 'id' });
            store.createIndex('timestamp', 'timestamp', { unique: false });
            this.logger.debug('Created JSON files object store');
          }
        }
      };
    });
    
    return this.initPromise;
  }
  
  /**
   * Store an image file
   */
  async storeImage(id: string, file: File): Promise<string> {
    const imageData: StoredImage = {
      id,
      file,
      timestamp: Date.now()
    };

    await this.performDbOperation(
      this.imageStoreName,
      'readwrite',
      (store) => store.put(imageData)
    );

    this.logger.debug(`Image stored successfully: ${id}`);
    return id;
  }
  
  /**
   * Get an image file
   */
  async getImage(id: string): Promise<File | null> {
    const result = await this.performDbOperation<StoredImage>(
      this.imageStoreName,
      'readonly',
      (store) => store.get(id)
    );

    return result ? result.file : null;
  }
  
  /**
   * Delete an image
   */
  async deleteImage(id: string): Promise<boolean> {
    try {
      await this.performDbOperation(
        this.imageStoreName,
        'readwrite',
        (store) => store.delete(id)
      );

      this.logger.debug(`Image deleted successfully: ${id}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to delete image ${id}:`, error);
      return false;
    }
  }
  
  /**
   * Get all stored image IDs
   */
  async getAllImageIds(): Promise<string[]> {
    return this.performDbOperation<string[]>(
      this.imageStoreName,
      'readonly',
      (store) => store.getAllKeys() as IDBRequest<string[]>
    );
  }

  /**
   * Get all stored images
   */
  async getAllImages(): Promise<StoredImage[]> {
    return this.performDbOperation<StoredImage[]>(
      this.imageStoreName,
      'readonly',
      (store) => store.getAll()
    );
  }
  
  /**
   * Clear all stored images
   */
  async clearAll(): Promise<boolean> {
    try {
      await this.performDbOperation(
        this.imageStoreName,
        'readwrite',
        (store) => store.clear()
      );

      this.logger.debug('All images cleared successfully');
      return true;
    } catch (error) {
      this.logger.error('Failed to clear all images:', error);
      return false;
    }
  }
  
  /**
   * Get storage size info
   */
  async getStorageInfo(): Promise<{ used: number; count: number }> {
    try {
      const images = await this.getAllImages();
      let totalSize = 0;
      
      images.forEach(img => {
        totalSize += img.file.size;
      });
      
      return {
        used: totalSize,
        count: images.length
      };
    } catch (error) {
      this.logger.error('Error getting storage info:', error);
      return { used: 0, count: 0 };
    }
  }
  
  /**
   * Generate unique image ID
   */
  generateImageId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(this.RANDOM_STRING_RADIX).substring(2, 2 + this.RANDOM_STRING_LENGTH);
    return `img_${timestamp}_${random}`;
  }
  
  /**
   * Check if image ID exists
   */
  async imageExists(id: string): Promise<boolean> {
    try {
      const image = await this.getImage(id);
      return image !== null;
    } catch (error) {
      return false;
    }
  }
  
  /**
   * Get image URL for preview (creates object URL)
   */
  async getImagePreviewUrl(id: string): Promise<string | null> {
    try {
      const file = await this.getImage(id);
      if (file) {
        return URL.createObjectURL(file);
      }
      return null;
    } catch (error) {
      this.logger.error('Error getting image preview URL:', error);
      return null;
    }
  }
  
  /**
   * Cleanup old images (older than specified days)
   */
  async cleanupOldImages(daysOld = this.DEFAULT_CLEANUP_DAYS): Promise<number> {
    await this.init();

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const cutoffTime = Date.now() - (
        daysOld *
        this.TIME_HOURS_PER_DAY *
        this.TIME_MINUTES_PER_HOUR *
        this.TIME_SECONDS_PER_MINUTE *
        this.TIME_MS_PER_SECOND
      );
      const transaction = this.db.transaction([this.imageStoreName], 'readwrite');
      const store = transaction.objectStore(this.imageStoreName);
      const index = store.index('timestamp');
      
      const range = IDBKeyRange.upperBound(cutoffTime);
      const request = index.openCursor(range);
      let deletedCount = 0;
      
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          cursor.delete();
          deletedCount++;
          cursor.continue();
        } else {
          this.logger.debug(`Cleaned up ${deletedCount} old images`);
          resolve(deletedCount);
        }
      };
      
      request.onerror = () => {
        this.logger.error('Failed to cleanup old images:', request.error);
        reject(request.error);
      };
    });
  }
  
  /**
   * Validate file type (images only)
   */
  isValidImageFile(file: File): boolean {
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
    return validTypes.includes(file.type);
  }
  
  /**
   * Get file size limit (in bytes)
   */
  getMaxFileSize(): number {
    return this.MAX_FILE_SIZE_BYTES;
  }
  
  /**
   * Validate file size
   */
  isValidFileSize(file: File): boolean {
    return file.size <= this.getMaxFileSize();
  }
  
  /**
   * Validate image file
   */
  validateImageFile(file: File): { valid: boolean; error?: string } {
    if (!this.isValidImageFile(file)) {
      return { valid: false, error: 'Invalid file type. Only images are allowed.' };
    }
    
    if (!this.isValidFileSize(file)) {
      return { valid: false, error: `File too large. Maximum size is ${this.formatFileSize(this.getMaxFileSize())}.` };
    }
    
    return { valid: true };
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
   * Store a JSON file
   */
  async storeJsonFile(id: string, file: File): Promise<string> {
    const jsonData: StoredJsonFile = {
      id,
      file,
      timestamp: Date.now()
    };

    await this.performDbOperation(
      this.jsonStoreName,
      'readwrite',
      (store) => store.put(jsonData)
    );

    this.logger.debug(`JSON file stored successfully: ${id}`);
    return id;
  }
  
  /**
   * Get a JSON file
   */
  async getJsonFile(id: string): Promise<File | null> {
    const result = await this.performDbOperation<StoredJsonFile>(
      this.jsonStoreName,
      'readonly',
      (store) => store.get(id)
    );

    return result ? result.file : null;
  }

  /**
   * Delete a JSON file
   */
  async deleteJsonFile(id: string): Promise<boolean> {
    try {
      await this.performDbOperation(
        this.jsonStoreName,
        'readwrite',
        (store) => store.delete(id)
      );

      this.logger.debug(`JSON file deleted successfully: ${id}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to delete JSON file ${id}:`, error);
      return false;
    }
  }

  /**
   * Get all stored JSON file IDs
   */
  async getAllJsonFileIds(): Promise<string[]> {
    return this.performDbOperation<string[]>(
      this.jsonStoreName,
      'readonly',
      (store) => store.getAllKeys() as IDBRequest<string[]>
    );
  }

  /**
   * Get all stored JSON files
   */
  async getAllJsonFiles(): Promise<StoredJsonFile[]> {
    return this.performDbOperation<StoredJsonFile[]>(
      this.jsonStoreName,
      'readonly',
      (store) => store.getAll()
    );
  }
  
  /**
   * Validate JSON file
   */
  validateJsonFile(file: File): { valid: boolean; error?: string } {
    if (!file.type.includes('json') && !file.name.toLowerCase().endsWith('.json')) {
      return { valid: false, error: 'Invalid file type. Only JSON files are allowed.' };
    }

    if (file.size > this.MAX_FILE_SIZE_BYTES) {
      return { valid: false, error: `File too large. Maximum size is ${this.formatFileSize(this.MAX_FILE_SIZE_BYTES)}.` };
    }

    return { valid: true };
  }
  
  /**
   * Clear all JSON files
   */
  async clearAllJsonFiles(): Promise<boolean> {
    try {
      await this.performDbOperation(
        this.jsonStoreName,
        'readwrite',
        (store) => store.clear()
      );

      this.logger.debug('All JSON files cleared successfully');
      return true;
    } catch (error) {
      this.logger.error('Failed to clear all JSON files:', error);
      return false;
    }
  }
  
  /**
   * Sanitize filename
   */
  sanitizeFileName(fileName: string): string {
    // Remove path separators and special characters
    return fileName
      .replace(/[\/\\:*?"<>|]/g, '') // Remove invalid filename characters
      .replace(/\s+/g, '_') // Replace spaces with underscores
      .replace(/\.+/g, '.') // Remove multiple dots
      .replace(/^\.+|\.+$/g, ''); // Remove leading/trailing dots
  }
}