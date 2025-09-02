import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { getFAQUrlByKey } from '../config/faq-urls.config';

interface AutoLinkTerm {
  faqLink?: string;
  functionDoc?: string;
  caseSensitive?: boolean;
  description?: string;
}

interface AutoLinkTermsConfig {
  terms: { [key: string]: AutoLinkTerm };
}

@Injectable({
  providedIn: 'root'
})
export class AutoLinkService {
  private readonly AUTO_LINK_TERMS_URL = 'assets/data/auto-link-terms.json';
  private readonly FUNCTION_DOC_BASE_URL = 'https://transformation.pushtopic.com/#/docs/';
  private autoLinkTerms: { [key: string]: AutoLinkTerm } = {};
  private autoLinkTermsLoaded = false;
  private loadingTerms$ = new BehaviorSubject<boolean>(false);

  constructor(
    private http: HttpClient,
    private sanitizer: DomSanitizer
  ) {
    this.loadAutoLinkTerms();
  }

  /**
   * Load auto-link terms configuration
   */
  private loadAutoLinkTerms(): void {
    if (this.autoLinkTermsLoaded || this.loadingTerms$.value) {
      return;
    }

    this.loadingTerms$.next(true);
    
    this.http.get<AutoLinkTermsConfig>(this.AUTO_LINK_TERMS_URL)
      .pipe(
        tap(data => {
          if (data && data.terms) {
            this.autoLinkTerms = data.terms;
            this.autoLinkTermsLoaded = true;
            console.log(`✅ Loaded ${Object.keys(this.autoLinkTerms).length} auto-link terms`);
          }
        }),
        catchError(error => {
          console.error('❌ Failed to load auto-link terms:', error);
          return of({ terms: {} });
        })
      )
      .subscribe(() => {
        this.loadingTerms$.next(false);
      });
  }

  /**
   * Apply auto-link terms to HTML content string
   */
  public applyAutoLinkTerms(content: string): string {
    if (!this.autoLinkTermsLoaded || Object.keys(this.autoLinkTerms).length === 0) {
      return content;
    }
    
    // Sort terms by length (longest first) to avoid conflicts
    const sortedTerms = Object.keys(this.autoLinkTerms).sort((a, b) => b.length - a.length);
    
    let processedContent = content;
    
    sortedTerms.forEach(term => {
      const termConfig = this.autoLinkTerms[term];
      const resolvedUrl = this.resolveTermUrl(termConfig);
      
      if (!resolvedUrl) {
        console.warn(`❌ No URL found for term: ${term}`);
        return;
      }

      // Create regex pattern for the term - only match if every first letter is uppercase and exact match
      const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      
      // Check if term has proper capitalization (each word starts with uppercase)
      const words = term.split(/\s+/);
      const isProperlyCapitalized = words.every(word => 
        word.length > 0 && word[0] === word[0].toUpperCase()
      );
      
      if (!isProperlyCapitalized) {
        console.warn(`❌ Skipping term "${term}" - not properly capitalized`);
        return; // Skip terms that don't have proper capitalization
      }
      
      // Helper function to process a tag type (strong, b, or code)
      const processTag = (tagName: string) => {
        const pattern = new RegExp(`<${tagName}>([^<]*?)(${escapedTerm})([^<]*?)</${tagName}>`, 'g');
        
        processedContent = processedContent.replace(pattern, (fullMatch, beforeTerm, capturedTerm, afterTerm) => {
          // Check if the captured term exactly matches the expected term (case-sensitive)
          if (capturedTerm !== term) {
            return fullMatch; // Return unchanged if not exact match
          }
          
          // Check if this is the complete content of the tag (no extra text)
          const tagContent = beforeTerm + capturedTerm + afterTerm;
          if (tagContent !== term) {
            return fullMatch; // Return unchanged if tag contains more than just the term
          }
          
          // Replace the entire <tag>term</tag> with <tag><a>term</a></tag>
          // Using Lightning new_window utility icon with larger size
          const lightningIcon = `<span style="margin-left: -3px; vertical-align: text-top; opacity: 0.7;">
            <svg viewBox="0 0 24 24" fill="currentColor" style="width: 16px; height: 16px;">
              <path d="M19 19H5V5h7V3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.6l-9.8 9.8 1.4 1.4L19 6.4V10h2V3h-7z"/>
            </svg>
          </span>`;
          const linkData = termConfig.functionDoc ? `data-function-link="${termConfig.functionDoc}"` : `data-faq-link="${termConfig.faqLink}"`;
          const linkElement = `<a href="${resolvedUrl}" ${linkData} class="rules-engine-link" target="_blank" rel="noopener noreferrer">${capturedTerm}${lightningIcon}</a>`;
          const replacement = `<${tagName}>${linkElement}</${tagName}>`;
          return replacement;
        });
      };
      
      // Determine supported tags based on link type
      const supportedTags = termConfig.functionDoc 
        ? ['strong', 'b', 'code']  // Function docs support three tags
        : ['strong', 'b'];         // FAQ links support two tags
      
      // Process all supported tags
      supportedTags.forEach(tagName => {
        processTag(tagName);
      });
    });
    
    return processedContent;
  }

  /**
   * Resolve URL for a term configuration
   */
  private resolveTermUrl(termConfig: AutoLinkTerm): string {
    // Function documentation link
    if (termConfig.functionDoc) {
      // Convert function name to lowercase for URL
      return this.FUNCTION_DOC_BASE_URL + termConfig.functionDoc.toLowerCase();
    }
    
    // FAQ link
    if (termConfig.faqLink) {
      return getFAQUrlByKey(termConfig.faqLink);
    }
    
    return '';
  }

  /**
   * Apply auto-link terms to SafeHtml content
   */
  public applyAutoLinkTermsToSafeHtml(content: SafeHtml): SafeHtml {
    // Convert SafeHtml to string
    const htmlString = this.sanitizer.sanitize(1, content) || '';
    
    // Apply auto-link terms
    const processedContent = this.applyAutoLinkTerms(htmlString);
    
    // Return as SafeHtml
    return this.sanitizer.bypassSecurityTrustHtml(processedContent);
  }

  /**
   * Check if auto-link terms are loaded
   */
  public isLoaded(): boolean {
    return this.autoLinkTermsLoaded;
  }

  /**
   * Get loading state observable
   */
  public getLoadingState(): Observable<boolean> {
    return this.loadingTerms$.asObservable();
  }

  /**
   * Force reload auto-link terms
   */
  public reloadTerms(): void {
    this.autoLinkTermsLoaded = false;
    this.loadAutoLinkTerms();
  }

  /**
   * Get all configured auto-link terms
   */
  public getTerms(): { [key: string]: AutoLinkTerm } {
    return { ...this.autoLinkTerms };
  }
}