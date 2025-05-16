/* admin-guide-item.component.ts */
import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { HttpClientModule }  from '@angular/common/http';
import { RouterModule,ParamMap } from '@angular/router';


@Component({
  standalone: true,
  imports: [CommonModule, HttpClientModule, RouterModule],
  template: `<div class="article" [innerHTML]="html"></div>`,
  styles: [`.article{padding:1rem 2rem;}`]
})
export class AdminGuideItemComponent {
  private route = inject(ActivatedRoute);
  private http  = inject(HttpClient);
  private safe  = inject(DomSanitizer);

  html: SafeHtml | null = null;

  ngOnInit() {
    const pm: ParamMap = this.route.snapshot.paramMap;
    const parent = pm.get('parent')!;
    const slug   = pm.get('slug')!;
    const sub    = pm.get('sub');                 // 可能为空

    const url = `/admin-guide/${parent}/${sub ? sub + '/' : ''}${slug}.html`;

    this.http.get(url, { responseType: 'text' }).subscribe(raw =>
      this.html = this.safe.bypassSecurityTrustHtml(raw)
    );
  }
}
