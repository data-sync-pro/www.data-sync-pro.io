import { Injectable } from '@angular/core';

/**
 * Recipe Logger Service
 *
 * Centralized logging service for the Recipe module.
 * - In development: logs all messages to console
 * - In production: only logs errors
 * - Provides structured logging with context
 * - Ready for integration with error tracking services (Sentry, etc.)
 *
 * @example
 * constructor(private logger: RecipeLoggerService) {}
 *
 * this.logger.debug('Loading recipe', { id: recipeId });
 * this.logger.error('Failed to load recipe', error, { id: recipeId });
 */
@Injectable({
  providedIn: 'root'
})
export class RecipeLoggerService {
  private readonly isDevelopment: boolean;
  private readonly logPrefix = '[Recipe]';

  constructor() {
    // Detect environment - adjust this based on your environment configuration
    this.isDevelopment = this.isDevEnvironment();
  }

  /**
   * Log debug information (development only)
   * @param message - The message to log
   * @param context - Optional context data
   */
  debug(message: string, context?: any): void {
    if (this.isDevelopment) {
      console.log(`${this.logPrefix} ${message}`, context !== undefined ? context : '');
    }
  }

  /**
   * Log informational messages (development only)
   * @param message - The message to log
   * @param context - Optional context data
   */
  info(message: string, context?: any): void {
    if (this.isDevelopment) {
      console.info(`${this.logPrefix} ${message}`, context !== undefined ? context : '');
    }
  }

  /**
   * Log warning messages (all environments)
   * @param message - The message to log
   * @param context - Optional context data
   */
  warn(message: string, context?: any): void {
    console.warn(`${this.logPrefix} ${message}`, context !== undefined ? context : '');
  }

  /**
   * Log error messages (all environments)
   * @param message - The message to log
   * @param error - The error object
   * @param context - Optional context data
   */
  error(message: string, error?: any, context?: any): void {
    console.error(`${this.logPrefix} ${message}`, error || '', context !== undefined ? context : '');

    // TODO: Integrate with error tracking service (e.g., Sentry)
    // this.sendToErrorTracking(message, error, context);
  }

  /**
   * Log performance metrics (development only)
   * @param label - The performance label
   * @param duration - Duration in milliseconds
   */
  performance(label: string, duration: number): void {
    if (this.isDevelopment) {
      console.log(`${this.logPrefix} [Performance] ${label}: ${duration.toFixed(2)}ms`);
    }
  }

  /**
   * Group related log messages (development only)
   * @param groupName - The name of the log group
   * @param callback - Function containing the grouped logs
   */
  group(groupName: string, callback: () => void): void {
    if (this.isDevelopment) {
      console.group(`${this.logPrefix} ${groupName}`);
      callback();
      console.groupEnd();
    }
  }

  /**
   * Detect if running in development environment
   * This is a simple check - adjust based on your environment setup
   */
  private isDevEnvironment(): boolean {
    // Check for common development indicators
    const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
    return hostname === 'localhost' ||
           hostname === '127.0.0.1' ||
           hostname.includes('local') ||
           hostname.includes('dev');
  }

  /**
   * Future: Send errors to tracking service
   * @param message - Error message
   * @param error - Error object
   * @param context - Additional context
   */
  private sendToErrorTracking(message: string, error: any, context?: any): void {
    // Integration point for services like Sentry, LogRocket, etc.
    // Example:
    // Sentry.captureException(error, {
    //   tags: { module: 'recipe' },
    //   extra: { message, context }
    // });
  }
}
