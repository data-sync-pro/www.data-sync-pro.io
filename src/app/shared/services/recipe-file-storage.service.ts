import { Injectable } from '@angular/core';

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
  
  constructor() {}
  
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
        console.error('Failed to open IndexedDB:', request.error);
        reject(request.error);
      };
      
      request.onsuccess = () => {
        this.db = request.result;
        console.log('IndexedDB initialized successfully');
        resolve(this.db);
      };
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        const oldVersion = event.oldVersion;
        const newVersion = event.newVersion;
        
        console.log(`Upgrading IndexedDB from version ${oldVersion} to ${newVersion}`);
        
        // Version 1: Create images store (for new installations or upgrades from version 0)
        if (oldVersion < 1) {
          if (!db.objectStoreNames.contains(this.imageStoreName)) {
            const store = db.createObjectStore(this.imageStoreName, { keyPath: 'id' });
            store.createIndex('timestamp', 'timestamp', { unique: false });
            console.log('Created images object store');
          }
        }
        
        // Version 2: Create JSON files store (for upgrades from version 1)
        if (oldVersion < 2) {
          if (!db.objectStoreNames.contains(this.jsonStoreName)) {
            const store = db.createObjectStore(this.jsonStoreName, { keyPath: 'id' });
            store.createIndex('timestamp', 'timestamp', { unique: false });
            console.log('Created JSON files object store');
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
    await this.init();
    
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }
      
      const transaction = this.db.transaction([this.imageStoreName], 'readwrite');
      const store = transaction.objectStore(this.imageStoreName);
      
      const imageData: StoredImage = {
        id,
        file,
        timestamp: Date.now()
      };
      
      const request = store.put(imageData);
      
      request.onsuccess = () => {
        console.log(`Image stored successfully: ${id}`);
        resolve(id);
      };
      
      request.onerror = () => {
        console.error(`Failed to store image ${id}:`, request.error);
        reject(request.error);
      };
    });
  }
  
  /**
   * Get an image file
   */
  async getImage(id: string): Promise<File | null> {
    await this.init();
    
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }
      
      const transaction = this.db.transaction([this.imageStoreName], 'readonly');
      const store = transaction.objectStore(this.imageStoreName);
      const request = store.get(id);
      
      request.onsuccess = () => {
        const result = request.result as StoredImage;
        resolve(result ? result.file : null);
      };
      
      request.onerror = () => {
        console.error(`Failed to get image ${id}:`, request.error);
        reject(request.error);
      };
    });
  }
  
  /**
   * Delete an image
   */
  async deleteImage(id: string): Promise<boolean> {
    await this.init();
    
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }
      
      const transaction = this.db.transaction([this.imageStoreName], 'readwrite');
      const store = transaction.objectStore(this.imageStoreName);
      const request = store.delete(id);
      
      request.onsuccess = () => {
        console.log(`Image deleted successfully: ${id}`);
        resolve(true);
      };
      
      request.onerror = () => {
        console.error(`Failed to delete image ${id}:`, request.error);
        resolve(false);
      };
    });
  }
  
  /**
   * Get all stored image IDs
   */
  async getAllImageIds(): Promise<string[]> {
    await this.init();
    
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }
      
      const transaction = this.db.transaction([this.imageStoreName], 'readonly');
      const store = transaction.objectStore(this.imageStoreName);
      const request = store.getAllKeys();
      
      request.onsuccess = () => {
        resolve(request.result as string[]);
      };
      
      request.onerror = () => {
        console.error('Failed to get all image IDs:', request.error);
        reject(request.error);
      };
    });
  }
  
  /**
   * Get all stored images
   */
  async getAllImages(): Promise<StoredImage[]> {
    await this.init();
    
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }
      
      const transaction = this.db.transaction([this.imageStoreName], 'readonly');
      const store = transaction.objectStore(this.imageStoreName);
      const request = store.getAll();
      
      request.onsuccess = () => {
        resolve(request.result as StoredImage[]);
      };
      
      request.onerror = () => {
        console.error('Failed to get all images:', request.error);
        reject(request.error);
      };
    });
  }
  
  /**
   * Clear all stored images
   */
  async clearAll(): Promise<boolean> {
    await this.init();
    
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }
      
      const transaction = this.db.transaction([this.imageStoreName], 'readwrite');
      const store = transaction.objectStore(this.imageStoreName);
      const request = store.clear();
      
      request.onsuccess = () => {
        console.log('All images cleared successfully');
        resolve(true);
      };
      
      request.onerror = () => {
        console.error('Failed to clear all images:', request.error);
        resolve(false);
      };
    });
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
      console.error('Error getting storage info:', error);
      return { used: 0, count: 0 };
    }
  }
  
  /**
   * Generate unique image ID
   */
  generateImageId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
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
      console.error('Error getting image preview URL:', error);
      return null;
    }
  }
  
  /**
   * Cleanup old images (older than specified days)
   */
  async cleanupOldImages(daysOld = 30): Promise<number> {
    await this.init();
    
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }
      
      const cutoffTime = Date.now() - (daysOld * 24 * 60 * 60 * 1000);
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
          console.log(`Cleaned up ${deletedCount} old images`);
          resolve(deletedCount);
        }
      };
      
      request.onerror = () => {
        console.error('Failed to cleanup old images:', request.error);
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
    return 5 * 1024 * 1024; // 5MB
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
    await this.init();
    
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }
      
      const transaction = this.db.transaction([this.jsonStoreName], 'readwrite');
      const store = transaction.objectStore(this.jsonStoreName);
      
      const jsonData: StoredJsonFile = {
        id,
        file,
        timestamp: Date.now()
      };
      
      const request = store.put(jsonData);
      
      request.onsuccess = () => {
        console.log(`JSON file stored successfully: ${id}`);
        resolve(id);
      };
      
      request.onerror = () => {
        console.error(`Failed to store JSON file ${id}:`, request.error);
        reject(request.error);
      };
    });
  }
  
  /**
   * Get a JSON file
   */
  async getJsonFile(id: string): Promise<File | null> {
    await this.init();
    
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }
      
      const transaction = this.db.transaction([this.jsonStoreName], 'readonly');
      const store = transaction.objectStore(this.jsonStoreName);
      const request = store.get(id);
      
      request.onsuccess = () => {
        const result = request.result as StoredJsonFile;
        resolve(result ? result.file : null);
      };
      
      request.onerror = () => {
        console.error(`Failed to get JSON file ${id}:`, request.error);
        reject(request.error);
      };
    });
  }
  
  /**
   * Delete a JSON file
   */
  async deleteJsonFile(id: string): Promise<boolean> {
    await this.init();
    
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }
      
      const transaction = this.db.transaction([this.jsonStoreName], 'readwrite');
      const store = transaction.objectStore(this.jsonStoreName);
      const request = store.delete(id);
      
      request.onsuccess = () => {
        console.log(`JSON file deleted successfully: ${id}`);
        resolve(true);
      };
      
      request.onerror = () => {
        console.error(`Failed to delete JSON file ${id}:`, request.error);
        resolve(false);
      };
    });
  }
  
  /**
   * Get all stored JSON file IDs
   */
  async getAllJsonFileIds(): Promise<string[]> {
    await this.init();
    
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }
      
      const transaction = this.db.transaction([this.jsonStoreName], 'readonly');
      const store = transaction.objectStore(this.jsonStoreName);
      const request = store.getAllKeys();
      
      request.onsuccess = () => {
        resolve(request.result as string[]);
      };
      
      request.onerror = () => {
        console.error('Failed to get all JSON file IDs:', request.error);
        reject(request.error);
      };
    });
  }
  
  /**
   * Get all stored JSON files
   */
  async getAllJsonFiles(): Promise<StoredJsonFile[]> {
    await this.init();
    
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }
      
      const transaction = this.db.transaction([this.jsonStoreName], 'readonly');
      const store = transaction.objectStore(this.jsonStoreName);
      const request = store.getAll();
      
      request.onsuccess = () => {
        resolve(request.result as StoredJsonFile[]);
      };
      
      request.onerror = () => {
        console.error('Failed to get all JSON files:', request.error);
        reject(request.error);
      };
    });
  }
  
  /**
   * Validate JSON file
   */
  validateJsonFile(file: File): { valid: boolean; error?: string } {
    if (!file.type.includes('json') && !file.name.toLowerCase().endsWith('.json')) {
      return { valid: false, error: 'Invalid file type. Only JSON files are allowed.' };
    }
    
    const maxSize = 5 * 1024 * 1024; // 5MB for JSON files
    if (file.size > maxSize) {
      return { valid: false, error: `File too large. Maximum size is ${this.formatFileSize(maxSize)}.` };
    }
    
    return { valid: true };
  }
  
  /**
   * Clear all JSON files
   */
  async clearAllJsonFiles(): Promise<boolean> {
    await this.init();
    
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }
      
      const transaction = this.db.transaction([this.jsonStoreName], 'readwrite');
      const store = transaction.objectStore(this.jsonStoreName);
      const request = store.clear();
      
      request.onsuccess = () => {
        console.log('All JSON files cleared successfully');
        resolve(true);
      };
      
      request.onerror = () => {
        console.error('Failed to clear all JSON files:', request.error);
        resolve(false);
      };
    });
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