import { Injectable } from '@angular/core';
import { BehaviorSubject, fromEvent, merge, of } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class OfflineService {
  private onlineStatus = new BehaviorSubject<boolean>(navigator.onLine);

  constructor() {
    // Listen to online/offline events
    const online$ = fromEvent(window, 'online');
    const offline$ = fromEvent(window, 'offline');
    
    merge(
      online$.pipe(map(() => true)),
      offline$.pipe(map(() => false))
    ).subscribe(status => {
      this.onlineStatus.next(status);
    });
  }

  /**
   * Get current online status as Observable
   */
  get isOnline$() {
    return this.onlineStatus.asObservable();
  }

  /**
   * Get current online status
   */
  get isOnline(): boolean {
    return this.onlineStatus.value;
  }

  /**
   * Get offline status
   */
  get isOffline(): boolean {
    return !this.isOnline;
  }

  /**
   * Check if content is available offline
   */
  isContentCachedOffline(url: string): Promise<boolean> {
    if ('caches' in window) {
      return caches.match(url).then(response => !!response);
    }
    return Promise.resolve(false);
  }

  /**
   * Get offline cache status
   */
  async getOfflineStatus() {
    if (!('caches' in window)) {
      return {
        supported: false,
        cacheNames: [],
        totalSize: 0
      };
    }

    try {
      const cacheNames = await caches.keys();
      let totalSize = 0;

      for (const cacheName of cacheNames) {
        const cache = await caches.open(cacheName);
        const requests = await cache.keys();
        
        for (const request of requests) {
          const response = await cache.match(request);
          if (response) {
            const blob = await response.blob();
            totalSize += blob.size;
          }
        }
      }

      return {
        supported: true,
        cacheNames,
        totalSize
      };
    } catch (error) {
      console.error('Error getting offline status:', error);
      return {
        supported: true,
        cacheNames: [],
        totalSize: 0
      };
    }
  }
}