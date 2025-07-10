/**
 * Performance utilities for FAQ application
 */

/**
 * Debounce function to limit function calls
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

/**
 * Throttle function to limit function calls
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * Memoization utility for expensive computations
 */
export function memoize<T extends (...args: any[]) => any>(fn: T): T {
  const cache = new Map();
  return ((...args: any[]) => {
    const key = JSON.stringify(args);
    if (cache.has(key)) {
      return cache.get(key);
    }
    const result = fn(...args);
    cache.set(key, result);
    return result;
  }) as T;
}

/**
 * Lazy loading utility
 */
export function lazyLoad<T>(factory: () => Promise<T>): () => Promise<T> {
  let promise: Promise<T> | null = null;
  return () => {
    if (!promise) {
      promise = factory();
    }
    return promise;
  };
}

/**
 * Performance monitoring utility
 */
export class PerformanceMonitor {
  private static measurements = new Map<string, number>();

  static startMeasurement(name: string): void {
    this.measurements.set(name, performance.now());
  }

  static endMeasurement(name: string): number {
    const startTime = this.measurements.get(name);
    if (!startTime) {
      console.warn(`No start measurement found for: ${name}`);
      return 0;
    }

    const duration = performance.now() - startTime;
    this.measurements.delete(name);

    console.log(`Performance: ${name} took ${duration.toFixed(2)}ms`);
    return duration;
  }

  static measureAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
    this.startMeasurement(name);
    return fn().finally(() => this.endMeasurement(name));
  }

  static measure<T>(name: string, fn: () => T): T {
    this.startMeasurement(name);
    try {
      return fn();
    } finally {
      this.endMeasurement(name);
    }
  }
}

/**
 * Virtual scrolling utilities
 */
export interface VirtualScrollConfig {
  itemHeight: number;
  containerHeight: number;
  buffer: number;
}

export function calculateVirtualScrollRange(
  scrollTop: number,
  config: VirtualScrollConfig,
  totalItems: number
): { start: number; end: number; offsetY: number } {
  const { itemHeight, containerHeight, buffer } = config;

  const visibleStart = Math.floor(scrollTop / itemHeight);
  const visibleEnd = Math.min(visibleStart + Math.ceil(containerHeight / itemHeight), totalItems);

  const start = Math.max(0, visibleStart - buffer);
  const end = Math.min(totalItems, visibleEnd + buffer);
  const offsetY = start * itemHeight;

  return { start, end, offsetY };
}

/**
 * Image lazy loading utility
 */
export function setupImageLazyLoading(): void {
  if ('IntersectionObserver' in window) {
    const imageObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target as HTMLImageElement;
          const src = img.dataset['src'];
          if (src) {
            img.src = src;
            img.classList.remove('lazy');
            imageObserver.unobserve(img);
          }
        }
      });
    });

    document.querySelectorAll('img[data-src]').forEach(img => {
      imageObserver.observe(img);
    });
  }
}

/**
 * Bundle size optimization utilities
 */
export function loadModuleDynamically<T>(moduleFactory: () => Promise<T>): Promise<T> {
  return moduleFactory();
}

/**
 * Memory management utilities
 */
export class MemoryManager {
  private static subscriptions = new Set<() => void>();

  static addCleanup(cleanup: () => void): void {
    this.subscriptions.add(cleanup);
  }

  static cleanup(): void {
    this.subscriptions.forEach(cleanup => cleanup());
    this.subscriptions.clear();
  }

  static trackMemoryUsage(): void {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      console.log('Memory Usage:', {
        used: Math.round(memory.usedJSHeapSize / 1048576) + ' MB',
        total: Math.round(memory.totalJSHeapSize / 1048576) + ' MB',
        limit: Math.round(memory.jsHeapSizeLimit / 1048576) + ' MB',
      });
    }
  }
}

/**
 * Network optimization utilities
 */
export function getConnectionSpeed(): 'slow' | 'fast' {
  if ('connection' in navigator) {
    const connection = (navigator as any).connection;
    const effectiveType = connection.effectiveType;
    return ['slow-2g', '2g', '3g'].includes(effectiveType) ? 'slow' : 'fast';
  }
  return 'fast'; // Default to fast if not supported
}

export function getDeviceType(): 'mobile' | 'tablet' | 'desktop' {
  const width = window.innerWidth;
  if (width < 768) return 'mobile';
  if (width < 1024) return 'tablet';
  return 'desktop';
}

/**
 * Caching utilities
 */
export class CacheManager {
  private static cache = new Map<string, { data: any; timestamp: number; ttl: number }>();

  static set(key: string, data: any, ttlMs = 300000): void {
    // 5 minutes default
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlMs,
    });
  }

  static get<T>(key: string): T | null {
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return null;
    }

    return item.data;
  }

  static clear(): void {
    this.cache.clear();
  }

  static cleanup(): void {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > item.ttl) {
        this.cache.delete(key);
      }
    }
  }
}
