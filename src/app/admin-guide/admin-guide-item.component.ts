/* admin-guide-item.component.ts */
import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';

@Component({
  standalone: true,
  imports: [CommonModule],
  template: `<div class="article" [innerHTML]="html"></div>`,
  styles: [`.article{padding:1rem 2rem;}`],
  
})
export class AdminGuideItemComponent {
  private route = inject(ActivatedRoute);
  private http  = inject(HttpClient);
  private safe  = inject(DomSanitizer);

  html: SafeHtml | null = null;

  ngOnInit() {
    const parent = this.route.snapshot.paramMap.get('parent')!;
    const slug   = this.route.snapshot.paramMap.get('slug')!;
    const extra  = this.route.snapshot.url.length === 3               // 有次级目录？
                    ? this.route.snapshot.url[1].path + '/' : '';     // e.g. 'examples/'

    const url = `assets/admin-guide/${parent}/${extra}${slug}.html`;
    this.http.get(url, { responseType: 'text' }).subscribe(raw =>
      this.html = this.safe.bypassSecurityTrustHtml(raw)
    );
  }
}
