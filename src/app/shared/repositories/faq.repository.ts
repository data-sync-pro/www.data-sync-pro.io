import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { map, shareReplay, tap, catchError } from 'rxjs/operators';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

import { FAQDataService } from '../data-access/faq-data.service';
import {
  FAQItem,
  SourceFAQRecord,
  FAQCategory,
  SearchOptions,
  FAQStats,
  FAQFilter,
  FAQSortOptions,
} from '../models/faq.model';

/**
 * Repository pattern implementation for FAQ data
 * Handles data transformation, caching, and business logic
 */
@Injectable({
  providedIn: 'root',
})
export class FAQRepository {
  private readonly faqsCache$ = new BehaviorSubject<FAQItem[]>([]);
  private readonly contentCache = new Map<string, SafeHtml>();
  private readonly categoriesCache$ = new BehaviorSubject<FAQCategory[]>([]);
  private isInitialized = false;

  constructor(
    private readonly faqDataService: FAQDataService,
    private readonly sanitizer: DomSanitizer
  ) {
    this.initializeRepository();
  }

  /**
   * Get all FAQs
   */
  getFAQs(): Observable<FAQItem[]> {
    return this.faqsCache$.asObservable();
  }

  /**
   * Get FAQ by ID
   */
  getFAQById(id: string): Observable<FAQItem | undefined> {
    return this.getFAQs().pipe(map(faqs => faqs.find(faq => faq.id === id)));
  }

  /**
   * Get FAQs by category
   */
  getFAQsByCategory(category: string, subCategory?: string): Observable<FAQItem[]> {
    return this.getFAQs().pipe(map(faqs => this.filterByCategory(faqs, category, subCategory)));
  }

  /**
   * Search FAQs
   */
  searchFAQs(query: string, options: SearchOptions = {}): Observable<FAQItem[]> {
    if (!query.trim()) {
      return this.getFAQs();
    }

    return this.getFAQs().pipe(map(faqs => this.performSearch(faqs, query, options)));
  }

  /**
   * Get categories
   */
  getCategories(): Observable<FAQCategory[]> {
    return this.categoriesCache$.asObservable();
  }

  /**
   * Get FAQ content
   */
  getFAQContent(answerPath: string): Observable<SafeHtml> {
    if (!answerPath) {
      return of(this.sanitizer.bypassSecurityTrustHtml('<p>Content not available</p>'));
    }

    // Check cache
    if (this.contentCache.has(answerPath)) {
      return of(this.contentCache.get(answerPath)!);
    }

    return this.faqDataService.fetchFAQContent(answerPath).pipe(
      map(content => {
        const processedContent = this.processContent(content);
        const safeContent = this.sanitizer.bypassSecurityTrustHtml(processedContent);
        this.contentCache.set(answerPath, safeContent);
        return safeContent;
      }),
      catchError(() => {
        const errorContent = this.sanitizer.bypassSecurityTrustHtml(
          '<p class="error-message">Failed to load content, please try again later</p>'
        );
        return of(errorContent);
      })
    );
  }

  /**
   * Get FAQ statistics
   */
  getFAQStats(): Observable<FAQStats> {
    return this.getFAQs().pipe(map(faqs => this.calculateStats(faqs)));
  }

  /**
   * Apply filters to FAQs
   */
  applyFilters(filter: FAQFilter): Observable<FAQItem[]> {
    return this.getFAQs().pipe(map(faqs => this.filterFAQs(faqs, filter)));
  }

  /**
   * Sort FAQs
   */
  sortFAQs(faqs: FAQItem[], sortOptions: FAQSortOptions): FAQItem[] {
    return [...faqs].sort((a, b) => {
      const { field, direction } = sortOptions;
      const multiplier = direction === 'asc' ? 1 : -1;

      switch (field) {
        case 'question':
          return a.question.localeCompare(b.question) * multiplier;
        case 'category':
          return a.category.localeCompare(b.category) * multiplier;
        case 'viewCount':
          return ((a.viewCount || 0) - (b.viewCount || 0)) * multiplier;
        case 'lastUpdated':
          const dateA = a.lastUpdated?.getTime() || 0;
          const dateB = b.lastUpdated?.getTime() || 0;
          return (dateA - dateB) * multiplier;
        default:
          return 0;
      }
    });
  }

  /**
   * Clear content cache
   */
  clearContentCache(): void {
    this.contentCache.clear();
  }

  /**
   * Reload FAQs
   */
  reloadFAQs(): Observable<FAQItem[]> {
    this.isInitialized = false;
    this.clearContentCache();
    this.initializeRepository();
    return this.getFAQs();
  }

  /**
   * Initialize repository
   */
  private initializeRepository(): void {
    if (this.isInitialized) {
      return;
    }

    this.faqDataService
      .fetchFAQData()
      .pipe(
        map(sourceData => this.transformSourceData(sourceData)),
        tap(faqs => {
          this.faqsCache$.next(faqs);
          this.categoriesCache$.next(this.buildCategories(faqs));
          this.isInitialized = true;
        }),
        shareReplay(1)
      )
      .subscribe({
        error: error => {
          console.error('Failed to initialize FAQ repository:', error);
          this.faqsCache$.next([]);
          this.categoriesCache$.next([]);
        },
      });
  }

