// admin-guide-item.component.ts
import { Component, inject, OnDestroy, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ActivatedRoute, ParamMap, RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { switchMap } from 'rxjs/operators';

@Component({
  standalone: true,
  imports: [CommonModule, HttpClientModule, RouterModule],
  template: `<div class="article" [innerHTML]="html"></div>`,
  styleUrls: ['./admin-guide-item.component.scss'],
  encapsulation: ViewEncapsulation.Emulated,  // 默认即可
})
export class AdminGuideItemComponent implements OnDestroy {
  private route = inject(ActivatedRoute);
  private http  = inject(HttpClient);
  private safe  = inject(DomSanitizer);
  private sub?: Subscription;

  html: SafeHtml | null = null;

  constructor() {
    this.sub = this.route.paramMap.pipe(
      switchMap((pm: ParamMap) => {
        const parent = pm.get('parent')!;
        const slug   = pm.get('slug')!;
        const subDir = pm.get('sub');
        const url = `/admin-guide/${parent}/${subDir ? subDir + '/' : ''}${slug}.html`;
        return this.http.get(url, { responseType: 'text' });
      })
    ).subscribe(raw => this.html = this.safe.bypassSecurityTrustHtml(raw));
  }

  ngOnDestroy() { this.sub?.unsubscribe(); }
}
