import { Injectable } from '@angular/core';
import { Observable, combineLatest, of } from 'rxjs';
import { map, debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { SafeHtml } from '@angular/platform-browser';

import { FAQRepository } from '../repositories/faq.repository';
import {
  FAQItem,
  FAQCategory,
  SearchOptions,
  FAQStats,
  FAQFilter,
  FAQSortOptions,
  SearchSuggestion,
  UserPreferences,
  FAQEvent,
  RenderStrategy,
  DeviceType,
  ConnectionSpeed,
} from '../models/faq.model';

/**
 * Business Logic Layer for FAQ operations
 * Handles complex business rules, analytics, and user interactions
 */
@Injectable({
  providedIn: 'root',
})
export class FAQBusinessService {
  private readonly SEARCH_DEBOUNCE_TIME = 300;
  private readonly MAX_SEARCH_SUGGESTIONS = 8;
  private readonly POPULAR_FAQ_THRESHOLD = 10;

  constructor(private readonly faqRepository: FAQRepository) {}

  /**
   * Get FAQs with business logic applied
   */
  getFAQsWithBusinessLogic(preferences?: UserPreferences): Observable<FAQItem[]> {
    return this.faqRepository
      .getFAQs()
      .pipe(map(faqs => this.applyBusinessRules(faqs, preferences)));
  }

  /**
   * Get intelligent search suggestions
   */
  getSearchSuggestions(query: string): Observable<SearchSuggestion[]> {
    if (!query.trim() || query.length < 2) {
      return of([]);
    }

    return this.faqRepository.getFAQs().pipe(
      debounceTime(this.SEARCH_DEBOUNCE_TIME),
      distinctUntilChanged(),
      map(faqs => this.generateSearchSuggestions(faqs, query))
    );
  }

  /**
   * Perform intelligent search with ranking
   */
  performIntelligentSearch(query: string, options: SearchOptions = {}): Observable<FAQItem[]> {
    return this.faqRepository
      .searchFAQs(query, options)
      .pipe(map(results => this.rankSearchResults(results, query)));
  }

  /**
   * Get recommended FAQs based on user behavior
   */
  getRecommendedFAQs(userId?: string, recentlyViewed?: string[]): Observable<FAQItem[]> {
    return this.faqRepository
      .getFAQs()
      .pipe(map(faqs => this.generateRecommendations(faqs, userId, recentlyViewed)));
  }

  /**
   * Get trending FAQs
   */
  getTrendingFAQs(): Observable<FAQItem[]> {
    return this.faqRepository.getFAQs().pipe(
      map(faqs =>
        faqs
          .filter(faq => (faq.viewCount || 0) >= this.POPULAR_FAQ_THRESHOLD)
          .sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0))
          .slice(0, 10)
      )
    );
  }

  /**
   * Get optimal render strategy based on device and data
   */
  getOptimalRenderStrategy(
    deviceType: DeviceType,
    connectionSpeed: ConnectionSpeed,
    dataSize: number
  ): RenderStrategy {
    // Mobile with slow connection and large dataset
    if (deviceType === 'mobile' && connectionSpeed === 'slow' && dataSize > 100) {
      return 'virtual';
    }

    // Large dataset on any device
    if (dataSize > 500) {
      return 'virtual';
    }

    // Medium dataset
    if (dataSize > 50) {
      return 'paginated';
    }

    // Small dataset or fast connection
    return 'basic';
  }

  /**
   * Track FAQ interaction
   */
  trackFAQInteraction(event: FAQEvent): void {
    // In a real application, this would send analytics data
    console.log('FAQ Interaction:', event);

    // Update view count if it's a view event
    if (event.type === 'view' && event.faqId) {
      this.incrementViewCount(event.faqId);
    }
  }

  /**
   * Get FAQ analytics data
   */
  getFAQAnalytics(): Observable<FAQStats> {
    return this.faqRepository.getFAQStats();
  }

  /**
   * Apply advanced filters with business logic
   */
  applyAdvancedFilters(filter: FAQFilter): Observable<FAQItem[]> {
    return this.faqRepository
      .applyFilters(filter)
      .pipe(map(faqs => this.applyBusinessFilters(faqs, filter)));
  }

  /**
   * Get FAQ content with preprocessing
   */
  getFAQContentWithProcessing(answerPath: string): Observable<SafeHtml> {
    return this.faqRepository.getFAQContent(answerPath);
  }

  /**
   * Validate FAQ data integrity
   */
  validateFAQData(): Observable<{ isValid: boolean; errors: string[] }> {
    return this.faqRepository.getFAQs().pipe(map(faqs => this.performDataValidation(faqs)));
  }

  /**
   * Export FAQs with business logic
   */
  exportFAQs(format: 'json' | 'csv', filter?: FAQFilter): Observable<string> {
    const faqs$ = filter ? this.faqRepository.applyFilters(filter) : this.faqRepository.getFAQs();

    return faqs$.pipe(map(faqs => this.formatExportData(faqs, format)));
  }

  /**
   * Apply business rules to FAQs
   */
  private applyBusinessRules(faqs: FAQItem[], preferences?: UserPreferences): FAQItem[] {
    return faqs.map(faq => ({
      ...faq,
      isPopular: (faq.viewCount || 0) >= this.POPULAR_FAQ_THRESHOLD,
      showSocialShare: this.shouldShowSocialShare(faq),
      // Apply user preferences
      ...this.applyUserPreferences(faq, preferences),
    }));
  }

  /**
   * Generate intelligent search suggestions
   */
  private generateSearchSuggestions(faqs: FAQItem[], query: string): SearchSuggestion[] {
    const lowerQuery = query.toLowerCase();
    const suggestions: SearchSuggestion[] = [];

    // Question suggestions
    faqs.forEach(faq => {
      if (faq.question.toLowerCase().includes(lowerQuery)) {
        suggestions.push({
          text: faq.question,
          type: 'question',
          category: faq.category,
        });
      }
    });

    // Category suggestions
    const categories = new Set<string>();
    faqs.forEach(faq => {
      if (faq.category.toLowerCase().includes(lowerQuery) && !categories.has(faq.category)) {
        categories.add(faq.category);
        suggestions.push({
          text: faq.category,
          type: 'category',
          count: faqs.filter(f => f.category === faq.category).length,
        });
      }
    });

    // Tag suggestions
    const tags = new Set<string>();
    faqs.forEach(faq => {
      faq.tags?.forEach(tag => {
        if (tag.toLowerCase().includes(lowerQuery) && !tags.has(tag)) {
          tags.add(tag);
          suggestions.push({
            text: tag,
            type: 'tag',
            count: faqs.filter(f => f.tags?.includes(tag)).length,
          });
        }
      });
    });

    return suggestions
      .sort((a, b) => (b.count || 0) - (a.count || 0))
      .slice(0, this.MAX_SEARCH_SUGGESTIONS);
  }

  /**
   * Rank search results by relevance
   */
  private rankSearchResults(results: FAQItem[], query: string): FAQItem[] {
    const lowerQuery = query.toLowerCase();

    return results
      .map(faq => ({
        faq,
        score: this.calculateRelevanceScore(faq, lowerQuery),
      }))
      .sort((a, b) => b.score - a.score)
      .map(item => item.faq);
  }

  /**
   * Calculate relevance score for search results
   */
  private calculateRelevanceScore(faq: FAQItem, query: string): number {
    let score = 0;

    // Exact question match gets highest score
    if (faq.question.toLowerCase() === query) {
      score += 100;
    }

    // Question contains query
    if (faq.question.toLowerCase().includes(query)) {
      score += 50;
    }

    // Category match
    if (faq.category.toLowerCase().includes(query)) {
      score += 30;
    }

    // Sub-category match
    if (faq.subCategory?.toLowerCase().includes(query)) {
      score += 25;
    }

    // Answer contains query
    if (faq.answer.toLowerCase().includes(query)) {
      score += 20;
    }

    // Boost popular FAQs
    if (faq.isPopular) {
      score += 10;
    }

    // Boost recently updated FAQs
    if (faq.lastUpdated && this.isRecentlyUpdated(faq.lastUpdated)) {
      score += 5;
    }

    return score;
  }

  /**
   * Generate recommendations based on user behavior
   */
  private generateRecommendations(
    faqs: FAQItem[],
    userId?: string,
    recentlyViewed?: string[]
  ): FAQItem[] {
    // Simple recommendation algorithm
    // In a real application, this would use machine learning

    let recommendations = faqs.filter(faq => faq.isPopular);

    // If user has recently viewed FAQs, recommend similar ones
    if (recentlyViewed && recentlyViewed.length > 0) {
      const viewedFAQs = faqs.filter(faq => recentlyViewed.includes(faq.id));
      const categories = new Set(viewedFAQs.map(faq => faq.category));

      const similarFAQs = faqs.filter(
        faq => categories.has(faq.category) && !recentlyViewed.includes(faq.id)
      );

      recommendations = [...recommendations, ...similarFAQs];
    }

    // Remove duplicates and limit results
    const uniqueRecommendations = recommendations.filter(
      (faq, index, self) => index === self.findIndex(f => f.id === faq.id)
    );

    return uniqueRecommendations.slice(0, 10);
  }

  /**
   * Apply business filters
   */
  private applyBusinessFilters(faqs: FAQItem[], filter: FAQFilter): FAQItem[] {
    // Additional business logic for filtering
    return faqs.filter(faq => {
      // Custom business rules can be added here
      return true;
    });
  }

  /**
   * Perform data validation
   */
  private performDataValidation(faqs: FAQItem[]): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    faqs.forEach((faq, index) => {
      if (!faq.id) {
        errors.push(`FAQ at index ${index} is missing ID`);
      }
      if (!faq.question.trim()) {
        errors.push(`FAQ ${faq.id} is missing question`);
      }
      if (!faq.category.trim()) {
        errors.push(`FAQ ${faq.id} is missing category`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Format export data
   */
  private formatExportData(faqs: FAQItem[], format: 'json' | 'csv'): string {
    if (format === 'json') {
      return JSON.stringify(faqs, null, 2);
    }

    // CSV format
    const headers = ['ID', 'Question', 'Answer', 'Category', 'Sub-Category', 'View Count'];
    const rows = faqs.map(faq => [
      faq.id,
      `"${faq.question.replace(/"/g, '""')}"`,
      `"${faq.answer.replace(/"/g, '""')}"`,
      faq.category,
      faq.subCategory || '',
      faq.viewCount || 0,
    ]);

    return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
  }

  /**
   * Check if FAQ should show social share
   */
  private shouldShowSocialShare(faq: FAQItem): boolean {
    return faq.isPopular || (faq.viewCount || 0) > 5;
  }

  /**
   * Apply user preferences
   */
  private applyUserPreferences(faq: FAQItem, preferences?: UserPreferences): Partial<FAQItem> {
    if (!preferences) {
      return {};
    }

    // Apply user-specific customizations
    return {};
  }

  /**
   * Check if FAQ was recently updated
   */
  private isRecentlyUpdated(lastUpdated: Date): boolean {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return lastUpdated > thirtyDaysAgo;
  }

  /**
   * Increment view count for FAQ
   */
  private incrementViewCount(faqId: string): void {
    // In a real application, this would update the backend
    console.log(`Incrementing view count for FAQ: ${faqId}`);
  }
}
