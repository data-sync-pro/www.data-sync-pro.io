import { Component, HostListener } from '@angular/core';
import { AnalyticsService } from './analytics.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html'
})
export class AppComponent {

  constructor(private analyticsService: AnalyticsService) {}

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    // The clicked element
    const targetElement = event.target as HTMLElement;

    // Build an identifier: ID, class, or just the tag name
    const elementInfo = targetElement.id
      ? `#${targetElement.id}`
      : targetElement.className
      ? `.${targetElement.className}`
      : targetElement.tagName;

    // Only track if user has accepted cookies
    if (this.analyticsService.userConsented) {
      const clickData = {
        element: elementInfo,
        timestamp: new Date().toISOString()
      };
      this.analyticsService.trackClickEvent(clickData);
    }
  }
}
