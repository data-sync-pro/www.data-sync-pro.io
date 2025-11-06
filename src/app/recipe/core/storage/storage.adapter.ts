export interface StorageAdapter {
  readonly name: string;
  isAvailable(): boolean;
  getItem<T = any>(key: string): Promise<T | null>;
  setItem<T = any>(key: string, value: T): Promise<void>;
  removeItem(key: string): Promise<void>;
}

export interface StorageWrapper<T> {
  value: T;
  timestamp: number;
  ttl?: number;
}
