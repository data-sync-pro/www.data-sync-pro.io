import { Component, Input, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-code-highlight',
  template: `
    <div class="code-highlight">
      <div class="code-header" *ngIf="title">
        <span class="code-title">{{ title }}</span>
        <span class="code-language">{{ language }}</span>
      </div>
      <pre class="code-block"><code [innerHTML]="highlightedCode"></code></pre>
    </div>
  `,
  styles: [`
    .code-highlight {
      margin: 1rem 0;
      border: 1px solid var(--border-color);
      border-radius: 8px;
      overflow: hidden;
    }
    
    .code-header {
      background: var(--surface-color);
      padding: 0.5rem 1rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid var(--border-color);
    }
    
    .code-title {
      font-weight: 600;
      font-size: 0.9rem;
    }
    
    .code-language {
      font-size: 0.8rem;
      color: var(--text-muted);
      text-transform: uppercase;
    }
    
    .code-block {
      margin: 0;
      padding: 1rem;
      background: #f8f8f8;
      overflow-x: auto;
      font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
      font-size: 0.9rem;
      line-height: 1.4;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CodeHighlightComponent {
  @Input() code = '';
  @Input() language = 'text';
  @Input() title = '';

  get highlightedCode(): string {
    // Basic syntax highlighting for SOQL/SQL
    if (this.language === 'soql' || this.language === 'sql') {
      return this.code
        .replace(/\b(SELECT|FROM|WHERE|ORDER BY|GROUP BY|LIMIT|AND|OR|NOT|IN|LIKE)\b/gi, 
                '<span style="color: #0066cc; font-weight: bold;">$1</span>')
        .replace(/\b(TODAY|YESTERDAY|LAST_WEEK|THIS_MONTH)\b/gi, 
                '<span style="color: #cc6600;">$1</span>');
    }
    
    return this.code;
  }
}