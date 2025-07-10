import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import {
  AppConfig,
  ThemeConfig,
  AccessibilityConfig,
  CacheConfig,
  AdvancedSearchConfig,
  PerformanceMetrics,
} from '../models/faq.model';

/**
 * Configuration service for managing application settings
 */
@Injectable({
  providedIn: 'root',
})
export class ConfigService {
  private readonly defaultConfig: AppConfig = {
    api: {
      baseUrl: '/api',
      timeout: 30000,
      retryAttempts: 3,
    },
    features: {
      search: true,
      analytics: true,
      socialSharing: true,
      offlineMode: false,
    },
    performance: {
      virtualScrolling: true,
      lazyLoading: true,
      caching: {
        enabled: true,
        ttl: 300000, // 5 minutes
        maxSize: 100,
        strategy: 'lru',
      },
    },
    ui: {
      theme: {
        name: 'default',
        primaryColor: '#1976d2',
        secondaryColor: '#424242',
        backgroundColor: '#fafafa',
        textColor: '#212121',
        fontFamily: 'Roboto, sans-serif',
        fontSize: {
          small: '12px',
          medium: '14px',
          large: '16px',
        },
      },
      accessibility: {
        highContrast: false,
        largeText: false,
        screenReaderOptimized: false,
        keyboardNavigation: true,
        reducedMotion: false,
      },
      i18n: {
        defaultLanguage: 'en',
        supportedLanguages: ['en', 'zh'],
        translations: {},
        dateFormat: 'MM/dd/yyyy',
        numberFormat: 'en-US',
      },
    },
  };

  private readonly searchConfig: AdvancedSearchConfig = {
    fuzzySearch: true,
    synonyms: {
      help: ['assistance', 'support', 'aid'],
      problem: ['issue', 'trouble', 'difficulty'],
      error: ['bug', 'fault', 'mistake'],
    },
    stopWords: [
      'the',
      'a',
      'an',
      'and',
      'or',
      'but',
      'in',
      'on',
      'at',
      'to',
      'for',
      'of',
      'with',
      'by',
    ],
    minQueryLength: 2,
    maxResults: 50,
    boostFactors: {
      titleMatch: 3.0,
      categoryMatch: 2.0,
      contentMatch: 1.0,
      popularityBoost: 1.5,
    },
  };

  private configSubject = new BehaviorSubject<AppConfig>(this.defaultConfig);
  private performanceMetrics = new BehaviorSubject<PerformanceMetrics>({
    loadTime: 0,
    searchTime: 0,
    renderTime: 0,
    memoryUsage: 0,
    cacheHitRate: 0,
  });

  constructor() {
    this.loadConfigFromStorage();
  }

  /**
   * Get current configuration
   */
  getConfig(): Observable<AppConfig> {
    return this.configSubject.asObservable();
  }

  /**
   * Get current configuration value
   */
  getCurrentConfig(): AppConfig {
    return this.configSubject.value;
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<AppConfig>): void {
    const currentConfig = this.configSubject.value;
    const newConfig = this.deepMerge(currentConfig, config);
    this.configSubject.next(newConfig);
    this.saveConfigToStorage(newConfig);
  }

  /**
   * Get search configuration
   */
  getSearchConfig(): AdvancedSearchConfig {
    return this.searchConfig;
  }

  /**
   * Update theme configuration
   */
  updateTheme(theme: Partial<ThemeConfig>): void {
    const currentConfig = this.getCurrentConfig();
    this.updateConfig({
      ui: {
        ...currentConfig.ui,
        theme: { ...currentConfig.ui.theme, ...theme },
      },
    });
  }

  /**
   * Update accessibility configuration
   */
  updateAccessibility(accessibility: Partial<AccessibilityConfig>): void {
    const currentConfig = this.getCurrentConfig();
    this.updateConfig({
      ui: {
        ...currentConfig.ui,
        accessibility: { ...currentConfig.ui.accessibility, ...accessibility },
      },
    });
  }

