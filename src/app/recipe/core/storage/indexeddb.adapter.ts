import { Injectable } from '@angular/core';
import { StorageAdapter, StorageWrapper } from './storage.adapter';

@Injectable({
  providedIn: 'root'
})
export class IndexedDBAdapter implements StorageAdapter {
  readonly name = 'IndexedDB';

  private dbName = 'RecipeDB';
  private storeName = 'recipeStore';
  private version = 1;
  private db: IDBDatabase | null = null;
  private initPromise: Promise<IDBDatabase> | null = null;

  isAvailable(): boolean {
    return typeof indexedDB !== 'undefined';
  }

  private async init(): Promise<IDBDatabase> {
    if (this.db) {
      return this.db;
    }

    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = new Promise((resolve, reject) => {
      if (!this.isAvailable()) {
        reject(new Error('IndexedDB is not available'));
        return;
      }

      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => {
        reject(new Error('Failed to open IndexedDB'));
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        const db = (event.target as IDBOpenDBRequest).result;

        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName);
        }
      };
    });

    return this.initPromise;
  }

  private async getTransaction(mode: IDBTransactionMode): Promise<IDBTransaction> {
    const db = await this.init();
    return db.transaction([this.storeName], mode);
  }

  private async getObjectStore(mode: IDBTransactionMode): Promise<IDBObjectStore> {
    const transaction = await this.getTransaction(mode);
    return transaction.objectStore(this.storeName);
  }

  private isExpired(wrapper: StorageWrapper<any>): boolean {
    if (!wrapper.ttl) {
      return false;
    }
    const now = Date.now();
    return (now - wrapper.timestamp) > wrapper.ttl;
  }

  async getItem<T = any>(key: string): Promise<T | null> {
    try {
      const store = await this.getObjectStore('readonly');

      return new Promise((resolve, reject) => {
        const request = store.get(key);

        request.onsuccess = () => {
          const result = request.result;

          if (result === undefined) {
            resolve(null);
            return;
          }

          if (result && typeof result === 'object' && 'timestamp' in result && 'value' in result) {
            const wrapper: StorageWrapper<T> = result;

            if (this.isExpired(wrapper)) {
              this.removeItem(key).catch(console.error);
              resolve(null);
              return;
            }

            resolve(wrapper.value);
          } else {
            resolve(result);
          }
        };

        request.onerror = () => {
          console.error('IndexedDBAdapter.getItem error:', request.error);
          resolve(null);
        };
      });
    } catch (error) {
      console.error('IndexedDBAdapter.getItem error:', error);
      return null;
    }
  }

  async setItem<T = any>(key: string, value: T, ttl?: number): Promise<void> {
    try {
      const store = await this.getObjectStore('readwrite');

      const wrapper: StorageWrapper<T> = {
        value,
        timestamp: Date.now(),
        ttl
      };

      return new Promise((resolve, reject) => {
        const request = store.put(wrapper, key);

        request.onsuccess = () => {
          resolve();
        };

        request.onerror = () => {
          console.error('IndexedDBAdapter.setItem error:', request.error);
          reject(request.error);
        };
      });
    } catch (error) {
      console.error('IndexedDBAdapter.setItem error:', error);
      throw error;
    }
  }

  async removeItem(key: string): Promise<void> {
    try {
      const store = await this.getObjectStore('readwrite');

      return new Promise((resolve, reject) => {
        const request = store.delete(key);

        request.onsuccess = () => {
          resolve();
        };

        request.onerror = () => {
          console.error('IndexedDBAdapter.removeItem error:', request.error);
          reject(request.error);
        };
      });
    } catch (error) {
      console.error('IndexedDBAdapter.removeItem error:', error);
    }
  }
}
