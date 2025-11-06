import { Injectable } from '@angular/core';
import { LoggerService } from './logger.service';

interface StorageData<T> {
  value: T;
  timestamp: number;
}

@Injectable({
  providedIn: 'root'
})
export class LocalStorageService {

  constructor(private logger: LoggerService) {}

  private isAvailable(): boolean {
    return typeof localStorage !== 'undefined';
  }

  setItem<T>(key: string, value: T): boolean {
    if (!this.isAvailable()) {
      this.logger.warn('localStorage not available');
      return false;
    }

    try {
      const data: StorageData<T> = {
        value,
        timestamp: Date.now()
      };

      localStorage.setItem(key, JSON.stringify(data));
      return true;
    } catch (error) {
      this.logger.error(`Error storing item with key "${key}":`, error);
      return false;
    }
  }

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
}
