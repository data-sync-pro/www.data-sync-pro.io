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

  // If you want a unique visitor ID, you can store/retrieve it from localStorage:
  private getVisitorId(): string {
    let vid = localStorage.getItem('visitorId');
    if (!vid) {
      vid = Math.random().toString(36).substring(2, 10);
      localStorage.setItem('visitorId', vid);
    }
    return vid;
  }

  // This method is called from the global click listener
  trackClickEvent(data: { element: string; timestamp: string }) {
    // If the user hasn't accepted cookies, do nothing
    if (!this.userConsented) {
      return;
    }

    // We can add the visitorId if we want
    const visitorId = this.getVisitorId();

    // Build the final payload
    const payload = {
      visitorId,
      ...data
    };

    // Send to your backend. Adjust the URL if your server is at a different port or domain
    this.http.post('http://localhost:3000/api/track', payload)
      .subscribe({
        next: (res) => console.log('Click tracked successfully:', res),
        error: (err) => console.error('Tracking error:', err)
      });
  }
}