  /**
   * Transform source data to FAQ items
   */
  private transformSourceData(sourceData: SourceFAQRecord[]): FAQItem[] {
    return sourceData.map(record => ({
      id: record.Id,
      question: record.Question__c,
      answer: record.Answer__c || '',
      answerPath: record.Answer__c || undefined,
      category: record.Category__c,
      subCategory: record.SubCategory__c,
      isExpanded: false,
      viewCount: 0,
      isPopular: false,
      tags: this.generateTags(record),
      lastUpdated: new Date(),
    }));
  }

  /**
   * Generate tags from FAQ record
   */
  private generateTags(record: SourceFAQRecord): string[] {
    const tags = [record.Category__c];
    if (record.SubCategory__c) {
      tags.push(record.SubCategory__c);
    }
    return tags;
  }

  /**
   * Build categories from FAQs
   */
  private buildCategories(faqs: FAQItem[]): FAQCategory[] {
    const categoryMap = new Map<string, { count: number; subCategories: Set<string> }>();

    faqs.forEach(faq => {
      if (!categoryMap.has(faq.category)) {
        categoryMap.set(faq.category, { count: 0, subCategories: new Set() });
      }

      const categoryData = categoryMap.get(faq.category)!;
      categoryData.count++;

      if (faq.subCategory) {
        categoryData.subCategories.add(faq.subCategory);
      }
    });

    return Array.from(categoryMap.entries()).map(([name, data]) => ({
      name,
      count: data.count,
      subCategories: Array.from(data.subCategories).map(subName => ({
        name: subName,
        count: faqs.filter(f => f.category === name && f.subCategory === subName).length,
        parentCategory: name,
      })),
    }));
  }

  /**
   * Filter FAQs by category
   */
  private filterByCategory(faqs: FAQItem[], category: string, subCategory?: string): FAQItem[] {
    return faqs.filter(faq => {
      const categoryMatch = faq.category === category;
      const subCategoryMatch = !subCategory || faq.subCategory === subCategory;
      return categoryMatch && subCategoryMatch;
    });
  }

  /**
   * Perform search on FAQs
   */
  private performSearch(faqs: FAQItem[], query: string, options: SearchOptions): FAQItem[] {
    const lowerQuery = query.toLowerCase();
    const { category, subCategory, includeAnswers = true, maxResults = 50 } = options;

    let filteredFAQs = faqs;

    // Apply category filters
    if (category) {
      filteredFAQs = this.filterByCategory(filteredFAQs, category, subCategory);
    }

    // Apply search query
    const searchResults = filteredFAQs.filter(faq => {
      const questionMatch = faq.question.toLowerCase().includes(lowerQuery);
      const categoryMatch = faq.category.toLowerCase().includes(lowerQuery);
      const subCategoryMatch = faq.subCategory?.toLowerCase().includes(lowerQuery) || false;
      const answerMatch = includeAnswers && faq.answer.toLowerCase().includes(lowerQuery);

      return questionMatch || categoryMatch || subCategoryMatch || answerMatch;
    });

    return searchResults.slice(0, maxResults);
  }

  /**
   * Filter FAQs based on filter criteria
   */
  private filterFAQs(faqs: FAQItem[], filter: FAQFilter): FAQItem[] {
    return faqs.filter(faq => {
      // Category filter
      if (filter.categories.length > 0 && !filter.categories.includes(faq.category)) {
        return false;
      }

      // Sub-category filter
      if (
        filter.subCategories.length > 0 &&
        (!faq.subCategory || !filter.subCategories.includes(faq.subCategory))
      ) {
        return false;
      }

      // Search query filter
      if (filter.searchQuery) {
        const query = filter.searchQuery.toLowerCase();
        const matches =
          faq.question.toLowerCase().includes(query) ||
          faq.answer.toLowerCase().includes(query) ||
          faq.category.toLowerCase().includes(query) ||
          (faq.subCategory && faq.subCategory.toLowerCase().includes(query));
        if (!matches) {
          return false;
        }
      }

      // Popular filter
      if (filter.showPopularOnly && !faq.isPopular) {
        return false;
      }

      // Date range filter
      if (filter.dateRange && faq.lastUpdated) {
        const faqDate = faq.lastUpdated.getTime();
        const startDate = filter.dateRange.start.getTime();
        const endDate = filter.dateRange.end.getTime();
        if (faqDate < startDate || faqDate > endDate) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Calculate FAQ statistics
   */
  private calculateStats(faqs: FAQItem[]): FAQStats {
    const categories = new Set(faqs.map(f => f.category));
    const subCategories = new Set(faqs.map(f => f.subCategory).filter(Boolean));

    return {
      totalFAQs: faqs.length,
      totalCategories: categories.size,
      totalSubCategories: subCategories.size,
      mostViewedFAQs: faqs
        .filter(f => f.viewCount && f.viewCount > 0)
        .sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0))
        .slice(0, 5),
      recentlyUpdated: faqs
        .filter(f => f.lastUpdated)
        .sort((a, b) => (b.lastUpdated?.getTime() || 0) - (a.lastUpdated?.getTime() || 0))
        .slice(0, 5),
    };
  }

  /**
   * Process content for display
   */
  private processContent(content: string): string {
    // Basic content processing
    return content.replace(/\n/g, '<br>').replace(/\t/g, '&nbsp;&nbsp;&nbsp;&nbsp;');
  }
}
