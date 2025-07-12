import { Component, Input, OnInit } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Component({
  selector: 'lightning-icon',
  templateUrl: './lightning-icon.component.html',
  styleUrls: ['./lightning-icon.component.scss']
})
export class LightningIconComponent implements OnInit {
  @Input() iconName!: string;
  @Input() size: 'xx-small' | 'x-small' | 'small' | 'medium' | 'large' = 'medium';
  @Input() variant: 'bare' | 'container' | 'border' | 'border-filled' = 'bare';
  @Input() alternativeText: string = '';
  @Input() title: string = '';

  iconSvg: SafeHtml = '';
  iconCategory: string = '';
  iconId: string = '';

  constructor(private sanitizer: DomSanitizer) {}

  ngOnInit() {
    this.parseIconName();
    this.loadIconSvg();
  }

  private parseIconName() {
    if (this.iconName && this.iconName.includes(':')) {
      const parts = this.iconName.split(':');
      this.iconCategory = parts[0];
      this.iconId = parts[1];
    }
  }

  private loadIconSvg() {
    const svg = this.getIconSvg(this.iconCategory, this.iconId);
    this.iconSvg = this.sanitizer.bypassSecurityTrustHtml(svg);
  }

  private getIconSvg(category: string, iconId: string): string {
    // Simplified Salesforce Lightning Design System utility icons with smaller viewBox
    const utilityIcons: { [key: string]: string } = {
      'home': `<svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
      </svg>`,
      'search': `<svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
      </svg>`,
      'folder': `<svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/>
      </svg>`,
      'tag': `<svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M21.41 11.58l-9-9C12.05 2.22 11.55 2 11 2H4c-1.1 0-2 .9-2 2v7c0 .55.22 1.05.59 1.42l9 9c.36.36.86.58 1.41.58.55 0 1.05-.22 1.41-.59l7-7c.37-.36.59-.86.59-1.41 0-.55-.23-1.06-.59-1.42zM5.5 7C4.67 7 4 6.33 4 5.5S4.67 4 5.5 4 7 4.67 7 5.5 6.33 7 5.5 7z"/>
      </svg>`,
      'chevronright': `<svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
      </svg>`,
      'chevronleft': `<svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
      </svg>`,
      'chevrondown': `<svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/>
      </svg>`,
      'chevronup': `<svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z"/>
      </svg>`,
      'close': `<svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
      </svg>`,
      'info': `<svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
      </svg>`
    };

    return utilityIcons[iconId] || '';
  }

  get containerClasses(): string {
    const classes = ['slds-icon_container'];
    
    if (this.variant === 'container') {
      classes.push(`slds-icon-${this.iconCategory}-${this.iconId}`);
    }
    
    return classes.join(' ');
  }

  get iconClasses(): string {
    const classes = ['slds-icon'];
    
    classes.push(`slds-icon_${this.size}`);
    
    if (this.variant === 'border') {
      classes.push('slds-icon_border');
    } else if (this.variant === 'border-filled') {
      classes.push('slds-icon_border-filled');
    }
    
    return classes.join(' ');
  }
}
