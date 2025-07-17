import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, of, throwError } from 'rxjs';
import { map, catchError, shareReplay, tap, finalize } from 'rxjs/operators';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { PerformanceService } from './performance.service';
import { getFAQUrlByKey } from '../config/faq-urls.config';

import {
  SourceFAQRecord,
  FAQItem,
  FAQCategory,
  FAQSubCategory,
  SearchOptions,
  FAQStats,
  FAQFilter,
  FAQSortOptions
} from '../models/faq.model';

@Injectable({
  providedIn: 'root'
})
export class FAQService {
  private readonly FAQ_DATA_URL = 'assets/data/faqs.json';
  private readonly FAQ_CONTENT_BASE = 'assets/faq-item/';
  private readonly AUTO_LINK_TERMS_URL = 'assets/data/auto-link-terms.json';
  
  // Cache
  private faqsCache$ = new BehaviorSubject<FAQItem[]>([]);
  private contentCache = new Map<string, SafeHtml>();
  private categoriesCache: FAQCategory[] = [];
  private autoLinkTerms: { [key: string]: any } = {};
  private autoLinkTermsLoaded = false;
  
  // Local Storage Cache Keys
  private readonly STORAGE_KEY_FAQ_CONTENT = 'faq_content_cache';
  private readonly STORAGE_KEY_FAQ_METADATA = 'faq_metadata_cache';
  private readonly STORAGE_KEY_POPULAR_FAQS = 'popular_faqs_cache';
  private readonly CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

  // Loading state
  private isLoading = false;
  private isInitialized = false;

  // Preloading
  private preloadingQueue = new Set<string>();
  private intersectionObserver?: IntersectionObserver;
  private readonly PRELOAD_THRESHOLD = 0.1; // Start preloading when item is 10% visible

  constructor(
    private http: HttpClient,
    private sanitizer: DomSanitizer,
    private performanceService: PerformanceService
  ) {
    this.initializeService();
    this.initializeIntersectionObserver();
    this.loadFromLocalStorage();
  }

  /**
   * Initialize service
   */
  private initializeService(): void {
    if (!this.isInitialized) {
      this.loadFAQs();
      this.loadAutoLinkTerms();
      this.isInitialized = true;
    }
  }

  /**
   * Load auto-link terms configuration
   */
  private loadAutoLinkTerms(): void {
    console.log('Loading auto-link terms from:', this.AUTO_LINK_TERMS_URL);
    this.http.get<any>(this.AUTO_LINK_TERMS_URL).pipe(
      catchError(error => {
        console.warn('Could not load auto-link terms configuration:', error);
        return of({ terms: {} });
      })
    ).subscribe(config => {
      this.autoLinkTerms = config.terms || {};
      this.autoLinkTermsLoaded = true;
      console.log('Auto-link terms loaded successfully:', this.autoLinkTerms);
      console.log('Number of terms loaded:', Object.keys(this.autoLinkTerms).length);
      console.log('Auto-link terms loading complete, flag set to:', this.autoLinkTermsLoaded);
    });
  }

  /**
   * Load cached content from local storage
   */
  private loadFromLocalStorage(): void {
    try {
      const cachedContent = localStorage.getItem(this.STORAGE_KEY_FAQ_CONTENT);
      if (cachedContent) {
        const parsedCache = JSON.parse(cachedContent);
        Object.entries(parsedCache).forEach(([key, value]: [string, any]) => {
          if (this.isCacheValid(value.timestamp)) {
            // Store raw content - processing will happen in getFAQContent when needed
            this.contentCache.set(key, this.sanitizer.bypassSecurityTrustHtml(value.content));
          }
        });
      }
    } catch (error) {
      console.warn('Failed to load FAQ content from local storage:', error);
    }
  }

