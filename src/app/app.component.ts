import { Component, OnInit, HostListener } from '@angular/core';
import { Router, NavigationEnd, Event as RouterEvent } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AnalyticsService } from './analytics.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html'
})
export class AppComponent implements OnInit {

  constructor(
    private analyticsService: AnalyticsService,
    private router: Router
  ) {}

  ngOnInit() {
    this.router.events
      .pipe(
        filter((event: RouterEvent): event is NavigationEnd => event instanceof NavigationEnd)
      )
      .subscribe((event: NavigationEnd) => {
        if (this.analyticsService.userConsented) {
          this.analyticsService.trackPageView(event.urlAfterRedirects);
        }
      });
  }

  // Global document click listener (unchanged)
  /*
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const targetElement = event.target as HTMLElement;
    const elementInfo = targetElement.id
      ? `#${targetElement.id}`
      : targetElement.className
      ? `.${targetElement.className}`
      : targetElement.tagName;

    if (this.analyticsService.userConsented) {
      const clickData = {
        element: elementInfo,
        timestamp: new Date().toISOString()
      };
      this.analyticsService.trackClickEvent(clickData);
    }
  }
  */
}