  /**
   * Update cache configuration
   */
  updateCacheConfig(cache: Partial<CacheConfig>): void {
    const currentConfig = this.getCurrentConfig();
    this.updateConfig({
      performance: {
        ...currentConfig.performance,
        caching: { ...currentConfig.performance.caching, ...cache },
      },
    });
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(): Observable<PerformanceMetrics> {
    return this.performanceMetrics.asObservable();
  }

  /**
   * Update performance metrics
   */
  updatePerformanceMetrics(metrics: Partial<PerformanceMetrics>): void {
    const currentMetrics = this.performanceMetrics.value;
    this.performanceMetrics.next({ ...currentMetrics, ...metrics });
  }

  /**
   * Reset configuration to defaults
   */
  resetToDefaults(): void {
    this.configSubject.next(this.defaultConfig);
    this.saveConfigToStorage(this.defaultConfig);
  }

  /**
   * Check if feature is enabled
   */
  isFeatureEnabled(feature: keyof AppConfig['features']): boolean {
    return this.getCurrentConfig().features[feature];
  }

  /**
   * Get API configuration
   */
  getApiConfig(): AppConfig['api'] {
    return this.getCurrentConfig().api;
  }

  /**
   * Get UI configuration
   */
  getUIConfig(): AppConfig['ui'] {
    return this.getCurrentConfig().ui;
  }

  /**
   * Get performance configuration
   */
  getPerformanceConfig(): AppConfig['performance'] {
    return this.getCurrentConfig().performance;
  }

  /**
   * Validate configuration
   */
  validateConfig(config: AppConfig): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate API configuration
    if (!config.api.baseUrl) {
      errors.push('API base URL is required');
    }
    if (config.api.timeout <= 0) {
      errors.push('API timeout must be positive');
    }
    if (config.api.retryAttempts < 0) {
      errors.push('Retry attempts cannot be negative');
    }

    // Validate cache configuration
    if (config.performance.caching.ttl <= 0) {
      errors.push('Cache TTL must be positive');
    }
    if (config.performance.caching.maxSize <= 0) {
      errors.push('Cache max size must be positive');
    }

    // Validate theme configuration
    if (!config.ui.theme.primaryColor.match(/^#[0-9A-F]{6}$/i)) {
      errors.push('Primary color must be a valid hex color');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Export configuration
   */
  exportConfig(): string {
    return JSON.stringify(this.getCurrentConfig(), null, 2);
  }

  /**
   * Import configuration
   */
  importConfig(configJson: string): { success: boolean; error?: string } {
    try {
      const config = JSON.parse(configJson) as AppConfig;
      const validation = this.validateConfig(config);

      if (!validation.isValid) {
        return {
          success: false,
          error: `Invalid configuration: ${validation.errors.join(', ')}`,
        };
      }

      this.updateConfig(config);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: 'Invalid JSON format',
      };
    }
  }

  /**
   * Load configuration from local storage
   */
  private loadConfigFromStorage(): void {
    try {
      const stored = localStorage.getItem('faq-app-config');
      if (stored) {
        const config = JSON.parse(stored) as AppConfig;
        const validation = this.validateConfig(config);

        if (validation.isValid) {
          this.configSubject.next(config);
        } else {
          console.warn('Invalid stored configuration, using defaults');
        }
      }
    } catch (error) {
      console.warn('Failed to load configuration from storage:', error);
    }
  }

  /**
   * Save configuration to local storage
   */
  private saveConfigToStorage(config: AppConfig): void {
    try {
      localStorage.setItem('faq-app-config', JSON.stringify(config));
    } catch (error) {
      console.warn('Failed to save configuration to storage:', error);
    }
  }

  /**
   * Deep merge two objects
   */
  private deepMerge(target: any, source: any): any {
    const result = { ...target };

    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(target[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }

    return result;
  }
}