  /**
   * Save content to local storage
   */
  private saveToLocalStorage(answerPath: string, content: string): void {
    try {
      const existingCache = localStorage.getItem(this.STORAGE_KEY_FAQ_CONTENT);
      const cache = existingCache ? JSON.parse(existingCache) : {};
      
      cache[answerPath] = {
        content,
        timestamp: Date.now()
      };

      localStorage.setItem(this.STORAGE_KEY_FAQ_CONTENT, JSON.stringify(cache));
    } catch (error) {
      console.warn('Failed to save FAQ content to local storage:', error);
    }
  }

  /**
   * Check if cached item is still valid
   */
  private isCacheValid(timestamp: number): boolean {
    return Date.now() - timestamp < this.CACHE_TTL;
  }

  /**
   * Clean expired cache entries
   */
  private cleanExpiredCache(): void {
    try {
      const cachedContent = localStorage.getItem(this.STORAGE_KEY_FAQ_CONTENT);
      if (cachedContent) {
        const cache = JSON.parse(cachedContent);
        const cleanedCache: any = {};
        
        Object.entries(cache).forEach(([key, value]: [string, any]) => {
          if (this.isCacheValid(value.timestamp)) {
            cleanedCache[key] = value;
          }
        });
        
        localStorage.setItem(this.STORAGE_KEY_FAQ_CONTENT, JSON.stringify(cleanedCache));
      }
    } catch (error) {
      console.warn('Failed to clean expired cache:', error);
    }
  }

  /**
   * Warm cache for popular FAQs
   */
  warmCacheForPopularFAQs(popularFaqIds: string[]): void {
    this.getFAQs().pipe(
      map(faqs => faqs.filter(faq => popularFaqIds.includes(faq.id))),
      tap(popularFaqs => {
        popularFaqs.forEach(faq => {
          if (faq.answerPath && !this.contentCache.has(faq.answerPath)) {
            this.preloadContent(faq.answerPath);
          }
        });
      })
    ).subscribe();
  }

