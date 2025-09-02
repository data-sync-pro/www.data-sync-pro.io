import { Directive, ElementRef, Input, OnChanges, SimpleChanges, Renderer2 } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { AutoLinkService } from '../services/auto-link.service';

@Directive({
  selector: '[appAutoLink]'
})
export class AutoLinkDirective implements OnChanges {
  @Input('appAutoLink') content: string | undefined;
  @Input() autoLinkDisabled = false;

  constructor(
    private el: ElementRef,
    private renderer: Renderer2,
    private autoLinkService: AutoLinkService,
    private sanitizer: DomSanitizer
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['content'] || changes['autoLinkDisabled']) {
      this.updateContent();
    }
  }

  private updateContent(): void {
    if (!this.content || this.autoLinkDisabled) {
      if (this.content) {
        // If auto-link is disabled, just set the content as-is
        this.renderer.setProperty(this.el.nativeElement, 'innerHTML', this.content);
      }
      return;
    }

    // Apply auto-link terms to the content
    const processedContent = this.autoLinkService.applyAutoLinkTerms(this.content);
    
    // Set the processed content to the element
    this.renderer.setProperty(this.el.nativeElement, 'innerHTML', processedContent);
  }
}