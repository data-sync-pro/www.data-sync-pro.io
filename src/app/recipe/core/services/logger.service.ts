import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class LoggerService {
  private readonly isDevelopment: boolean;
  private readonly logPrefix = '[Recipe]';

  constructor() {
    this.isDevelopment = this.isDevEnvironment();
  }

  debug(message: string, context?: any): void {
    if (this.isDevelopment) {
      console.log(`${this.logPrefix} ${message}`, context !== undefined ? context : '');
    }
  }

  info(message: string, context?: any): void {
    if (this.isDevelopment) {
      console.info(`${this.logPrefix} ${message}`, context !== undefined ? context : '');
    }
  }

  warn(message: string, context?: any): void {
    console.warn(`${this.logPrefix} ${message}`, context !== undefined ? context : '');
  }

  error(message: string, error?: any, context?: any): void {
    console.error(`${this.logPrefix} ${message}`, error || '', context !== undefined ? context : '');
  }

  private isDevEnvironment(): boolean {
    const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
    return hostname === 'localhost' ||
           hostname === '127.0.0.1' ||
           hostname.includes('local') ||
           hostname.includes('dev');
  }
}
