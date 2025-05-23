import { Component, OnInit } from '@angular/core';
import { AnalyticsService } from '../analytics.service';

@Component({
  selector: 'app-cookie-consent',
  templateUrl: './cookie-consent.component.html',
  styleUrls: ['./cookie-consent.component.scss']
})
export class CookieConsentComponent implements OnInit {
  showBanner = false;

  constructor(private analyticsService: AnalyticsService) {}

  ngOnInit() {
    const storedChoice = localStorage.getItem('cookieConsent');
    if (storedChoice === null) {
      this.showBanner = true;
    } else {
      const hasConsent = (storedChoice === 'true');
      this.analyticsService.setConsent(hasConsent);
      this.showBanner = false;
    }
  }

  onAccept() {
    this.analyticsService.setConsent(true);
    localStorage.setItem('cookieConsent', 'true');
    this.showBanner = false;
  }

  onReject() {
    this.analyticsService.setConsent(false);
    localStorage.setItem('cookieConsent', 'false');
    this.showBanner = false;
  }
}
