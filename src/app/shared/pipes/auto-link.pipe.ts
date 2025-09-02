import { Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { AutoLinkService } from '../services/auto-link.service';

@Pipe({
  name: 'autoLink'
})
export class AutoLinkPipe implements PipeTransform {
  constructor(
    private autoLinkService: AutoLinkService,
    private sanitizer: DomSanitizer
  ) {}

  /**
   * Transform content by applying auto-link terms
   * @param value - The HTML content to process
   * @param returnSafeHtml - Whether to return SafeHtml (true) or string (false)
   * @returns Processed content with auto-links applied
   */
  transform(value: string | SafeHtml | null | undefined, returnSafeHtml = true): SafeHtml | string {
    if (!value) {
      return returnSafeHtml ? this.sanitizer.bypassSecurityTrustHtml('') : '';
    }

    // Convert SafeHtml to string if needed
    let content: string;
    if (typeof value === 'string') {
      content = value;
    } else {
      // Extract string from SafeHtml
      content = this.sanitizer.sanitize(1, value) || '';
    }

    // Apply auto-link terms
    const processedContent = this.autoLinkService.applyAutoLinkTerms(content);

    // Return as SafeHtml or string based on parameter
    return returnSafeHtml 
      ? this.sanitizer.bypassSecurityTrustHtml(processedContent)
      : processedContent;
  }
}