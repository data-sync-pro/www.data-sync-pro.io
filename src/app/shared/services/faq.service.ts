import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, of, throwError } from 'rxjs';
import { map, catchError, shareReplay, tap, finalize } from 'rxjs/operators';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

import {
  SourceFAQRecord,
  FAQItem,
  FAQCategory,
  FAQSubCategory,
  SearchOptions,
  FAQStats,
  FAQFilter,
  FAQSortOptions,
} from '../models/faq.model';

@Injectable({
  providedIn: 'root',
})
export class FAQService {
  private readonly FAQ_DATA_URL = 'assets/data/faqs.json';
  private readonly FAQ_CONTENT_BASE = 'assets/faq-item/';

  // Cache
  private faqsCache$ = new BehaviorSubject<FAQItem[]>([]);
  private contentCache = new Map<string, SafeHtml>();
  private categoriesCache: FAQCategory[] = [];

  // Loading state
  private isLoading = false;
  private isInitialized = false;

  constructor(
    private http: HttpClient,
    private sanitizer: DomSanitizer
  ) {
    this.initializeService();
  }

  /**
   * Initialize service
   */
  private initializeService(): void {
    if (!this.isInitialized) {
      this.loadFAQs();
      this.isInitialized = true;
    }
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
    return this.getFAQs().pipe(map(faqs => faqs.length));
  }

  /**
   * 根据ID获取单个FAQ
   */
  getFAQById(id: string): Observable<FAQItem | undefined> {
    return this.getFAQs().pipe(map(faqs => faqs.find(faq => faq.id === id)));
  }

  /**
   * 根据分类筛选FAQ
   */
  getFAQsByCategory(category: string, subCategory?: string): Observable<FAQItem[]> {
    return this.getFAQs().pipe(
      map(faqs =>
        faqs.filter(faq => {
          const categoryMatch = faq.category === category;
          const subCategoryMatch = !subCategory || faq.subCategory === subCategory;
          return categoryMatch && subCategoryMatch;
        })
      )
    );
  }

  /**
   * 搜索FAQ
   */
  searchFAQs(query: string, options: SearchOptions = {}): Observable<FAQItem[]> {
    if (!query.trim()) {
      return this.getFAQs();
    }

    return this.getFAQs().pipe(
      map(faqs => {
        const lowerQuery = query.toLowerCase();
        let filtered = faqs.filter(faq => {
          const questionMatch = faq.question.toLowerCase().includes(lowerQuery);
          const categoryMatch = faq.category.toLowerCase().includes(lowerQuery);
          const subCategoryMatch = faq.subCategory?.toLowerCase().includes(lowerQuery);
          const tagsMatch = faq.tags?.some(tag => tag.toLowerCase().includes(lowerQuery));

          let answerMatch = false;
          if (options.includeAnswers && faq.answer) {
            answerMatch = faq.answer.toLowerCase().includes(lowerQuery);
          }

          return questionMatch || categoryMatch || subCategoryMatch || tagsMatch || answerMatch;
        });

        // 应用分类过滤
        if (options.category) {
          filtered = filtered.filter(faq => faq.category === options.category);
        }

        if (options.subCategory) {
          filtered = filtered.filter(faq => faq.subCategory === options.subCategory);
        }

        // 限制结果数量
        if (options.maxResults) {
          filtered = filtered.slice(0, options.maxResults);
        }

        return filtered;
      })
    );
  }

  /**
   * 获取搜索建议
   */
  getSearchSuggestions(query: string, maxSuggestions = 8): Observable<string[]> {
    if (!query.trim() || query.length < 2) {
      return of([]);
    }

    return this.getFAQs().pipe(
      map(faqs => {
        const lowerQuery = query.toLowerCase();
        const suggestions = new Set<string>();

        faqs.forEach(faq => {
          // 问题匹配
          if (faq.question.toLowerCase().includes(lowerQuery)) {
            suggestions.add(faq.question);
          }

          // 分类匹配
          if (faq.category.toLowerCase().includes(lowerQuery)) {
            suggestions.add(faq.category);
          }

          // 子分类匹配
          if (faq.subCategory?.toLowerCase().includes(lowerQuery)) {
            suggestions.add(faq.subCategory);
          }
        });

        return Array.from(suggestions).slice(0, maxSuggestions);
      })
    );
  }

