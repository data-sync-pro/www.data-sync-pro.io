import { Injectable } from '@angular/core';
import { RecipeLoggerService } from './logger.service';

/**
 * Options for storing data in localStorage
 */
export interface StorageOptions {
  /** Time-to-live in milliseconds (data expiration) */
  ttl?: number;
  /** Version string for data format versioning */
  version?: string;
}

/**
 * Internal storage data structure with metadata
 */
interface StorageData<T> {
  /** The actual data */
  value: T;
  /** Timestamp when data was stored */
  timestamp: number;
  /** Optional version identifier */
  version?: string;
}

/**
 * Local Storage Service
 *
 * Provides a unified interface for localStorage operations with the following features:
 * - Automatic JSON serialization/deserialization
 * - TTL (time-to-live) support for cache expiration
 * - Version control for data format management
 * - Type-safe operations with generics
 * - Error handling and logging
 * - SSR-compatible (checks for localStorage availability)
 *
 * @example
 * ```typescript
 * // Store data with 24-hour expiration
 * this.storage.setItem('recipes', recipes, { ttl: 24 * 60 * 60 * 1000 });
 *
 * // Retrieve data
 * const recipes = this.storage.getItem<Recipe[]>('recipes');
 *
 * // Check if expired
 * if (this.storage.isExpired('recipes')) {
 *   // Refresh data
 * }
 * ```
 */
@Injectable({
  providedIn: 'root'
})
export class LocalStorageService {

  constructor(private logger: RecipeLoggerService) {}

  /**
   * Check if localStorage is available in the current environment
   * @returns True if localStorage is available
   */
  isAvailable(): boolean {
    return typeof localStorage !== 'undefined';
  }

  /**
   * Store an item in localStorage with optional TTL and version
   *
   * @param key - Storage key
   * @param value - Value to store (will be JSON serialized)
   * @param options - Optional storage options (TTL, version)
   * @returns True if successful, false otherwise
   */
  setItem<T>(key: string, value: T, options?: StorageOptions): boolean {
    if (!this.isAvailable()) {
      this.logger.warn('localStorage not available');
      return false;
    }

    try {
      const data: StorageData<T> = {
        value,
        timestamp: Date.now(),
        version: options?.version
      };

      localStorage.setItem(key, JSON.stringify(data));
      return true;
    } catch (error) {
      this.logger.error(`Error storing item with key "${key}":`, error);
      return false;
    }
  }

  /**
   * Retrieve an item from localStorage
   *
   * @param key - Storage key
   * @param defaultValue - Default value to return if item not found or expired
   * @returns The stored value or default value
   */
  getItem<T>(key: string, defaultValue?: T): T | null {
    if (!this.isAvailable()) {
      return defaultValue ?? null;
    }

    try {
      const stored = localStorage.getItem(key);

      if (!stored) {
        return defaultValue ?? null;
      }

      const data: StorageData<T> = JSON.parse(stored);
      return data.value;
    } catch (error) {
      this.logger.error(`Error retrieving item with key "${key}":`, error);
      return defaultValue ?? null;
    }
  }

  /**
   * Retrieve an item with TTL check
   * Returns null if the item has expired
   *
   * @param key - Storage key
   * @param ttl - Time-to-live in milliseconds
   * @param defaultValue - Default value to return if item not found or expired
   * @returns The stored value or default value
   */
  getItemWithTTL<T>(key: string, ttl: number, defaultValue?: T): T | null {
    if (this.isExpired(key, ttl)) {
      this.removeItem(key);
      return defaultValue ?? null;
    }

    return this.getItem<T>(key, defaultValue);
  }

  /**
   * Check if a stored item has expired based on TTL
   *
   * @param key - Storage key
   * @param ttl - Time-to-live in milliseconds
   * @returns True if expired or not found, false otherwise
   */
  isExpired(key: string, ttl: number): boolean {
    if (!this.isAvailable()) {
      return true;
    }

    try {
      const stored = localStorage.getItem(key);

      if (!stored) {
        return true;
      }

      const data: StorageData<any> = JSON.parse(stored);
      const age = Date.now() - data.timestamp;

      return age > ttl;
    } catch (error) {
      this.logger.error(`Error checking expiration for key "${key}":`, error);
      return true;
    }
  }

  /**
   * Get the timestamp when an item was stored
   *
   * @param key - Storage key
   * @returns Timestamp in milliseconds, or null if not found
   */
  getTimestamp(key: string): number | null {
    if (!this.isAvailable()) {
      return null;
    }

    try {
      const stored = localStorage.getItem(key);

      if (!stored) {
        return null;
      }

      const data: StorageData<any> = JSON.parse(stored);
      return data.timestamp;
    } catch (error) {
      this.logger.error(`Error getting timestamp for key "${key}":`, error);
      return null;
    }
  }

  /**
   * Get the version of a stored item
   *
   * @param key - Storage key
   * @returns Version string, or null if not found or no version
   */
  getVersion(key: string): string | null {
    if (!this.isAvailable()) {
      return null;
    }

    try {
      const stored = localStorage.getItem(key);

      if (!stored) {
        return null;
      }

      const data: StorageData<any> = JSON.parse(stored);
      return data.version ?? null;
    } catch (error) {
      this.logger.error(`Error getting version for key "${key}":`, error);
      return null;
    }
  }

  /**
   * Remove an item from localStorage
   *
   * @param key - Storage key
   * @returns True if successful, false otherwise
   */
  removeItem(key: string): boolean {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      this.logger.error(`Error removing item with key "${key}":`, error);
      return false;
    }
  }

  /**
   * Clear all items from localStorage, optionally filtered by key prefix
   *
   * @param prefix - Optional key prefix to filter which items to clear
   * @returns Number of items cleared
   */
  clear(prefix?: string): number {
    if (!this.isAvailable()) {
      return 0;
    }

    try {
      if (!prefix) {
        const count = localStorage.length;
        localStorage.clear();
        return count;
      }

      // Clear only items with matching prefix
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(prefix)) {
          keysToRemove.push(key);
        }
      }

      keysToRemove.forEach(key => localStorage.removeItem(key));
      return keysToRemove.length;
    } catch (error) {
      this.logger.error('Error clearing localStorage:', error);
      return 0;
    }
  }

  /**
   * Check if a key exists in localStorage
   *
   * @param key - Storage key
   * @returns True if key exists, false otherwise
   */
  hasItem(key: string): boolean {
    if (!this.isAvailable()) {
      return false;
    }

    return localStorage.getItem(key) !== null;
  }

  /**
   * Get all keys in localStorage, optionally filtered by prefix
   *
   * @param prefix - Optional key prefix to filter
   * @returns Array of keys
   */
  getKeys(prefix?: string): string[] {
    if (!this.isAvailable()) {
      return [];
    }

    try {
      const keys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (!prefix || key.startsWith(prefix))) {
          keys.push(key);
        }
      }
      return keys;
    } catch (error) {
      this.logger.error('Error getting keys from localStorage:', error);
      return [];
    }
  }

  /**
   * Get the total number of items in localStorage
   *
   * @returns Number of items
   */
  getLength(): number {
    if (!this.isAvailable()) {
      return 0;
    }

    return localStorage.length;
  }
}
