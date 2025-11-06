import { Injectable } from '@angular/core';
import { StorageAdapter, StorageWrapper } from './storage.adapter';

@Injectable({
  providedIn: 'root'
})
export class LocalStorageAdapter implements StorageAdapter {
  readonly name = 'LocalStorage';
  private prefix: string;
  private serializer: (value: any) => string;
  private deserializer: (value: string) => any;

  constructor() {
    this.prefix = 'recipe_';
    this.serializer = JSON.stringify;
    this.deserializer = JSON.parse;
  }

  private getFullKey(key: string): string {
    return `${this.prefix}${key}`;
  }

  isAvailable(): boolean {
    try {
      if (typeof localStorage === 'undefined') {
        return false;
      }
      const testKey = '__storage_test__';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      return true;
    } catch (e) {
      return false;
    }
  }

  private isExpired(wrapper: StorageWrapper<any>): boolean {
    if (!wrapper.ttl) {
      return false;
    }
    const now = Date.now();
    return (now - wrapper.timestamp) > wrapper.ttl;
  }

  async getItem<T = any>(key: string): Promise<T | null> {
    if (!this.isAvailable()) {
      return null;
    }

    try {
      const fullKey = this.getFullKey(key);
      const rawValue = localStorage.getItem(fullKey);

      if (rawValue === null) {
        return null;
      }

      try {
        const wrapper: StorageWrapper<T> = this.deserializer(rawValue);

        if (wrapper && typeof wrapper === 'object' && 'timestamp' in wrapper) {
          if (this.isExpired(wrapper)) {
            await this.removeItem(key);
            return null;
          }
          return wrapper.value;
        }

        return wrapper as T;
      } catch {
        return rawValue as any;
      }
    } catch (error) {
      console.error('LocalStorageAdapter.getItem error:', error);
      return null;
    }
  }

  async setItem<T = any>(key: string, value: T, ttl?: number): Promise<void> {
    if (!this.isAvailable()) {
      throw new Error('localStorage is not available');
    }

    try {
      const fullKey = this.getFullKey(key);

      const wrapper: StorageWrapper<T> = {
        value,
        timestamp: Date.now(),
        ttl
      };

      const serializedValue = this.serializer(wrapper);
      localStorage.setItem(fullKey, serializedValue);
    } catch (error) {
      console.error('LocalStorageAdapter.setItem error:', error);
      throw error;
    }
  }

  async removeItem(key: string): Promise<void> {
    if (!this.isAvailable()) {
      return;
    }

    try {
      const fullKey = this.getFullKey(key);
      localStorage.removeItem(fullKey);
    } catch (error) {
      console.error('LocalStorageAdapter.removeItem error:', error);
    }
  }
}
