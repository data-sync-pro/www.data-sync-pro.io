import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class AnalyticsService {
  userConsented = false;

  constructor(private http: HttpClient) {}

  setConsent(consent: boolean) {
    this.userConsented = consent;
  }

  /**
   * Generate or retrieve the user ID from a cookie named 'visitorId'.
   * If the cookie doesn't exist, create a new one.
   */
  private getOrSetVisitorIdFromCookie(): string {
    const cookieName = 'visitorId';

    // 1. Attempt to read existing cookie
    const existingCookie = this.getCookieValue(cookieName);
    if (existingCookie) {
      return existingCookie;
    }

    // 2. If not found, generate a new ID and set it in a cookie
    const newId = Math.random().toString(36).substring(2, 10);
    const daysToExpire = 365; // Customize the expiration as needed
    this.setCookie(cookieName, newId, daysToExpire);
    return newId;
  }

  private getCookieValue(name: string): string | null {
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return match ? decodeURIComponent(match[2]) : null;
  }

  private setCookie(name: string, value: string, days?: number) {
    let cookieString = `${name}=${encodeURIComponent(value)}; path=/;`;
    if (days) {
      const date = new Date();
      date.setDate(date.getDate() + days);
      cookieString += ` expires=${date.toUTCString()};`;
    }
    document.cookie = cookieString;
  }

  /**
   * Retrieve the visitor ID (cookie-based).
   */
  private getVisitorId(): string {
    return this.getOrSetVisitorIdFromCookie();
  }

  /**
   * Globally track any click event from the document (as you already do).
   */
  trackClickEvent(data: { element: string; timestamp: string }) {
    if (!this.userConsented) {
      return;
    }
    const visitorId = this.getVisitorId();
    const payload = {
      visitorId,
      eventType: 'click',
      element: data.element,
      timestamp: data.timestamp
    };
    this.http.post('http://localhost:3000/api/track', payload)
      .subscribe({
        next: (res) => console.log('Click tracked successfully:', res),
        error: (err) => console.error('Tracking error:', err)
      });
  }

  /**
   * Track a page view (called after route navigation).
   */
  trackPageView(pageUrl: string) {
    if (!this.userConsented) {
      return;
    }
    const visitorId = this.getVisitorId();
    const payload = {
      visitorId,
      eventType: 'page_view',
      page: pageUrl,
      timestamp: new Date().toISOString()
    };
    this.http.post('http://localhost:3000/api/track', payload)
      .subscribe({
        next: (res) => console.log('Page view tracked:', res),
        error: (err) => console.error('Tracking error:', err)
      });
  }

  /**
   * A generic method for custom events, e.g., FAQ expansions.
   */
  trackCustomEvent(data: any) {
    if (!this.userConsented) {
      return;
    }
    const visitorId = this.getVisitorId();
    const payload = {
      visitorId,
      ...data
    };
    this.http.post('http://localhost:3000/api/track', payload)
      .subscribe({
        next: (res) => console.log('Custom event tracked:', res),
        error: (err) => console.error('Tracking error:', err)
      });
  }
}