  /**
   * 获取FAQ内容
   */
  getFAQContent(answerPath: string): Observable<SafeHtml> {
    if (!answerPath) {
      return of(this.sanitizer.bypassSecurityTrustHtml('<p>Content not available</p>'));
    }

    // Check cache
    if (this.contentCache.has(answerPath)) {
      return of(this.contentCache.get(answerPath)!);
    }

    const fullPath = `${this.FAQ_CONTENT_BASE}${answerPath}`;
    return this.http.get(fullPath, { responseType: 'text' }).pipe(
      map(content => {
        const processedContent = this.processContent(content);
        const safeContent = this.sanitizer.bypassSecurityTrustHtml(processedContent);

        // Cache content
        this.contentCache.set(answerPath, safeContent);
        return safeContent;
      }),
      catchError(error => {
        console.error(`Failed to load FAQ content: ${fullPath}`, error);
        const errorContent = this.sanitizer.bypassSecurityTrustHtml(
          '<p class="error-message">Failed to load content, please try again later</p>'
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
              subCategories: [],
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
                parentCategory: faq.category,
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
        return ids.map(id => faqMap.get(id)).filter(Boolean) as FAQItem[];
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
        const subCategories = new Set(faqs.map(faq => faq.subCategory).filter(Boolean));

        const mostViewed = faqs
          .filter(faq => faq.viewCount && faq.viewCount > 0)
          .sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0))
          .slice(0, 5);

        return {
          totalFAQs: faqs.length,
          totalCategories: categories.size,
          totalSubCategories: subCategories.size,
          mostViewedFAQs: mostViewed,
          recentlyUpdated: [],
        };
      })
    );
  }

  /**
   * 更新FAQ项目
   */
  updateFAQItem(id: string, updates: Partial<FAQItem>): void {
    const currentFAQs = this.faqsCache$.value;
    const updatedFAQs = currentFAQs.map(faq => (faq.id === id ? { ...faq, ...updates } : faq));
    this.faqsCache$.next(updatedFAQs);
  }

  /**
   * 清除内容缓存
   */
  clearContentCache(): void {
    this.contentCache.clear();
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
    this.http
      .get<SourceFAQRecord[]>(this.FAQ_DATA_URL)
      .pipe(
        map(records => records.map(record => this.transformToFAQItem(record))),
        catchError(error => {
          console.error('Failed to load FAQ data', error);
          return of([]);
        }),
        finalize(() => (this.isLoading = false))
      )
      .subscribe(faqs => {
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
      tags: record.SubCategory__c
        ? [record.Category__c, record.SubCategory__c]
        : [record.Category__c],
      lastUpdated: new Date(),
    };
  }

  /**
   * Private method: Process FAQ content
   */
  private processContent(content: string): string {
    return (
      content
        // Remove empty p tags but preserve content structure
        .replace(/<p[^>]*>\s*<\/p>/g, '')
        // Fix image paths - ensure relative paths are correctly resolved
        .replace(/src="assets\//g, 'src="assets/')
        .replace(/src="(?!http|\/|assets)/g, 'src="assets/')
        // Improve content formatting
        .replace(/<section[^>]*>/g, '<div class="faq-section">')
        .replace(/<\/section>/g, '</div>')
        // Ensure images have correct style classes and attributes for zooming
        .replace(/<img([^>]*?)>/g, (match, attrs) => {
          // 确保图片有正确的类和属性
          let newAttrs = attrs;
          if (!newAttrs.includes('class=')) {
            newAttrs += ' class="faq-image"';
          } else if (!newAttrs.includes('faq-image')) {
            newAttrs = newAttrs.replace(/class="([^"]*)"/, 'class="$1 faq-image"');
          }

          // 添加加载错误处理
          if (!newAttrs.includes('onerror=')) {
            newAttrs += ' onerror="this.style.display=\'none\'"';
          }

          // 添加加载完成处理
          if (!newAttrs.includes('onload=')) {
            newAttrs += ' onload="this.style.cursor=\'zoom-in\'"';
          }

          return `<img${newAttrs}>`;
        })
        // Clean up extra whitespace
        .replace(/\s+/g, ' ')
        .trim()
    );
  }
}