  /**
   * Initialize intersection observer for content preloading
   */
  private initializeIntersectionObserver(): void {
    if (typeof window !== 'undefined' && 'IntersectionObserver' in window) {
      this.intersectionObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              const faqId = entry.target.getAttribute('data-faq-id');
              const answerPath = entry.target.getAttribute('data-answer-path');
              
              if (faqId && answerPath && !this.contentCache.has(answerPath)) {
                this.preloadContent(answerPath);
              }
            }
          });
        },
        {
          threshold: this.PRELOAD_THRESHOLD,
          rootMargin: '100px 0px' // Start preloading 100px before element enters viewport
        }
      );
    }
  }

  /**
   * Observe FAQ element for preloading
   */
  observeForPreloading(element: Element, faqId: string, answerPath: string): void {
    if (this.intersectionObserver && answerPath && !this.contentCache.has(answerPath)) {
      element.setAttribute('data-faq-id', faqId);
      element.setAttribute('data-answer-path', answerPath);
      this.intersectionObserver.observe(element);
    }
  }

  /**
   * Stop observing element
   */
  unobserveElement(element: Element): void {
    if (this.intersectionObserver) {
      this.intersectionObserver.unobserve(element);
    }
  }

  /**
   * Preload FAQ content in background
   */
  private preloadContent(answerPath: string): void {
    if (this.preloadingQueue.has(answerPath) || this.contentCache.has(answerPath)) {
      return;
    }

    this.preloadingQueue.add(answerPath);
    
    const fullPath = `${this.FAQ_CONTENT_BASE}${answerPath}`;
    this.http.get(fullPath, { responseType: 'text' }).pipe(
      map(content => {
        const processedContent = this.processContent(content);
        const safeContent = this.sanitizer.bypassSecurityTrustHtml(processedContent);
        
        // Save to local storage for future use
        this.saveToLocalStorage(answerPath, processedContent);
        
        return safeContent;
      }),
      catchError(error => {
        console.warn(`Failed to preload FAQ content: ${fullPath}`, error);
        return of(null);
      })
    ).subscribe(safeContent => {
      this.preloadingQueue.delete(answerPath);
      if (safeContent) {
        this.contentCache.set(answerPath, safeContent);
      }
    });
  }

  /**
   * Get all FAQs
   */
  getFAQs(): Observable<FAQItem[]> {
    return this.faqsCache$.asObservable();
  }

  /**
   * 获取FAQ总数
   */
  getFAQCount(): Observable<number> {
    return this.getFAQs().pipe(
      map(faqs => faqs.length)
    );
  }

  /**
   * 根据ID获取单个FAQ
   */
  getFAQById(id: string): Observable<FAQItem | undefined> {
    return this.getFAQs().pipe(
      map(faqs => faqs.find(faq => faq.id === id))
    );
  }

  /**
   * 根据分类筛选FAQ
   */
  getFAQsByCategory(category: string, subCategory?: string): Observable<FAQItem[]> {
    return this.getFAQs().pipe(
      map(faqs => faqs.filter(faq => {
        const categoryMatch = faq.category === category;
        const subCategoryMatch = !subCategory || faq.subCategory === subCategory;
        return categoryMatch && subCategoryMatch;
      }))
    );
  }

  searchFAQs(query: string, options: SearchOptions = {}): Observable<FAQItem[]> {
    if (!query.trim()) {
      return this.getFAQs();
    }

    return this.performanceService.measure('faq-search', () => {
      return this.getFAQs().pipe(
        map(faqs => this.filterFAQs(faqs, query, options))
      );
    }) as Observable<FAQItem[]>;
  }

  getSearchSuggestions(query: string, maxSuggestions = 8): Observable<string[]> {
    if (!query.trim() || query.length < 2) {
      return of([]);
    }

    return this.getFAQs().pipe(
      map(faqs => {
        const lowerQuery = query.toLowerCase();
        const suggestions = new Set<string>();

        faqs.forEach(faq => {
          if (faq.question.toLowerCase().includes(lowerQuery)) {
            suggestions.add(faq.question);
          }
          if (faq.category.toLowerCase().includes(lowerQuery)) {
            suggestions.add(faq.category);
          }
          if (faq.subCategory?.toLowerCase().includes(lowerQuery)) {
            suggestions.add(faq.subCategory);
          }
        });

        return Array.from(suggestions).slice(0, maxSuggestions);
      })
    );
  }

  private filterFAQs(faqs: FAQItem[], query: string, options: SearchOptions): FAQItem[] {
    const lowerQuery = query.toLowerCase();
    let filtered = faqs.filter(faq => this.matchesFAQ(faq, lowerQuery, options));

    if (options.category) {
      filtered = filtered.filter(faq => faq.category === options.category);
    }

    if (options.subCategory) {
      filtered = filtered.filter(faq => faq.subCategory === options.subCategory);
    }

    if (options.maxResults) {
      filtered = filtered.slice(0, options.maxResults);
    }

    return filtered;
  }

  private matchesFAQ(faq: FAQItem, lowerQuery: string, options: SearchOptions): boolean {
    const questionMatch = faq.question.toLowerCase().includes(lowerQuery);
    const categoryMatch = faq.category.toLowerCase().includes(lowerQuery);
    const subCategoryMatch = faq.subCategory?.toLowerCase().includes(lowerQuery);
    const tagsMatch = faq.tags?.some(tag => tag.toLowerCase().includes(lowerQuery));
    
    let answerMatch = false;
    if (options.includeAnswers && faq.answer) {
      answerMatch = faq.answer.toLowerCase().includes(lowerQuery);
    }

    return questionMatch || categoryMatch || subCategoryMatch || tagsMatch || answerMatch;
  }

  /**
   * 获取FAQ内容
   */
  getFAQContent(answerPath: string): Observable<SafeHtml> {
    if (!answerPath) {
      console.warn('FAQ content requested with empty answerPath');
      return of(this.sanitizer.bypassSecurityTrustHtml('<p class="error-message">Content path not specified</p>'));
    }

    // Check memory cache first - but always reprocess for auto-links if terms are loaded
    if (this.contentCache.has(answerPath)) {
      console.log('FAQ content loaded from cache:', answerPath);
      
      // If auto-link terms are loaded, we need to reprocess the cached content
      if (this.autoLinkTermsLoaded && Object.keys(this.autoLinkTerms).length > 0) {
        console.log('Auto-link terms are loaded, reprocessing cached content for:', answerPath);
        
        // Get the raw content from local storage to reprocess
        try {
          const cachedContent = localStorage.getItem(this.STORAGE_KEY_FAQ_CONTENT);
          if (cachedContent) {
            const parsedCache = JSON.parse(cachedContent);
            const cacheEntry = parsedCache[answerPath];
            
            if (cacheEntry && this.isCacheValid(cacheEntry.timestamp)) {
              console.log('Reprocessing cached content with auto-links');
              const processedContent = this.processContent(cacheEntry.content);
              const safeContent = this.sanitizer.bypassSecurityTrustHtml(processedContent);
              
              // Update memory cache with processed content
              this.contentCache.set(answerPath, safeContent);
              return of(safeContent);
            }
          }
        } catch (error) {
          console.warn('Failed to reprocess cached content:', error);
        }
      }
      
      // Return cached content if no reprocessing needed
      return of(this.contentCache.get(answerPath)!);
    }

    const startTime = performance.now();
    const fullPath = `${this.FAQ_CONTENT_BASE}${answerPath}`;
    
    return this.http.get(fullPath, { responseType: 'text' }).pipe(
      map(content => {
        const processedContent = this.processContent(content);
        const safeContent = this.sanitizer.bypassSecurityTrustHtml(processedContent);

        // Cache content in memory and local storage
        this.contentCache.set(answerPath, safeContent);
        this.saveToLocalStorage(answerPath, content); // Save raw content to local storage
        
        // Track performance
        const loadTime = performance.now() - startTime;
        this.performanceService.trackCustomMetric('faqContentLoadTime', loadTime);
        
        return safeContent;
      }),
      catchError(error => {
        console.error(`Failed to load FAQ content: ${fullPath}`, error);
        const errorContent = this.sanitizer.bypassSecurityTrustHtml(
          `<div class="error-message">
            <p><strong>Failed to load content</strong></p>
            <p>Path: ${fullPath}</p>
            <p>Error: ${error.message || 'Unknown error'}</p>
            <button onclick="window.location.reload()" style="margin-top: 10px; padding: 8px 16px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">Reload Page</button>
          </div>`
        );
        return of(errorContent);
      })
    );
  }

  /**
   * Get categories list
   */
  getCategories(): Observable<FAQCategory[]> {
    if (this.categoriesCache.length > 0) {
      return of(this.categoriesCache);
    }

    return this.getFAQs().pipe(
      map(faqs => {
        const categoryMap = new Map<string, FAQCategory>();
        
        faqs.forEach(faq => {
          if (!categoryMap.has(faq.category)) {
            categoryMap.set(faq.category, {
              name: faq.category,
              count: 0,
              subCategories: []
            });
          }
          
          const category = categoryMap.get(faq.category)!;
          category.count++;
          
          if (faq.subCategory) {
            const existingSub = category.subCategories.find(sub => sub.name === faq.subCategory);
            if (existingSub) {
              existingSub.count++;
            } else {
              category.subCategories.push({
                name: faq.subCategory,
                count: 1,
                parentCategory: faq.category
              });
            }
          }
        });
        
        this.categoriesCache = Array.from(categoryMap.values());
        return this.categoriesCache;
      }),
      shareReplay(1)
    );
  }

  /**
   * 获取热门FAQ
   */
  getTrendingFAQs(ids: string[]): Observable<FAQItem[]> {
    return this.getFAQs().pipe(
      map(faqs => {
        const faqMap = new Map(faqs.map(faq => [faq.id, faq]));
        return ids
          .map(id => faqMap.get(id))
          .filter(Boolean) as FAQItem[];
      })
    );
  }

  /**
   * 获取FAQ统计信息
   */
  getFAQStats(): Observable<FAQStats> {
    return this.getFAQs().pipe(
      map(faqs => {
        const categories = new Set(faqs.map(faq => faq.category));
        const subCategories = new Set(
          faqs.map(faq => faq.subCategory).filter(Boolean)
        );

        const mostViewed = faqs
          .filter(faq => faq.viewCount && faq.viewCount > 0)
          .sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0))
          .slice(0, 5);

        return {
          totalFAQs: faqs.length,
          totalCategories: categories.size,
          totalSubCategories: subCategories.size,
          mostViewedFAQs: mostViewed,
          recentlyUpdated: []
        };
      })
    );
  }

  /**
   * 更新FAQ项目
   */
  updateFAQItem(id: string, updates: Partial<FAQItem>): void {
    const currentFAQs = this.faqsCache$.value;
    const updatedFAQs = currentFAQs.map(faq => 
      faq.id === id ? { ...faq, ...updates } : faq
    );
    this.faqsCache$.next(updatedFAQs);
  }

  /**
   * 清除内容缓存
   */
  clearContentCache(): void {
    this.contentCache.clear();
    // Also clear localStorage cache
    try {
      localStorage.removeItem(this.STORAGE_KEY_FAQ_CONTENT);
      console.log('FAQ content cache cleared from localStorage');
    } catch (error) {
      console.warn('Failed to clear FAQ content from localStorage:', error);
    }
  }

  /**
   * 重新加载FAQ数据
   */
  reloadFAQs(): Observable<FAQItem[]> {
    this.categoriesCache = [];
    this.clearContentCache();
    this.loadFAQs();
    return this.getFAQs();
  }

  /**
   * Private method: Load FAQ data
   */
  private loadFAQs(): void {
    if (this.isLoading) return;
    
    this.isLoading = true;
    this.http.get<SourceFAQRecord[]>(this.FAQ_DATA_URL).pipe(
      map(records => records.map(record => this.transformToFAQItem(record))),
      catchError(error => {
        console.error('Failed to load FAQ data', error);
        return of([]);
      }),
      finalize(() => this.isLoading = false)
    ).subscribe(faqs => {
      this.faqsCache$.next(faqs);
    });
  }

  /**
   * Private method: Transform raw data to FAQ item
   */
  private transformToFAQItem(record: SourceFAQRecord): FAQItem {
    return {
      id: record.Id,
      question: record.Question__c || '',
      answer: '',
      answerPath: record.Answer__c || '',
      category: record.Category__c || '',
      subCategory: record.SubCategory__c,
      isExpanded: false,
      userRating: null,
      viewCount: 0,
      isPopular: false,
      isLoading: false,
      tags: record.SubCategory__c ?
        [record.Category__c, record.SubCategory__c] :
        [record.Category__c],
      lastUpdated: new Date()
    };
  }

  /**
   * Check if browser supports WebP format
   */
  private supportsWebP(): boolean {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
  }

  /**
   * Convert image source to WebP if supported and available
   */
  private getOptimizedImageSrc(originalSrc: string): string {
    if (!this.supportsWebP()) {
      return originalSrc;
    }

    // Convert common image extensions to WebP variants
    const webpSrc = originalSrc
      .replace(/\.(jpg|jpeg|png)$/i, '.webp')
      .replace(/\.(jpg|jpeg|png)\?/i, '.webp?');

    return webpSrc;
  }

  /**
   * Create responsive image with proper error handling
   */
  private createResponsiveImage(src: string, attrs: string): string {
    // Extract alt text
    const altMatch = attrs.match(/alt="([^"]*)"/);
    const alt = altMatch ? altMatch[1] : 'FAQ Image';
    
    // Normalize the image source URL
    let normalizedSrc = src;
    
    // Handle different URL patterns
    if (src.startsWith('http') || src.startsWith('//')) {
      // External URL - use as is
      normalizedSrc = src;
    } else if (src.startsWith('/')) {
      // Absolute path - use as is
      normalizedSrc = src;
    } else if (src.startsWith('assets/')) {
      // Already correctly formatted - ensure proper path
      normalizedSrc = src;
    } else {
      // Relative path - ensure it starts with assets/
      normalizedSrc = `assets/${src}`;
    }
    
    console.log(`Processing image: ${src} -> ${normalizedSrc}`);
    
    // Enhanced error handling with better visual feedback
    const onErrorHandler = `
      console.error('Failed to load image:', this.src);
      console.error('Image absolute URL:', new URL(this.src, window.location.href).href);
      this.parentElement.style.display = 'block';
      this.parentElement.style.padding = '20px';
      this.parentElement.style.backgroundColor = '#fff3cd';
      this.parentElement.style.border = '2px dashed #ffeaa7';
      this.parentElement.style.borderRadius = '8px';
      this.parentElement.style.textAlign = 'center';
      this.parentElement.style.color = '#856404';
      this.parentElement.style.fontStyle = 'italic';
      this.parentElement.innerHTML = '🖼️ Image could not be loaded<br><small>Path: ' + this.src + '</small><br><small>Full URL: ' + new URL(this.src, window.location.href).href + '</small>';
    `;

    // Create container with better structure
    return `<div class="faq-picture">
      <img 
        src="${normalizedSrc}" 
        alt="${alt}"
        class="faq-image"
        style="display: block; margin: 20px auto; max-width: 100%; height: auto; border-radius: 8px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1); transition: transform 0.3s ease;"
        loading="lazy"
        onerror="${onErrorHandler}"
        onload="console.log('Image loaded successfully:', this.src); this.parentElement.classList.add('image-loaded');"
      >
    </div>`;
  }

  /**
   * Private method: Processes FAQ content
   */
  private processContent(content: string): string {
    
    let processedContent = content
      // Remove empty p tags but preserve content structure
      .replace(/<p[^>]*>\s*<\/p>/g, '')
      // Improve content formatting
      .replace(/<section[^>]*>/g, '<div class="faq-section">')
      .replace(/<\/section>/g, '</div>')
      // Process FAQ internal links with centralized URL management
      .replace(/<a([^>]*?)href="([^"]*)"([^>]*?)>/g, (match, beforeHref, href, afterHref) => {
        // Check if this is an internal FAQ link
        if (href.startsWith('/') && !href.startsWith('http')) {
          // Check if there's a data-faq-link attribute
          const faqLinkMatch = match.match(/data-faq-link="([^"]*)"/);
          if (faqLinkMatch) {
            const linkKey = faqLinkMatch[1];
            const resolvedUrl = getFAQUrlByKey(linkKey);
            if (resolvedUrl) {
              // Replace the href with the resolved URL, preserve existing classes
              return `<a${beforeHref}href="${resolvedUrl}"${afterHref}>`;
            }
          }
          
          // Only add faq-internal-link class if no existing class is present
          const hasClass = beforeHref.includes('class=') || afterHref.includes('class=');
          if (!hasClass) {
            return `<a${beforeHref}href="${href}"${afterHref} class="faq-internal-link">`;
          }
        }
        return match;
      })
      // Enhanced image processing with better URL handling
      .replace(/<img([^>]*?)>/g, (match, attrs) => {
        const srcMatch = attrs.match(/src="([^"]*)"/);
        if (!srcMatch) {
          console.warn('Image tag without src attribute:', match);
          return match;
        }

        const originalSrc = srcMatch[1];

        // Handle specific problematic URLs
        if (originalSrc.includes('undefined') || originalSrc.trim() === '') {
          console.warn('Invalid image src detected:', originalSrc);
          return `<div class="faq-picture image-error">
            <div style="padding: 20px; background: #f8f9fa; border: 2px dashed #dee2e6; border-radius: 8px; text-align: center; color: #6c757d; font-style: italic;">
              🖼️ Invalid image URL detected
            </div>
          </div>`;
        }

        return this.createResponsiveImage(originalSrc, attrs);
      });
      
    // Apply auto-link terms after all other processing
    processedContent = this.applyAutoLinkTerms(processedContent);
    
    // Clean up extra whitespace but preserve line breaks in content
    // Be careful not to break HTML attributes
    return processedContent
      .replace(/\n\s*\n/g, '\n')
      .trim();
  }

  /**
   * Apply auto-link terms to content
   */
  private applyAutoLinkTerms(content: string): string {
    if (!this.autoLinkTerms || Object.keys(this.autoLinkTerms).length === 0) {
      return content;
    }
    
    console.log('🔗 Applying auto-links for', Object.keys(this.autoLinkTerms).length, 'terms');

    // Sort terms by length (longest first) to avoid conflicts
    const sortedTerms = Object.keys(this.autoLinkTerms).sort((a, b) => b.length - a.length);
    
    let processedContent = content;
    
    sortedTerms.forEach(term => {
      const termConfig = this.autoLinkTerms[term];
      const faqLink = termConfig.faqLink;
      const resolvedUrl = getFAQUrlByKey(faqLink);
      
      if (!resolvedUrl) {
        console.warn(`❌ No URL found for term: ${term}`);
        return;
      }

      // Create regex pattern for the term
      const flags = termConfig.caseSensitive ? 'g' : 'gi';
      const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      
      // Simple word boundary pattern - avoid complex lookbehinds
      const pattern = new RegExp(`\\b(${escapedTerm})\\b`, flags);
      
      processedContent = processedContent.replace(pattern, (match, capturedTerm, offset, fullString) => {
        // Check if this match is inside an existing link or HTML tag
        const beforeMatch = fullString.substring(0, offset);
        const afterMatch = fullString.substring(offset + match.length);
        
        // Improved link detection - check if we're actually inside a link element
        const beforeText = fullString.substring(0, offset);
        const afterText = fullString.substring(offset);
        
        // Find the last <a> tag before this position
        const lastOpenLink = beforeText.lastIndexOf('<a');
        const lastCloseLink = beforeText.lastIndexOf('</a>');
        
        // Only skip if we're actually between an unclosed <a> and its corresponding </a>
        if (lastOpenLink > lastCloseLink && lastOpenLink !== -1) {
          // Check if there's a closing </a> after this position
          const nextCloseLink = afterText.indexOf('</a>');
          if (nextCloseLink !== -1) {
            return match; // Skip - genuinely inside existing link
          }
        }
        
        // Skip if inside an HTML tag
        const lastTagStart = beforeMatch.lastIndexOf('<');
        const lastTagEnd = beforeMatch.lastIndexOf('>');
        if (lastTagStart > lastTagEnd && lastTagStart !== -1) {
          return match; // Keep original, we're inside a tag
        }
        
        // Skip if this term is already part of a link attribute
        if (beforeMatch.includes('href="') && !beforeMatch.includes('"', beforeMatch.lastIndexOf('href="') + 6)) {
          return match;
        }
        
        // Create the link
        const replacement = `<a href="${resolvedUrl}" data-faq-link="${faqLink}" class="rules-engine-link" target="_blank" rel="noopener noreferrer">${capturedTerm}<span class="new-window-icon"></span></a>`;
        console.log(`✅ Created link: ${capturedTerm}`);
        return replacement;
      });
      
      // Count successful replacements
      const matches = processedContent.match(new RegExp(`<a[^>]*>${escapedTerm}<span`, 'gi'));
      if (matches && matches.length > 0) {
        console.log(`🔗 ${term}: ${matches.length} link(s) created`);
      }
    });
    
    return processedContent;
  }

  /**
   * Debug method to test URL resolution manually
   */
  public testUrlResolution(): void {
    console.log('=== Testing URL Resolution ===');
    console.log('Auto-link terms:', this.autoLinkTerms);
    
    const testTerms = ['batch', 'triggers', 'input', 'preview'];
    testTerms.forEach(term => {
      const config = this.autoLinkTerms[term];
      if (config) {
        const url = getFAQUrlByKey(config.faqLink);
        console.log(`${term} -> ${config.faqLink} -> ${url}`);
      } else {
        console.log(`${term} -> NOT FOUND in auto-link terms`);
      }
    });
  }
}
