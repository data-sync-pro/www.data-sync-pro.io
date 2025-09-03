import {
  Component,
  ViewChild,
  ElementRef,
  HostListener,
  OnInit,
  OnDestroy,
  AfterViewInit,
  ViewEncapsulation,
  ViewChildren,
  QueryList,
  ChangeDetectionStrategy,
  ChangeDetectorRef
} from '@angular/core';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { DomSanitizer } from '@angular/platform-browser';
import { AnalyticsService } from '../analytics.service';
import { Meta, Title } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, fromEvent } from 'rxjs';
import { takeUntil, debounceTime, take, filter, tap } from 'rxjs/operators';

import { FAQItem, FAQCategory, FAQSubCategory } from '../shared/models/faq.model';
import { FAQService } from '../shared/services/faq.service';
import { PerformanceService } from '../shared/services/performance.service';
import { FAQPreviewService, PreviewData } from '../shared/services/faq-preview.service';

interface SearchResult {
  item: FAQItem;
  score: number;
  matchType: 'title' | 'content' | 'category';
  matchedText: string;
  highlightedQuestion: string;
  highlightedAnswer: string;
}

interface SearchState {
  query: string;
  focused: boolean;
  isActive: boolean;
  results: SearchResult[];
  hasResults: boolean;
  suggestions: string[];
  showSuggestions: boolean;
  selectedIndex: number;
  isOpen: boolean;
}

interface CurrentState {
  category: string;
  subCategory: string;
  faqTitle: string;
  faqItem: FAQItem | null;
}

interface UIState {
  isLoading: boolean;
  isLoadingRouteData: boolean;
  sidebarCollapsed: boolean;
  mobileSidebarOpen: boolean;
  mobileTOCOpen: boolean;
  isMobile: boolean;
  tocHidden: boolean;
}

interface TOCPaginationState {
  currentPage: number;
  itemsPerPage: number;
  totalPages: number;
  startIndex: number;
  endIndex: number;
}

@Component({
  selector: 'app-faq',
  templateUrl: './faq.component.html',
  styleUrls: ['./faq.component.scss'],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [
    trigger('slideInOut', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(-10px)' }),
        animate('200ms ease-in', style({ opacity: 1, transform: 'translateY(0)' }))
      ]),
      transition(':leave', [
        animate('200ms ease-out', style({ opacity: 0, transform: 'translateY(-10px)' }))
      ])
    ])
  ]
})
export class FaqComponent implements OnInit, OnDestroy, AfterViewInit {
  search: SearchState = {
    query: '',
    focused: false,
    isActive: false,
    results: [],
    hasResults: true,
    suggestions: [],
    showSuggestions: false,
    selectedIndex: -1,
    isOpen: false
  };

  // Search overlay initial query
  searchOverlayInitialQuery = '';


  current: CurrentState = {
    category: '',
    subCategory: '',
    faqTitle: '',
    faqItem: null
  };

  ui: UIState = {
    isLoading: false,
    isLoadingRouteData: false,
    sidebarCollapsed: false,
    mobileSidebarOpen: false,
    mobileTOCOpen: false,
    isMobile: false,
    tocHidden: true
  };

  // TOC Pagination state
  tocPagination: TOCPaginationState = {
    currentPage: 1,
    itemsPerPage: 8, // Show 8 items per page
    totalPages: 1,
    startIndex: 0,
    endIndex: 8
  };

  faqList: FAQItem[] = [];
  categories: FAQCategory[] = [];

  private searchTimeout: any;
  private destroy$ = new Subject<void>();
  private pendingFragment?: string;
  private scrollTimeout: any;
  private activeScrollElement: string = '';
  private userHasScrolled: boolean = false;
  private isInitialLoad = true;
  private isProcessingAnswerPath = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private sanitizer: DomSanitizer,
    private analyticsService: AnalyticsService,
    private faqService: FAQService,
    private meta: Meta,
    private title: Title,
    private cdr: ChangeDetectorRef,
    private performanceService: PerformanceService,
    private previewService: FAQPreviewService
  ) {}

  ngOnInit(): void {
    // Initialize FAQ data first to ensure it's available for routing
    this.initFaqData();
    
    // Check for preview mode first and handle it separately
    this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe(params => {
      const isPreview = params['preview'] === 'true';
      const previewFaqId = params['faqId'];
      
      if (isPreview && previewFaqId) {
        this.setupPreviewMode(previewFaqId);
        // Skip normal FAQ initialization for preview mode
        return;
      }
    });
    
    this.loadRatingsFromLocalStorage();
    this.cleanupFavoriteData();
    this.loadSidebarState();
    this.checkMobileView();
    this.setupScrollListener();
    this.setupFooterObserver();
    this.setupOptimizedScrollListener();
    this.setupNavLinkHandler();

    // Delay route parameter processing to ensure FAQ data is loading
    this.route.paramMap.pipe(
      takeUntil(this.destroy$)
    ).subscribe(params => {
      const catParam = params.get('cat');
      const subCatParam = params.get('subCat');
      
      if (catParam) {
        const decodedCat = this.safeDecodeURIComponent(catParam);
        
        // Check if this looks like an answer-based URL (contains hyphens and is longer)
        if (this.isAnswerBasedURL(decodedCat) && !subCatParam) {
          // Set processing flag immediately to prevent race conditions
          this.isProcessingAnswerPath = true;
          
          // For answer-based URLs, wait for FAQ data to be loaded
          
          // If FAQ data is not loaded yet, force reload and wait
          if (this.faqList.length === 0) {
            // Set loading state to prevent flash of default content
            this.updateUIState({ isLoadingRouteData: true });
            
            // Force reload FAQ data to ensure it's loaded
            this.faqService.reloadFAQs().pipe(
              take(1)
            ).subscribe({
              next: (faqs) => {
                this.faqList = faqs;
                if (faqs.length > 0) {
                  this.handleAnswerPathNavigation(decodedCat, true);
                } else {
                  this.router.navigate(['/']);
                }
                // Clear loading state
                this.updateUIState({ isLoadingRouteData: false });
              },
              error: (error) => {
                console.error('Failed to load FAQ data:', error);
                this.updateUIState({ isLoadingRouteData: false });
                this.router.navigate(['/']);
              }
            });
          } else {
            // FAQ data already loaded, process immediately
            this.handleAnswerPathNavigation(decodedCat, true);
          }
        } else {
          // Handle category-based URL (e.g., /general or /general/input)
          // Wait for FAQ data to be loaded before setting category
          if (this.faqList.length === 0) {
            // Set loading state to prevent flash of default content
            this.updateUIState({ isLoadingRouteData: true });
            
            // Force reload FAQ data to ensure it's loaded
            this.faqService.reloadFAQs().pipe(
              take(1)
            ).subscribe({
              next: (faqs) => {
                this.faqList = faqs;
                if (faqs.length > 0) {
                  this.setCategoryFromRoute(decodedCat, subCatParam);
                } else {
                  this.router.navigate(['/']);
                }
                // Clear loading state
                this.updateUIState({ isLoadingRouteData: false });
              },
              error: (error) => {
                console.error('Failed to load FAQ data:', error);
                this.updateUIState({ isLoadingRouteData: false });
                this.router.navigate(['/']);
              }
            });
          } else {
            // FAQ data already loaded, set category immediately
            this.setCategoryFromRoute(decodedCat, subCatParam);
          }
        }
      } else {
        // Root path
        this.current.category = '';
        this.current.subCategory = '';
      }
      
      // Update TOC pagination when navigation changes
      this.updateTOCPaginationIndices();
      this.cdr.detectChanges();
      
      this.updatePageMetadata();
    });

    this.route.fragment.pipe(
      takeUntil(this.destroy$)
    ).subscribe(fragment => {
      if (fragment) {
        this.pendingFragment = fragment;
        // Process fragment immediately, don't wait for router scroll
        this.handlePendingFragment();
      } else {
        // If no fragment, ensure page scrolls to top
        setTimeout(() => {
          window.scrollTo({ top: 0, behavior: 'auto' });
        }, 50);
      }
    });
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.refreshFaqElementsCache();
      
      // Only highlight if user has actually scrolled AND there's a scroll position
      // This prevents auto-highlighting the first item on page load
      if (this.userHasScrolled && window.pageYOffset > 0) {
        this.updateActiveScrollElementOptimized(window.pageYOffset);
      }
    }, 100);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    
    // Clean up timeouts
    if (this.scrollTimeout) {
      clearTimeout(this.scrollTimeout);
    }
    
    // Clean up intersection observer (no longer needed without expansion panels)
    
    // Clean up footer observer
    this.cleanupFooterObserver();
    
    // Clean up nav link handler
    this.cleanupNavLinkHandler();
  }

  private initFaqData(): void {
    this.updateUIState({ isLoading: true });

    this.faqService.getFAQs().pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (faqs) => {
        //console.log('📚 FAQ data loaded, count:', faqs.length);
        this.faqList = faqs;
        this.updateUIState({ isLoading: false });
        
        // Initialize TOC pagination when data is loaded
        this.updateTOCPaginationIndices();
        
        // Clear cached elements when FAQ data changes
        this.cachedFaqElements = null;
        this.cachedQuestionTexts.clear();
        
        // Note: Answer-based URL handling is ONLY done through route parameter processing
        // to avoid race conditions. Do not add URL handling logic here.
        
        this.handlePendingFragment();
        // Set up preloading observers
        this.setupPreloadingObservers();
        // Warm cache for popular FAQs
        this.warmCacheForPopularFAQs();
      },
      error: (error) => {
        console.error('Failed to load FAQ data:', error);
        this.updateUIState({ isLoading: false });
      }
    });

    this.faqService.getCategories().pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (categories) => {
        this.categories = categories;
      },
      error: (error) => {
        console.error('Failed to load categories:', error);
      }
    });
  }

  // Category name mapping for URL conversion (lowercase URL ↔ original name)
  private categoryMapping: { [key: string]: string } = {
    'general': 'General',
    'rules-engines': 'Rules Engines',
    'processes': 'Processes',
    'process-steps': 'Process Steps', 
    'transformation': 'Transformation',
    'executables': 'Executables',
    'connections': 'Connections',
    'query-manager-q': 'Query Manager(Q)'
  };

  // Reverse mapping (original name → lowercase URL)
  private reverseCategoryMapping: { [key: string]: string } = {
    'General': 'general',
    'Rules Engines': 'rules-engines',
    'Processes': 'processes',
    'Process Steps': 'process-steps',
    'Transformation': 'transformation',
    'Executables': 'executables', 
    'Connections': 'connections',
    'Query Manager(Q)': 'query-manager-q'
  };

  private encode = (s: string) => {
    const trimmed = s.trim();
    // Check if this is a known category, if so use lowercase mapping
    const lowercaseUrl = this.reverseCategoryMapping[trimmed];
    if (lowercaseUrl) {
      return encodeURIComponent(lowercaseUrl);
    }
    // For subcategories or other strings, convert to lowercase and replace spaces with hyphens
    return encodeURIComponent(trimmed.toLowerCase().replace(/\s+/g, '-'));
  };

  
  goHome(): void {
    this.resetState();
    this.router.navigate(['/']);
  }
  
  goCategory(cat: string): void {
    this.resetState();
    this.router.navigate(['/', this.encode(cat)]);
  }

  goSubCategory(categoryName: string, subCategoryName: string): void {
    this.resetState();
    this.router.navigate(['/', this.encode(categoryName), this.encode(subCategoryName)]);
  }

  goBack(): void {
    if (this.current.subCategory) {
      // If in subcategory, go back to category
      this.goCategory(this.current.category);
    } else if (this.current.category) {
      // If in category, go back to home
      this.goHome();
    }
  }

  private navLinkHandler = (event: MouseEvent) => {
    const target = event.target as HTMLElement;
    
    // Handle FAQ navigation links in sidebar
    if (target && target.classList.contains('faq-nav-link')) {
      event.preventDefault();
      const category = target.getAttribute('data-category');
      const subcategory = target.getAttribute('data-subcategory');
      
      if (category && subcategory) {
        this.goSubCategory(category, subcategory);
      }
    }
    
    // Handle auto-generated FAQ content links - open in new window
    if (target && target.classList.contains('rules-engine-link')) {
      const href = target.getAttribute('href');
      
      if (href) {
        // Open in new window/tab instead of same window navigation
        window.open(href, '_blank', 'noopener,noreferrer');
        event.preventDefault();
      }
    }
    
    // Handle clicks on Lightning icon inside rules-engine-link
    if (target && (target.classList.contains('slds-icon') || target.closest('.slds-icon'))) {
      const linkElement = target.closest('a.rules-engine-link') as HTMLElement;
      if (linkElement) {
        const href = linkElement.getAttribute('href');
        
        if (href) {
          window.open(href, '_blank', 'noopener,noreferrer');
          event.preventDefault();
        }
      }
    }
  };

  private setupNavLinkHandler(): void {
    // Use setTimeout to ensure the DOM is ready
    setTimeout(() => {
      document.addEventListener('click', this.navLinkHandler);
    }, 100);
  }

  private cleanupNavLinkHandler(): void {
    document.removeEventListener('click', this.navLinkHandler);
  }

  goSub(cat: string, sub: string): void {
    this.resetState();
    this.router.navigate(['/', this.encode(cat), this.encode(sub)]);
  }

  private resetState(): void {
    this.updateSearchState({
      query: '',
      isActive: false,
      suggestions: [],
      showSuggestions: false,
      selectedIndex: -1,
      results: [],
      hasResults: true
    });
    
    this.updateCurrentState({
      faqTitle: '',
      faqItem: null
    });
    
    // Reset TOC pagination to first page
    this.tocPagination.currentPage = 1;
    
    // Clear active scroll element to prevent incorrect highlighting
    this.activeScrollElement = '';
    
    // Reset user interaction flag when navigating between categories
    // This ensures TOC doesn't auto-highlight when switching categories
    this.userHasScrolled = false;
    this.updateTOCPaginationIndices();
    
    this.cdr.markForCheck();
    
    // Clear cached FAQ elements when state changes
    this.cachedFaqElements = null;
  }

  // State update helpers for immutability and OnPush optimization
  private updateSearchState(updates: Partial<SearchState>): void {
    this.search = { ...this.search, ...updates };
    this.cdr.markForCheck();
  }

  private updateCurrentState(updates: Partial<CurrentState>): void {
    this.current = { ...this.current, ...updates };
    this.cdr.markForCheck();
  }

  private updateUIState(updates: Partial<UIState>): void {
    this.ui = { ...this.ui, ...updates };
    this.cdr.markForCheck();
  }

  private setupPreloadingObservers(): void {
    // Wait for FAQ items to be rendered in the DOM
    setTimeout(() => {
      const faqElements = document.querySelectorAll('.faq-item');
      faqElements.forEach((element, index) => {
        const faqItem = this.filteredFAQ[index];
        if (faqItem && faqItem.answerPath) {
          this.faqService.observeForPreloading(element, faqItem.id, faqItem.answerPath);
        }
      });
    }, 100);
  }

  private warmCacheForPopularFAQs(): void {
    // Use the trending questions IDs for cache warming
    const popularFaqIds = [
      'a0oEc000005JohNIAS',
      'a0oEc000005JohOIAS',
      'a0oEc000005JohSIAS',
      'a0oEc000005JohTIAS'
    ];
    
    this.faqService.warmCacheForPopularFAQs(popularFaqIds);
  }



  private highlightKeywords(text: string, keywords: string[]): string {
    if (!keywords.length || !text) return text;

    return keywords.reduce((highlighted, keyword) => {
      if (!keyword.trim()) return highlighted;
      const regex = new RegExp(`(${this.escapeRegExp(keyword)})`, 'gi');
      return highlighted.replace(regex, '<mark class="search-highlight">$1</mark>');
    }, text);
  }

  private escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private calculateRelevanceScore(item: FAQItem, query: string): { score: number; matchType: 'title' | 'content' | 'category'; matchedText: string } {
    const lowerQuery = query.toLowerCase();
    const lowerQuestion = item.question.toLowerCase();
    const lowerAnswer = item.answer.toLowerCase();
    const lowerCategory = item.category.toLowerCase();
    const lowerSubCategory = item.subCategory?.toLowerCase() || '';

    let score = 0;
    let matchType: 'title' | 'content' | 'category' = 'content';
    let matchedText = '';

    if (lowerQuestion === lowerQuery) {
      score = 100;
      matchType = 'title';
      matchedText = item.question;
    }
    else if (lowerQuestion.startsWith(lowerQuery)) {
      score = 90;
      matchType = 'title';
      matchedText = item.question;
    }
    else if (lowerQuestion.includes(lowerQuery)) {
      score = 80;
      matchType = 'title';
      matchedText = item.question;
    }
    else if (lowerCategory.includes(lowerQuery) || lowerSubCategory.includes(lowerQuery)) {
      score = 60;
      matchType = 'category';
      matchedText = item.category + (item.subCategory ? ` > ${item.subCategory}` : '');
    }
    else if (lowerAnswer.includes(lowerQuery)) {
      score = 40;
      matchType = 'content';
      const index = lowerAnswer.indexOf(lowerQuery);
      const start = Math.max(0, index - 50);
      const end = Math.min(lowerAnswer.length, index + lowerQuery.length + 50);
      matchedText = item.answer.substring(start, end);
      if (start > 0) matchedText = '...' + matchedText;
      if (end < item.answer.length) matchedText = matchedText + '...';
    }

    return { score, matchType, matchedText };
  }

  // Computed properties for better OnPush performance
  get categoryNames(): string[] {
    return this.categories.map(cat => cat.name);
  }

  get allFaqList(): FAQItem[] {
    return this.faqList;
  }

  get isLoadingState(): boolean {
    return this.ui.isLoading;
  }

  get isMobileView(): boolean {
    return this.ui.isMobile;
  }

  get isSidebarCollapsed(): boolean {
    return this.ui.sidebarCollapsed;
  }

  get isMobileSidebarOpen(): boolean {
    return this.ui.mobileSidebarOpen;
  }

  get searchQuery(): string {
    return this.search.query;
  }

  get isSearchActive(): boolean {
    return this.search.isActive;
  }

  get isSearchOpen(): boolean {
    return this.search.isOpen;
  }

  get currentCategory(): string {
    return this.current.category;
  }

  get currentSubCategory(): string {
    return this.current.subCategory;
  }

  get currentFaqItem(): FAQItem | null {
    return this.current.faqItem;
  }

  private _cachedTrendingQuestions?: FAQItem[];
  private _lastFaqListLength?: number;

  get trendingQuestions(): FAQItem[] {
    if (!this._cachedTrendingQuestions || this._lastFaqListLength !== this.faqList.length) {
      const trendingIds = [
        'a0oEc000005JohNIAS',
        'a0oEc000005JohOIAS',
        'a0oEc000005JohSIAS',
        'a0oEc000005JohTIAS',
        'a0oEc000005JohUIAS',
        'a0oEc000005JohVIAS',
        'a0oEc000005JohWIAS',
        'a0oEc000005JohXIAS'
      ];

      this._cachedTrendingQuestions = trendingIds
        .map(id => this.faqList.find(faq => faq.id === id))
        .filter(Boolean) as FAQItem[];
      
      this._lastFaqListLength = this.faqList.length;
    }
    
    return this._cachedTrendingQuestions;
  }

  get currentTOCTitle(): string {
    if (this.current.subCategory) {
      return this.current.subCategory + ' FAQs';
    }
    if (this.current.category) {
      return this.current.category + ' FAQs';
    }
    return 'Contents';
  }

  get currentFAQList(): FAQItem[] {
    return this.filteredFAQ || [];
  }

  get shouldShowTOC(): boolean {
    if (this.ui.isMobile) {
      return false;
    }

    if (this.search.isActive || this.search.query.trim()) {
      return false;
    }

    if (this.showHome) {
      return this.trendingQuestions.length > 0;
    }

    return (!!this.current.category || !!this.current.subCategory) &&
           this.currentFAQList.length > 1;
  }

  get tocItemCount(): number {
    if (this.showHome) {
      return this.trendingQuestions.length;
    }
    return this.currentFAQList.length;
  }

  get popularFAQs(): FAQItem[] {
    return this.faqList.slice(0, 5);
  }

  get filteredFAQ(): FAQItem[] {
    const q = this.search.query.toLowerCase().trim();

    if (q) {
      return this.performSmartSearch(q);
    }

    // If no search query, apply category filter
    return this.faqList.filter(item => {
      if (this.current.category && item.category !== this.current.category) return false;
      if (this.current.subCategory && item.subCategory !== this.current.subCategory) return false;
      return true;
    });
  }

  private performSmartSearch(query: string): FAQItem[] {
    return this.performanceService.measure('faq-smart-search-render', () => {
      const keywords = query.split(/\s+/).filter(k => k.length > 0);
      const results: SearchResult[] = [];

      this.faqList.forEach(item => {
        const relevance = this.calculateRelevanceScore(item, query);

        if (relevance.score > 0) {
          const highlightedQuestion = this.highlightKeywords(item.question, keywords);
          const highlightedAnswer = this.highlightKeywords(
            relevance.matchType === 'content' ? relevance.matchedText : item.answer.substring(0, 200) + '...',
            keywords
          );

          results.push({
            item,
            score: relevance.score,
            matchType: relevance.matchType,
            matchedText: relevance.matchedText,
            highlightedQuestion,
            highlightedAnswer
          });
        }
      });

      // 按相关性评分排序
      results.sort((a, b) => b.score - a.score);

      // 更新搜索结果状态
      this.updateSearchState({
        results,
        hasResults: results.length > 0
      });

      return results.map(r => r.item);
    }) as FAQItem[];
  }

  getHighlightedQuestion(item: FAQItem): string {
    const result = this.search.results.find(r => r.item.id === item.id);
    return result ? result.highlightedQuestion : item.question;
  }

  getHighlightedAnswerPreview(item: FAQItem): string {
    const result = this.search.results.find(r => r.item.id === item.id);
    return result ? result.highlightedAnswer : 
           (item.answer.length > 200 ? item.answer.substring(0, 200) + '...' : item.answer);
  }

  getMatchType(item: FAQItem): string {
    const result = this.search.results.find(r => r.item.id === item.id);
    if (!result) return '';

    const types = { title: '标题匹配', content: '内容匹配', category: '分类匹配' };
    return types[result.matchType] || '';
  }


  selectPopularFAQ(faq: FAQItem): void {
    this.search.query = faq.question;
    this.search.isActive = false;
    this.performSearch();
  }

  contactSupport(): void {
    window.open('mailto:support@data-sync-pro.io?subject=FAQ Support Request', '_blank');
  }

  clearSearch(): void {
    this.resetState();
  }

  searchAndClear(): void {
    if (!this.search.query.trim()) return;

    this.current.category = '';
    this.current.subCategory = '';

    const results = this.filteredFAQ;
    const exactMatch = results.find(item =>
      item.question.toLowerCase() === this.search.query.toLowerCase().trim()
    );

    // FAQ exact match found - content will be displayed directly

    this.search.query = '';
    this.search.isActive = false;
    this.search.suggestions = [];
    this.search.showSuggestions = false;
    this.search.selectedIndex = -1;
  }

  

  onFaqOpened(item: FAQItem): void {
    // Update current FAQ title for breadcrumb
    this.updateCurrentState({
      faqTitle: item.question,
      faqItem: item
    });

    // Update browser URL
    this.updateBrowserURL(item);

    // Track FAQ view
    this.trackFAQView(item);



    // Load FAQ content
    if (!item.safeAnswer && item.answerPath) {
      item.isLoading = true;
      this.cdr.markForCheck(); 

      this.faqService.getFAQContent(item.answerPath).pipe(
        takeUntil(this.destroy$)
      ).subscribe({
        next: (content) => {
          item.safeAnswer = content;
          item.isLoading = false;
          this.cdr.markForCheck(); 
        },
        error: (error) => {
          console.error('Failed to load FAQ content:', error);
          item.isLoading = false;
          item.safeAnswer = this.sanitizer.bypassSecurityTrustHtml(
            '<p class="error-message">Failed to load content, please try again later</p>'
          );
          this.cdr.markForCheck();
        }
      });
    }
  }

  navigateToFAQ(item: FAQItem): void {
    // Mark that user has interacted - this enables TOC highlighting
    this.userHasScrolled = true;
    
    if (!item.viewCount) {
      item.viewCount = 0;
    }
    item.viewCount++;

    
    this.updateCurrentState({
      faqTitle: item.question,
      faqItem: item
    });

    this.refreshFaqElementsCache();

    this.updateBrowserURL(item);

    this.trackFAQView(item);

    this.onFaqOpened(item);

    // Scroll to top instead of FAQ item for better navigation experience
    this.scrollToTop();
  }

  /**
   * Show FAQ detail without URL navigation (for direct URL access)
   */
  showFAQDetail(item: FAQItem): void {
    // Mark that user has interacted - this enables TOC highlighting
    this.userHasScrolled = true;
    
    if (!item.viewCount) {
      item.viewCount = 0;
    }
    item.viewCount++;

    // Set current FAQ state
    this.updateCurrentState({
      faqTitle: item.question,
      faqItem: item
    });

    this.trackFAQView(item);

    // Load FAQ content directly (without URL navigation)
    this.loadFAQContent(item);

    // Update page metadata
    this.updatePageMetadata();

    // Scroll to top for better user experience
    this.scrollToTop();
  }

  /**
   * Pure content loading method without URL navigation or panel expansion
   */
  private loadFAQContent(item: FAQItem): void {
    // Load FAQ content if not already loaded
    if (!item.safeAnswer && item.answerPath) {
      item.isLoading = true;
      this.cdr.markForCheck(); // Trigger change detection to show loading state

      this.faqService.getFAQContent(item.answerPath).pipe(
        takeUntil(this.destroy$)
      ).subscribe({
        next: (content) => {
          item.safeAnswer = content;
          item.isLoading = false;
          this.cdr.markForCheck(); 
        },
        error: (error) => {
          console.error('Failed to load FAQ content:', error);
          item.isLoading = false;
          item.safeAnswer = this.sanitizer.bypassSecurityTrustHtml(
            '<p class="error-message">Failed to load content, please try again later</p>'
          );
          this.cdr.markForCheck(); // Ensure error state is also updated in UI
        }
      });
    }
  }

  onFaqClosed(): void {
    // Clear current FAQ title and item when FAQ is closed
    this.clearBrowserURLFragment();
    this.current.faqTitle = '';
    this.current.faqItem = null;
  }




  private scrollToElement(elementId: string): void {
    setTimeout(() => {
      const element = document.getElementById(elementId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 200);
  }


  private updateBrowserURL(item: FAQItem): void {
    // Use answer-based URL instead of fragment-based
    const answerSlug = this.getAnswerSlug(item.answerPath);
    
    this.router.navigate(['/', answerSlug], {
      replaceUrl: true
    });
  }

  private clearBrowserURLFragment(): void {
    const url = this.buildFAQUrl(this.current.category, this.current.subCategory);
    this.router.navigate([url], { replaceUrl: true });
  }

  private buildFAQUrl(category?: string | null, subCategory?: string | null): string {
    let url = '/';
    if (category) {
      // Use the encode method which now handles lowercase conversion
      url += `/${this.encode(category)}`;
      if (subCategory) {
        url += `/${this.encode(subCategory)}`;
      }
    }
    return url;
  }

  private trackFAQView(item: FAQItem): void {
    if (this.analyticsService.userConsented) {
      this.analyticsService.trackCustomEvent({
        eventType: 'faq_view',
        faqId: item.id,
        faqQuestion: item.question,
        faqCategory: item.category,
        timestamp: new Date().toISOString()
      });
    }
  }

  onSearchBlur(): void {
    this.updateSearchState({ focused: false });
    // Delay hiding suggestions to allow for click events
    setTimeout(() => {
      this.updateSearchState({ showSuggestions: false });
    }, 200);
  }

  onSearchFocus(): void {
    this.updateSearchState({ focused: true });
    if (this.search.query.trim()) {
      this.updateSuggestions();
    }
  }

  onSearchInput(event: any): void {
    const query = event.target.value;
    const isActive = query.trim().length > 0;
    
    this.updateSearchState({
      query,
      isActive
    });

    if (isActive) {
      this.updateCurrentState({
        category: '',
        subCategory: ''
      });
    } else {
      this.updateSearchState({
        results: [],
        hasResults: true
      });
    }

    this.updateSuggestions();
  }

  onSearchKeydown(event: KeyboardEvent): void {
    if (!this.search.showSuggestions || this.search.suggestions.length === 0) {
      // If no suggestions, allow Enter to trigger search
      if (event.key === 'Enter') {
        event.preventDefault();
        this.performSearch();
      }
      return;
    }

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.updateSearchState({
          selectedIndex: Math.min(
            this.search.selectedIndex + 1,
            this.search.suggestions.length - 1
          )
        });
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.updateSearchState({
          selectedIndex: Math.max(this.search.selectedIndex - 1, -1)
        });
        break;
      case 'Enter':
        event.preventDefault();
        if (this.search.selectedIndex >= 0) {
          this.selectSuggestion(this.search.suggestions[this.search.selectedIndex]);
        } else {
          this.performSearch();
        }
        break;
      case 'Escape':
        this.updateSearchState({
          showSuggestions: false,
          selectedIndex: -1
        });
        break;
    }
  }

  performSearch(): void {
    const query = this.search.query.trim();
    if (!query) return;

    // Hide suggestions
    this.updateSearchState({
      showSuggestions: false,
      selectedIndex: -1
    });

    // Check for exact match first
    const exactMatch = this.faqList.find(item =>
      item.question.toLowerCase() === query.toLowerCase()
    );

    if (exactMatch) {
      // Auto-navigate to exact match
      this.autoNavigateToFAQ(exactMatch);
    } else {
      // If no exact match, just filter the results
      // The filteredFAQ getter will handle the filtering
      // Keep the search state active to show filtered results
    }
  }

  private updateSuggestions(): void {
    const query = this.search.query.toLowerCase().trim();
    if (query.length < 2) {
      this.search.suggestions = [];
      this.search.showSuggestions = false;
      return;
    }

    // Debounce search to improve performance
    clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => {
      // Check for exact match first
      const exactMatch = this.faqList.find(item =>
        item.question.toLowerCase() === query
      );

      if (exactMatch) {
        // Auto-navigate to exact match
        this.autoNavigateToFAQ(exactMatch);
        return;
      }

      this.search.suggestions = this.faqList
        .filter(item =>
          item.question.toLowerCase().includes(query) ||
          item.category.toLowerCase().includes(query) ||
          (item.subCategory && item.subCategory.toLowerCase().includes(query))
        )
        .map(item => item.question)
        .slice(0, 8); // Limit to 8 suggestions

      this.search.showSuggestions = this.search.suggestions.length > 0;
      this.search.selectedIndex = -1;
    }, 300);
  }

  private autoNavigateToFAQ(faqItem: FAQItem): void {
    this.search.suggestions = [];
    this.search.showSuggestions = false;
    this.search.selectedIndex = -1;
    this.search.isActive = false;
    this.current.faqTitle = faqItem.question;

    const url = faqItem.subCategory 
      ? ['/', this.encode(faqItem.category), this.encode(faqItem.subCategory)]
      : ['/', this.encode(faqItem.category)];

    this.router.navigate(url, { fragment: this.slugify(faqItem.question) });
    // FAQ content will be displayed directly without panel expansion
  }



  selectSuggestion(suggestion: string): void {
    this.search.query = suggestion;
    this.search.showSuggestions = false;
    this.search.selectedIndex = -1;

    const faqItem = this.faqList.find(item => item.question === suggestion);
    if (faqItem) {
      this.showFAQDetail(faqItem);
    }
  }

  highlightMatch(text: string, query: string): string {
    if (!query.trim()) return text;

    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
  }

  getCategoryForSuggestion(suggestion: string): string {
    const faqItem = this.faqList.find(item => item.question === suggestion);
    return faqItem ? `${faqItem.category}${faqItem.subCategory ? ' > ' + faqItem.subCategory : ''}` : '';
  }

  focusSearch(): void {
    const searchInput = document.getElementById('faqSearchInput') as HTMLInputElement;
    if (searchInput) {
      searchInput.focus();
    }
  }




  rateFAQ(item: FAQItem, isHelpful: boolean): void {
    item.userRating = isHelpful;
    this.saveRatingsToLocalStorage();

    // Track rating
    if (this.analyticsService.userConsented) {
      this.analyticsService.trackCustomEvent({
        eventType: 'faq_rating',
        faqQuestion: item.question,
        isHelpful,
        timestamp: new Date().toISOString()
      });
    }
  }



  private saveRatingsToLocalStorage(): void {
    const ratings: { [key: string]: boolean } = {};
    this.faqList.forEach(item => {
      if (item.userRating !== undefined && item.userRating !== null) {
        ratings[item.question] = item.userRating;
      }
    });
    localStorage.setItem('faqRatings', JSON.stringify(ratings));
  }

  private loadRatingsFromLocalStorage(): void {
    const ratingsJson = localStorage.getItem('faqRatings');
    if (ratingsJson) {
      const ratings: { [key: string]: boolean } = JSON.parse(ratingsJson);
      this.faqList.forEach(item => {
        if (ratings.hasOwnProperty(item.question)) {
          item.userRating = ratings[item.question];
        }
      });
    }
  }

  private cleanupFavoriteData(): void {
    localStorage.removeItem('faqFavorites');
  }

  toRegistryKey(answer: string): string {
    return answer.replace(/\.html$/, '').toLowerCase();
  }
  openSearchOverlay(initialQuery?: string): void {
    this.searchOverlayInitialQuery = initialQuery || '';
    this.updateSearchState({ isOpen: true });
  }

  closeSearchOverlay(): void {
    this.searchOverlayInitialQuery = ''; 
    this.updateSearchState({ isOpen: false });
  }
  @ViewChild('faqSearchBox') faqSearchBox!: ElementRef<HTMLInputElement>;

  slugify(s: string): string {
    return s.toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
  }

  /**
   * Extract answer slug from answer path (remove .html extension)
   */
  getAnswerSlug(answerPath: string): string {
    return answerPath.replace(/\.html$/, '');
  }

  /**
   * Check if URL looks like an answer-based URL vs category URL
   */
  isAnswerBasedURL(urlPath: string): boolean {
    // Answer-based URLs are longer and contain multiple hyphens
    // Category URLs are typically single words or short phrases
    const hasMultipleHyphens = (urlPath.match(/-/g) || []).length >= 2;
    const isLongerThanCategoryName = urlPath.length > 15; // Most categories are shorter
    
    // Check if it's a known category by looking in our category mapping
    const isKnownCategory = this.categoryMapping.hasOwnProperty(urlPath.toLowerCase());
    
    // If it's a known category, treat as category URL
    if (isKnownCategory) {
      return false;
    }
    
    // If it has multiple hyphens and is long, likely an answer-based URL
    return hasMultipleHyphens && isLongerThanCategoryName;
  }

  /**
   * Handle navigation based on answer path URL parameter
   */
  private handleAnswerPathNavigation(answerSlug: string, fromRouteHandler: boolean = false): void {
    // Prevent duplicate processing, unless explicitly called from route handler
    if (this.isProcessingAnswerPath && !fromRouteHandler) {
      return;
    }
    
    // Set processing flag
    this.isProcessingAnswerPath = true;
    
    // At this point, FAQ data should already be loaded from route param handler
    if (this.faqList.length === 0) {
      this.isProcessingAnswerPath = false;
      this.isInitialLoad = false;
      return;
    }
    
    // Find FAQ item by answer path
    const answerPath = answerSlug + '.html';
    const faqItem = this.faqList.find(item => item.answerPath === answerPath);
    
    if (faqItem) {
      // Set category and subcategory based on found FAQ but don't trigger intermediate renders
      this.current.category = faqItem.category;
      this.current.subCategory = faqItem.subCategory || '';
      
      // Mark processing as complete before showing FAQ detail
      this.isProcessingAnswerPath = false;
      this.isInitialLoad = false;
      
      // Show FAQ detail directly without delay to prevent category flash
      this.showFAQDetail(faqItem);
      
      // Update TOC pagination after FAQ is shown
      this.updateTOCPaginationIndices();
    } else {
      // Reset processing flag on failure
      this.isProcessingAnswerPath = false;
      this.isInitialLoad = false;
      
      // If FAQ not found, redirect to home to avoid broken state
      this.router.navigate(['/']);
    }
  }

  /**
   * Set category and subcategory from route parameters
   */
  private setCategoryFromRoute(catParam: string, subCatParam: string | null): void {
    // Map lowercase URL back to original category name
    const originalCategory = this.categoryMapping[catParam] || catParam;
    this.current.category = originalCategory;
    
    const decodedSubCat = subCatParam ? this.safeDecodeURIComponent(subCatParam) : '';
    // For subcategories, convert to title case (capitalize each word)
    if (decodedSubCat) {
      const normalizedSubCat = decodedSubCat.replace(/-/g, ' ');
      this.current.subCategory = normalizedSubCat.replace(/\b\w/g, l => l.toUpperCase());
    } else {
      this.current.subCategory = '';
    }
  }

  /**
   * Safe URL decoding that handles double-encoded parameters
   */
  private safeDecodeURIComponent(encoded: string): string {
    try {
      let decoded = decodeURIComponent(encoded);
      
      // Check if still encoded (double-encoded case)
      if (decoded.includes('%') && decoded !== encoded) {
        try {
          // Try to decode again
          const doubleDecoded = decodeURIComponent(decoded);
          // Only use double decoded if it successfully created something different
          if (doubleDecoded !== decoded) {
            decoded = doubleDecoded;
          }
        } catch (e) {
          // If second decode fails, use first decode result
          console.warn('Double decode failed, using single decode:', decoded);
        }
      }
      
      return decoded;
    } catch (error) {
      console.warn('Failed to decode URI component:', encoded, error);
      return encoded; // Return original if decoding fails
    }
  }


  
  get showHome(): boolean {
    return (
      !this.current.category && !this.current.subCategory && !this.search.query
    );
  }

  /**
   * 获取分类描述
   */
  getCategoryDescription(): string {
    return '';
  }

  private openAndScroll(question: string, faqId?: string): void {
    setTimeout(() => {
      // Prioritize ID-based search if ID is provided
      const idx = faqId 
        ? this.filteredFAQ.findIndex(f => f.id === faqId)
        : this.filteredFAQ.findIndex(f => f.question === question);
      
      if (idx >= 0) {
        const faqItem = this.filteredFAQ[idx];
        
        // Show FAQ detail directly
        this.showFAQDetail(faqItem);
        
        // Scroll to top instead of FAQ item for better navigation experience
        this.scrollToTop();
      }
    });
  }
  
  trackBySlug(_: number, item: FAQItem) { return item.id; }

  handleSearchSelect(sel: {
    id?: string;
    question: string;
    category: string;
    subCategory: string | null;
    subCatFilterApplied?: boolean;
  }): void {
  
    // Find the full FAQ item to get the answerPath
    const faqItem = this.faqList.find(item => 
      item.question === sel.question && item.category === sel.category
    );
    
    if (faqItem) {
      // Use answer-based URL
      const answerSlug = this.getAnswerSlug(faqItem.answerPath);
      this.router.navigate(['/', answerSlug]);
    } else {
      // Fallback to old method if FAQ item not found
      const cat = sel.category;
      const sub = sel.subCategory ?? '';
      const frag = this.slugify(sel.question);
      
      this.router.navigate(
        sub ? ['/', cat, sub] : ['/', cat],
        { fragment: frag }
      );
    }
  
    this.search.isOpen = false;
  
    setTimeout(() => this.openAndScroll(sel.question, sel.id));
  }
  
  
  handleTrendingSelect(sel: {
    question: string;
    category: string;
    subCategory: string | null;
  }): void {

    // Find the full FAQ item to get the answerPath
    const faqItem = this.faqList.find(item => 
      item.question === sel.question && item.category === sel.category
    );
    
    if (faqItem) {
      // Use answer-based URL
      const answerSlug = this.getAnswerSlug(faqItem.answerPath);
      this.router.navigate(['/', answerSlug]);
    } else {
      // Fallback to old method if FAQ item not found
      const frag = this.slugify(sel.question);
      this.router.navigate(['/', sel.category], { fragment: frag });
    }

    setTimeout(() => this.openAndScroll(sel.question));
  }

  // 分享功能相关方法
  private updatePageMetadata(): void {
    let pageTitle = 'FAQ - Data Sync Pro';
    let pageDescription = 'Frequently Asked Questions about Data Sync Pro';

    if (this.current.category) {
      pageTitle = `${this.current.category} FAQ - Data Sync Pro`;
      pageDescription = `Frequently Asked Questions about ${this.current.category}`;

      if (this.current.subCategory) {
        pageTitle = `${this.current.subCategory} FAQ - Data Sync Pro`;
        pageDescription = `Frequently Asked Questions about ${this.current.subCategory}`;
      }
    }

    this.title.setTitle(pageTitle);
    this.meta.updateTag({ name: 'description', content: pageDescription });
    this.meta.updateTag({ property: 'og:title', content: pageTitle });
    this.meta.updateTag({ property: 'og:description', content: pageDescription });
    this.meta.updateTag({ property: 'og:url', content: window.location.href });
  }

  private handlePendingFragment(): void {
    if (this.pendingFragment && this.faqList.length > 0) {
      setTimeout(() => {
        this.scrollToAndExpandFAQ(this.pendingFragment!);
        this.pendingFragment = undefined;
        this.cdr.detectChanges();
      }, 100);
    }
  }




  private scrollToAndExpandFAQ(fragment: string): void {
    // When in a specific subcategory, search within filtered FAQ first to avoid confusion with duplicate questions
    const searchList = this.current.category ? this.filteredFAQ : this.faqList;
    
    // Try to find FAQ by slugified question in the current context
    let faqItem = searchList.find(item => this.slugify(item.question) === fragment);
    
    // If not found, try with the original fragment (might be already decoded)
    if (!faqItem) {
      faqItem = searchList.find(item => this.slugify(item.question) === this.slugify(fragment));
    }
    
    // If still not found, try finding by question text directly
    if (!faqItem) {
      faqItem = searchList.find(item => 
        item.question.toLowerCase().replace(/[^a-z0-9]+/g, '-') === fragment.toLowerCase().replace(/[^a-z0-9]+/g, '-')
      );
    }
    
    // If still not found and we were searching in filtered list, try in the full list as fallback
    if (!faqItem && this.current.category) {
      faqItem = this.faqList.find(item => this.slugify(item.question) === fragment);
    }
    
    if (!faqItem) {
      this.scrollToElement(fragment);
      return;
    }

    if (this.current.category !== faqItem.category ||
        (faqItem.subCategory && this.current.subCategory !== faqItem.subCategory)) {
      const answerSlug = this.getAnswerSlug(faqItem.answerPath);
      this.router.navigate(['/', answerSlug]);
      return;
    }

    // Navigate to the TOC page containing this FAQ
    this.navigateToFAQPage(faqItem);
    
    // Set current FAQ state
    this.current.faqItem = faqItem;
    this.current.faqTitle = faqItem.question;
    this.activeScrollElement = faqItem.question;

    this.showFAQDetail(faqItem);
    this.updateFAQMetadata(faqItem);
    this.scrollToElement(this.slugify(faqItem.question));
  }

  private updateFAQMetadata(faqItem: FAQItem): void {
    const pageTitle = `${faqItem.question} - FAQ - Data Sync Pro`;
    const pageDescription = faqItem.answer.substring(0, 160) + '...';

    this.title.setTitle(pageTitle);
    this.meta.updateTag({ name: 'description', content: pageDescription });
    this.meta.updateTag({ property: 'og:title', content: pageTitle });
    this.meta.updateTag({ property: 'og:description', content: pageDescription });
    this.meta.updateTag({ property: 'og:url', content: window.location.href });
  }

  getFAQShareUrl(faqItem: FAQItem): string {
    const answerSlug = this.getAnswerSlug(faqItem.answerPath);
    const baseUrl = window.location.origin;
    return `${baseUrl}/${answerSlug}`;
  }

  toggleSocialShare(faqItem: FAQItem): void {
    faqItem.showSocialShare = !faqItem.showSocialShare;

    this.faqList.forEach(item => {
      if (item.id !== faqItem.id) {
        item.showSocialShare = false;
      }
    });
  }

  copyFAQLink(faqItem: FAQItem): void {
    const shareUrl = this.getFAQShareUrl(faqItem);

    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(shareUrl).then(() => {
        this.showCopySuccess();
      }).catch(() => {
        this.fallbackCopyToClipboard(shareUrl);
      });
    } else {
      this.fallbackCopyToClipboard(shareUrl);
    }
    this.analyticsService.trackCustomEvent({
      eventType: 'faq_share',
      action: 'copy_link',
      faqQuestion: faqItem.question,
      faqCategory: faqItem.category,
      timestamp: new Date().toISOString()
    });
  }

  private fallbackCopyToClipboard(text: string): void {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
      document.execCommand('copy');
      this.showCopySuccess();
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }

    document.body.removeChild(textArea);
  }

  private showCopySuccess(): void {
    const toast = document.createElement('div');
    toast.textContent = '✅ Link copied to clipboard!';
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #28a745;
      color: white;
      padding: 12px 20px;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 500;
      z-index: 10000;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      animation: slideIn 0.3s ease;
    `;

    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
      }
    `;
    document.head.appendChild(style);

    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => {
        if (toast.parentNode) {
          document.body.removeChild(toast);
        }
        if (style.parentNode) {
          document.head.removeChild(style);
        }
      }, 300);
    }, 3000);
  }

  shareToSocial(platform: string, faqItem: FAQItem): void {
    const shareUrl = this.getFAQShareUrl(faqItem);
    const shareText = `Check out this FAQ: ${faqItem.question}`;

    let socialUrl = '';

    switch (platform) {
      case 'twitter':
        socialUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
        break;
      case 'facebook':
        socialUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
        break;
      case 'linkedin':
        socialUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
        break;
      case 'email':
        socialUrl = `mailto:?subject=${encodeURIComponent(shareText)}&body=${encodeURIComponent(shareUrl)}`;
        break;
    }

    if (socialUrl) {
      window.open(socialUrl, '_blank', 'width=600,height=400');

      this.analyticsService.trackCustomEvent({
        eventType: 'faq_share',
        action: `share_${platform}`,
        faqQuestion: faqItem.question,
        faqCategory: faqItem.category,
        platform: platform,
        timestamp: new Date().toISOString()
      });
    }
  }

  // Sidebar navigation methods
  selectCategory(categoryName: string): void {
    this.resetState();
    this.router.navigate(['/', this.encode(categoryName)]);
    
    if (this.ui.isMobile) {
      this.closeMobileSidebar();
    }
  }

  selectSubCategory(subCategoryName: string): void {
    this.resetState();
    
    if (this.current.category) {
      this.router.navigate(['/', this.encode(this.current.category), this.encode(subCategoryName)]);
    }
    
    if (this.ui.isMobile) {
      this.closeMobileSidebar();
    }
  }

  getSubCategoriesForCategory(categoryName: string): FAQSubCategory[] {
    const category = this.categories.find(cat => cat.name === categoryName);
    return category ? category.subCategories : [];
  }

  // Sidebar toggle functionality
  toggleSidebar(): void {
    const collapsed = !this.ui.sidebarCollapsed;
    this.updateUIState({ sidebarCollapsed: collapsed });
    // Save state to localStorage for persistence
    localStorage.setItem('faq-sidebar-collapsed', collapsed.toString());
  }

  toggleTOC(): void {
    const hidden = !this.ui.tocHidden;
    this.updateUIState({ tocHidden: hidden });
    // Save state to localStorage for persistence
    localStorage.setItem('faq-toc-hidden', hidden.toString());
    // Force change detection to ensure icon updates immediately
    this.cdr.detectChanges();
  }


  // Load sidebar and TOC state from localStorage
  private loadSidebarState(): void {
    const savedState = localStorage.getItem('faq-sidebar-collapsed');
    if (savedState !== null) {
      this.updateUIState({ sidebarCollapsed: savedState === 'true' });
    }
    
    const tocState = localStorage.getItem('faq-toc-hidden');
    if (tocState !== null) {
      this.updateUIState({ tocHidden: tocState === 'true' });
    }
  }

  // Mobile functionality
  private checkMobileView(): void {
    this.updateUIState({ isMobile: window.innerWidth <= 768 });
  }

  toggleMobileSidebar(): void {
    this.updateUIState({ mobileSidebarOpen: !this.ui.mobileSidebarOpen });
  }

  closeMobileSidebar(): void {
    this.updateUIState({ mobileSidebarOpen: false });
  }

  toggleMobileTOC(): void {
    this.updateUIState({ mobileTOCOpen: !this.ui.mobileTOCOpen });
  }

  closeMobileTOC(): void {
    this.updateUIState({ mobileTOCOpen: false });
  }

  @HostListener('window:resize', ['$event'])
  onResize(_event: any): void {
    this.checkMobileView();
    // Close mobile sidebar and TOC when switching to desktop
    if (!this.ui.isMobile) {
      this.updateUIState({ 
        mobileSidebarOpen: false,
        mobileTOCOpen: false 
      });
    }
  }

  // Keyboard shortcut for search overlay
  @HostListener('document:keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    const activeElement = document.activeElement;
    const isInputActive = activeElement && (
      activeElement.tagName === 'INPUT' || 
      activeElement.tagName === 'TEXTAREA' || 
      activeElement.getAttribute('contenteditable') === 'true'
    );

    // Ctrl+K or Cmd+K to open search overlay
    if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
      event.preventDefault();
      this.openSearchOverlay();
    }

    if (event.key === '/' && !isInputActive) {
      event.preventDefault();
      this.openSearchOverlay();
    }

    // Escape to close search overlay
    if (event.key === 'Escape' && this.search.isOpen) {
      this.updateSearchState({ isOpen: false });
    }
  }

  // ==================== TOC Pagination Methods ====================

  /**
   * Calculate pagination state for TOC
   */
  private calculateTOCPagination(totalItems: number): void {
    this.tocPagination.totalPages = Math.ceil(totalItems / this.tocPagination.itemsPerPage);
    
    // Ensure current page is within bounds
    if (this.tocPagination.currentPage > this.tocPagination.totalPages) {
      this.tocPagination.currentPage = 1;
    }
    
    this.updateTOCPaginationIndices();
  }


  /**
   * Check if previous page is available
   */
  get hasPreviousTOCPage(): boolean {
    return this.tocPagination.currentPage > 1;
  }

  /**
   * Check if next page is available
   */
  get hasNextTOCPage(): boolean {
    return this.tocPagination.currentPage < this.tocPagination.totalPages;
  }

  /**
   * Get current pagination info text
   */
  get tocPaginationInfo(): string {
    const totalItems = this.showHome ? this.trendingQuestions.length : this.currentFAQList.length;
    if (totalItems === 0) return '';
    
    const start = this.tocPagination.startIndex + 1;
    const end = Math.min(this.tocPagination.endIndex, totalItems);
    return `${start}-${end} of ${totalItems}`;
  }

  // ==================== TOC Pagination Methods ====================
  
  /**
   * Navigate to previous page in TOC pagination
   */
  goToPreviousTOCPage(): void {
    if (this.tocPagination.currentPage > 1) {
      this.tocPagination.currentPage--;
      this.updateTOCPaginationIndices();
      this.cdr.markForCheck();
    }
  }

  /**
   * Navigate to next page in TOC pagination
   */
  goToNextTOCPage(): void {
    if (this.tocPagination.currentPage < this.tocPagination.totalPages) {
      this.tocPagination.currentPage++;
      this.updateTOCPaginationIndices();
      this.cdr.markForCheck();
    }
  }

  /**
   * Update TOC pagination indices and total pages
   */
  private updateTOCPaginationIndices(): void {
    const totalItems = this.showHome ? this.trendingQuestions.length : this.currentFAQList.length;
    
    this.tocPagination.totalPages = Math.ceil(totalItems / this.tocPagination.itemsPerPage);
    this.tocPagination.startIndex = (this.tocPagination.currentPage - 1) * this.tocPagination.itemsPerPage;
    this.tocPagination.endIndex = this.tocPagination.startIndex + this.tocPagination.itemsPerPage;
  }

  /**
   * Get paginated trending questions for current page
   */
  get paginatedTrendingQuestions(): FAQItem[] {
    return this.trendingQuestions.slice(this.tocPagination.startIndex, this.tocPagination.endIndex);
  }

  /**
   * Get paginated current FAQ list for current page
   */
  get paginatedCurrentFAQList(): FAQItem[] {
    return this.currentFAQList.slice(this.tocPagination.startIndex, this.tocPagination.endIndex);
  }

  /**
   * Navigate to the TOC page containing the specified FAQ item
   */
  private navigateToFAQPage(faqItem: FAQItem): void {
    const faqList = this.showHome ? this.trendingQuestions : this.currentFAQList;
    const index = faqList.findIndex(item => item.id === faqItem.id);
    
    if (index >= 0) {
      const targetPage = Math.floor(index / this.tocPagination.itemsPerPage) + 1;
      if (targetPage !== this.tocPagination.currentPage) {
        this.tocPagination.currentPage = targetPage;
        this.updateTOCPaginationIndices();
        this.cdr.markForCheck();
      }
    }
  }

  // ==================== Debug Methods ====================
  
  /**
   * 调试方法：检查FAQ加载状态
   */
  debugFAQStatus(): void {
    
    // 显示前5个有问题的FAQ
    const problematicFAQs = this.faqList
      .filter(faq => !faq.safeAnswer && !faq.isLoading && faq.answerPath)
      .slice(0, 5);
    /*
    if (problematicFAQs.length > 0) {
      console.log('Problematic FAQs:', problematicFAQs.map(faq => ({
        id: faq.id,
        question: faq.question,
        answerPath: faq.answerPath
      })));
    }*/
  }

  // ==================== Table of Contents Methods ====================

  /**
   * 设置滚动监听器，用于实现滚动同步高亮
   */
  private setupScrollListener(): void {
    // This method is now merged into setupOptimizedScrollListener
    // Keep for backward compatibility but don't add actual listeners
  }

  /**
   * 高性能的活跃滚动元素更新（侧边栏同步优化）
   */
  private updateActiveScrollElementOptimized(scrollPosition: number): void {
    const offset = scrollPosition + 150; // 降低偏移量，提高响应性
    
    // Cache FAQ elements and their positions to avoid repeated queries
    if (!this.cachedFaqElements || this.cachedFaqElements.length === 0) {
      this.refreshFaqElementsCache();
    }
    
    let activeElement = '';
    let closestDistance = Infinity;

    // 使用二分查找和位置缓存优化查找性能
    if (!this.cachedFaqElements) return;
    
    for (let i = 0; i < this.cachedFaqElements.length; i++) {
      const element = this.cachedFaqElements[i];
      const rect = element.getBoundingClientRect();
      const absoluteTop = rect.top + scrollPosition;
      const absoluteBottom = absoluteTop + rect.height;
      
      // 检查元素是否在视口中或即将进入视口
      if (absoluteTop <= offset + 100 && absoluteBottom >= offset - 100) {
        const distance = Math.abs(absoluteTop - offset);
        
        // 选择最接近的元素作为活跃元素
        if (distance < closestDistance) {
          closestDistance = distance;
          // 使用预缓存的文本避免DOM查询
          const cachedText = this.cachedQuestionTexts.get(i);
          if (cachedText) {
            activeElement = cachedText;
          } else {
            // 回退到DOM查询（应该很少发生）
            const questionElement = element.querySelector('.faq-question');
            if (questionElement) {
              activeElement = questionElement.textContent || '';
              this.cachedQuestionTexts.set(i, activeElement);
            }
          }
        }
      }
    }

    // 立即更新活跃元素，无额外检查延迟
    if (activeElement && activeElement !== this.activeScrollElement) {
      this.activeScrollElement = activeElement;
      
      // 使用微任务确保DOM更新的及时性
      Promise.resolve().then(() => {
        this.cdr.markForCheck();
        
        // 确保TOC中的活跃项目滚动到视图中
        this.scrollActiveTOCItemIntoView();
      });
    }
  }
  
  /**
   * 确保TOC中的活跃项目滚动到视图中
   */
  private scrollActiveTOCItemIntoView(): void {
    // 查找活跃的TOC项目
    const activeTOCItem = document.querySelector('.faq-toc .toc-item.active');
    if (activeTOCItem) {
      // 使用scrollIntoView平滑滚动到活跃项目
      activeTOCItem.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest', // 只有在必要时才滚动
        inline: 'nearest'
      });
    }
  }

  /**
   * 刷新FAQ元素缓存
   */
  private refreshFaqElementsCache(): void {
    this.cachedFaqElements = Array.from(document.querySelectorAll('.faq-item'));
    
    // 预缓存问题文本以避免重复查询
    this.cachedQuestionTexts = new Map();
    this.cachedFaqElements.forEach((element, index) => {
      const questionElement = element.querySelector('.faq-question');
      if (questionElement) {
        this.cachedQuestionTexts.set(index, questionElement.textContent || '');
      }
    });
    
    // Only check for active element if user has scrolled
    // This prevents auto-highlighting on initial page load
    if (this.userHasScrolled) {
      requestAnimationFrame(() => {
        this.updateActiveScrollElementOptimized(window.pageYOffset);
      });
    }
  }

  // Cache FAQ elements to avoid repeated queries
  private cachedFaqElements: Element[] | null = null;
  private cachedQuestionTexts: Map<number, string> = new Map();

  /**
   * 判断是否为当前展开的FAQ（增强版，支持滚动同步和页脚感知）
   */
  isCurrentFAQ(item: FAQItem): boolean {
    // 首先检查是否是当前选中的FAQ
    if (this.current.faqTitle === item.question) {
      return true;
    }
    
    // 检查是否在页脚区域 - 如果是，不显示活跃状态
    const footerStatus = this.checkFooterProximity();
    if (footerStatus.inFooterZone) {
      return false; // 在页脚区域时，不显示任何FAQ为活跃状态
    }
    
    // 然后检查是否是当前滚动到的FAQ（用于自动高亮）
    if (this.activeScrollElement === item.question) {
      return true;
    }
    
    return false;
  }

  /**
   * 选择并显示指定FAQ项目（从右侧目录点击）
   */
  scrollToFAQ(item: FAQItem): void {
    // Mark that user has interacted - this enables TOC highlighting
    this.userHasScrolled = true;
    
    // Navigate to the TOC page containing this FAQ
    this.navigateToFAQPage(item);
    
    // 设置当前FAQ项目
    this.current.faqItem = item;
    this.current.faqTitle = item.question;
    this.activeScrollElement = item.question; // 立即设置活跃元素

    // 更新浏览器URL
    this.updateBrowserURL(item);

    // 跟踪FAQ查看
    this.trackFAQView(item);

    // Display FAQ content directly
    this.showFAQDetail(item);

    // Scroll to top instead of FAQ item for better navigation experience
    this.scrollToTop();

    // 加载FAQ内容（如果尚未加载）
    if (!item.safeAnswer && item.answerPath) {
      item.isLoading = true;

      this.faqService.getFAQContent(item.answerPath).pipe(
        takeUntil(this.destroy$)
      ).subscribe({
        next: (content) => {
          item.safeAnswer = content;
          item.isLoading = false;
          this.cdr.markForCheck();
        },
        error: (error) => {
          console.error('Failed to load FAQ content:', error);
          item.safeAnswer = this.sanitizer.bypassSecurityTrustHtml(
            '<p class="error-message">Failed to load content, please try again later</p>'
          );
          item.isLoading = false;
          this.cdr.markForCheck();
        }
      });
    }
  }

  /**
   * 快速滚动到页面顶部
   */
  private scrollToTop(): void {
    window.scrollTo({
      top: 0,
      behavior: 'auto' // 快速滚动，不使用平滑动画
    });
  }

  /**
   * Auto-scroll to the clicked FAQ item for better reading experience
   * This method intelligently chooses the best scroll target based on the context
   */
  private autoScrollToFAQItem(item: FAQItem): void {
    // Use a short delay to ensure DOM updates are complete
    setTimeout(() => {
      // Strategy 1: Try to find the FAQ item by its ID (slugified question)
      const slugifiedId = this.slugify(item.question);
      let targetElement = document.getElementById(slugifiedId);
      
      // Strategy 2: If not found by ID, try to find by question text in FAQ items
      if (!targetElement) {
        const faqItems = document.querySelectorAll('.faq-item');
        for (let i = 0; i < faqItems.length; i++) {
          const questionElement = faqItems[i].querySelector('.faq-question');
          if (questionElement && questionElement.textContent?.trim() === item.question) {
            targetElement = faqItems[i] as HTMLElement;
            break;
          }
        }
      }
      
      // Strategy 3: If still not found, look for the question header specifically
      if (!targetElement) {
        const questionHeaders = document.querySelectorAll('h3.faq-question');
        for (let i = 0; i < questionHeaders.length; i++) {
          if (questionHeaders[i].textContent?.trim() === item.question) {
            targetElement = questionHeaders[i] as HTMLElement;
            break;
          }
        }
      }
      
      // Strategy 4: Try to find by data attributes if available
      if (!targetElement) {
        const elementsWithDataId = document.querySelectorAll(`[data-faq-id="${item.id}"]`);
        if (elementsWithDataId.length > 0) {
          targetElement = elementsWithDataId[0] as HTMLElement;
        }
      }
      
      if (targetElement) {
        // Calculate optimal scroll position with header offset
        const headerOffset = 100; // Account for fixed header
        const elementRect = targetElement.getBoundingClientRect();
        const elementPosition = elementRect.top + window.pageYOffset;
        const optimalScrollPosition = Math.max(0, elementPosition - headerOffset);
        
        // Smooth scroll to the FAQ item
        window.scrollTo({
          top: optimalScrollPosition,
          behavior: 'smooth'
        });
        
        // Optional: Add visual feedback by briefly highlighting the target
        this.addVisualScrollFeedback(targetElement);
        
      } else {
        // Fallback: If no specific element found, scroll to top of FAQ section
        const faqMain = document.querySelector('.faq-main');
        if (faqMain) {
          const headerOffset = 80;
          const elementRect = faqMain.getBoundingClientRect();
          const elementPosition = elementRect.top + window.pageYOffset;
          const scrollPosition = Math.max(0, elementPosition - headerOffset);
          
          window.scrollTo({
            top: scrollPosition,
            behavior: 'smooth'
          });
          } else {
          // Final fallback: scroll to top
          this.scrollToTop();
        }
      }
    }, 150); // Small delay to ensure DOM is ready
  }

  /**
   * Add brief visual feedback to indicate successful scroll target
   */
  private addVisualScrollFeedback(element: HTMLElement): void {
    // Add a brief highlight effect to show the user which FAQ was targeted
    const originalBoxShadow = element.style.boxShadow;
    element.style.transition = 'box-shadow 0.3s ease';
    element.style.boxShadow = '0 0 0 3px rgba(26, 115, 232, 0.3)';
    
    // Remove the highlight after a short duration
    setTimeout(() => {
      element.style.boxShadow = originalBoxShadow;
      // Remove transition after effect is complete
      setTimeout(() => {
        element.style.transition = '';
      }, 300);
    }, 1000);
  }

  /**
   * 平滑滚动到指定FAQ元素
   */
  private smoothScrollToFAQElement(item: FAQItem): void {
    // 等待DOM更新后再滚动
    setTimeout(() => {
      const elementId = this.slugify(item.question);
      const element = document.getElementById(elementId);
      
      if (element) {
        const headerOffset = 100; // 考虑固定头部的高度
        const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
        const offsetPosition = elementPosition - headerOffset;

        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        });
      } else {
        // 如果找不到元素，尝试通过FAQ项目选择器查找
        const faqItems = document.querySelectorAll('.faq-item');
        for (let i = 0; i < faqItems.length; i++) {
          const questionElement = faqItems[i].querySelector('.faq-question');
          if (questionElement && questionElement.textContent === item.question) {
            const headerOffset = 100;
            const elementPosition = faqItems[i].getBoundingClientRect().top + window.pageYOffset;
            const offsetPosition = elementPosition - headerOffset;

            window.scrollTo({
              top: offsetPosition,
              behavior: 'smooth'
            });
            break;
          }
        }
      }
    }, 100);
  }


  /**
   * 选择热门问题
   */
  selectTrendingQuestion(item: FAQItem): void {
    // Mark that user has interacted - this enables TOC highlighting
    this.userHasScrolled = true;
    
    // Navigate to the TOC page containing this FAQ
    this.navigateToFAQPage(item);
    
    // 设置当前FAQ
    this.current.faqTitle = item.question;
    this.current.faqItem = item;
    this.activeScrollElement = item.question; // 立即设置活跃元素

    // 更新浏览器URL
    this.updateBrowserURL(item);

    // 跟踪FAQ查看
    this.trackFAQView(item);

    // Display FAQ content directly
    this.showFAQDetail(item);

    // Scroll to top instead of FAQ item for better navigation experience
    this.scrollToTop();
  }

  /**
   * TrackBy函数用于优化ngFor性能
   * 使用唯一的ID而不是问题文本，以支持相同问题在不同子类别中的正确显示
   */
  trackByFAQ(_index: number, item: FAQItem): string {
    return item.id;
  }

  // ==================== Footer Interaction Methods ====================

  private footerObserver?: IntersectionObserver;
  private footerAnimationFrame?: number;
  private optimizedScrollListener?: () => void;
  private lastScrollPosition = 0;
  private scrollTicking = false;

  /**
   * Setup optimized footer intersection observer
   */
  private setupFooterObserver(): void {
    if (typeof window === 'undefined' || typeof IntersectionObserver === 'undefined') {
      return;
    }

    // Clean up existing observer
    if (this.footerObserver) {
      this.footerObserver.disconnect();
    }

    this.footerObserver = new IntersectionObserver(
      (entries) => {
        // Simplified with fewer thresholds for better performance
        if (this.footerAnimationFrame) {
          cancelAnimationFrame(this.footerAnimationFrame);
        }
        
        this.footerAnimationFrame = requestAnimationFrame(() => {
          entries.forEach(entry => {
            this.handleFooterVisibility(entry);
          });
        });
      },
      {
        root: null,
        rootMargin: '50px 0px 0px 0px', // Reduced margin for less frequent triggering
        threshold: [0, 0.1, 0.5, 1.0] // Simplified thresholds - 4 instead of 101
      }
    );

    // Observe footer element with retry logic
    this.observeFooterWithRetry();
    
    // Setup single optimized scroll listener
    this.setupOptimizedScrollListener();
    
    // Initial check for footer position
    setTimeout(() => {
      this.checkFooterPositionDirectly();
    }, 100);
  }

  /**
   * Handle footer visibility changes with smooth upward movement
   */
  private handleFooterVisibility(entry: IntersectionObserverEntry): void {
    const footerRect = entry.boundingClientRect;
    const viewportHeight = window.innerHeight;
    
    // Calculate how much footer is visible from the bottom of viewport
    let footerOffset = 0;
    
    if (entry.isIntersecting) {
      // Footer is intersecting with viewport
      const footerTopInViewport = footerRect.top;
      
      if (footerTopInViewport < viewportHeight) {
        // Footer is visible, calculate how much space it needs
        footerOffset = Math.max(0, viewportHeight - footerTopInViewport);
        // Cap the offset to prevent excessive movement
        footerOffset = Math.min(footerOffset, footerRect.height);
      }
    }
    
    // Use the unified update method for consistency
    this.updateFooterOffsetOptimized(footerOffset);
  }

  /**
   * Easing function for smooth animation
   */
  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  /**
   * Setup single optimized scroll listener for all scroll-related functionality
   */
  private setupOptimizedScrollListener(): void {
    if (typeof window === 'undefined') return;
    
    this.optimizedScrollListener = () => {
      // Mark that user has scrolled - this enables TOC highlighting
      if (!this.userHasScrolled) {
        this.userHasScrolled = true;
      }
      
      if (!this.scrollTicking) {
        requestAnimationFrame(() => {
          const currentScrollPosition = window.pageYOffset;
          
          // Only process if scroll position changed (reduced threshold for better responsiveness)
          if (Math.abs(currentScrollPosition - this.lastScrollPosition) > 1) {
            this.handleOptimizedScroll(currentScrollPosition);
            this.lastScrollPosition = currentScrollPosition;
          }
          
          this.scrollTicking = false;
        });
        this.scrollTicking = true;
      }
    };
    
    window.addEventListener('scroll', this.optimizedScrollListener, { passive: true });
  }

  /**
   * Handle all scroll-related updates in one optimized function
   */
  private handleOptimizedScroll(scrollPosition: number): void {
    // 检查页脚区域状态
    const footerStatus = this.checkFooterProximity();
    
    // 根据页脚状态调整活跃元素更新逻辑
    if (!footerStatus.inFooterZone) {
      this.updateActiveScrollElementOptimized(scrollPosition);
    } else {
      // 在页脚区域，清除活跃状态
      this.clearActiveStateInFooterZone();
    }
    
    // 更新TOC状态基于页脚位置
    this.updateTOCFooterState(footerStatus);
    
    // Update breadcrumb sticky behavior
    this.updateBreadcrumbScrollState(scrollPosition);
    
    // 简化的页脚偏移更新（减少频率以提高性能）
    if (scrollPosition % 3 === 0) {
      this.updateFooterOffsetOptimized(footerStatus.footerOffset);
    }
  }

  /**
   * Update breadcrumb navigation scroll state for sticky behavior
   */
  private updateBreadcrumbScrollState(scrollPosition: number): void {
    const breadcrumbNav = document.querySelector('.breadcrumb-nav');
    if (breadcrumbNav) {
      // Add 'scrolled' class when user has scrolled down
      const scrollThreshold = 20; // Small threshold to avoid flickering
      if (scrollPosition > scrollThreshold) {
        breadcrumbNav.classList.add('scrolled');
      } else {
        breadcrumbNav.classList.remove('scrolled');
      }
    }
  }

  /**
   * Direct footer position check for immediate response
   */
  private checkFooterPositionDirectly(): void {
    const footerElement = document.querySelector('app-footer');
    if (!footerElement) return;
    
    const footerRect = footerElement.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    
    let footerOffset = 0;
    
    if (footerRect.top < viewportHeight) {
      // Footer is visible, calculate offset
      footerOffset = Math.max(0, viewportHeight - footerRect.top);
      footerOffset = Math.min(footerOffset, footerRect.height);
    }
    
    // Apply immediate offset update
    this.updateFooterOffsetOptimized(footerOffset);
  }

  /**
   * 检查页脚邻近状态（带缓存优化）
   */
  private checkFooterProximity(): { inFooterZone: boolean; approaching: boolean; footerOffset: number } {
    // 使用缓存减少DOM查询频率
    const now = Date.now();
    if (this.lastFooterStatus && (now - this.footerCheckDebounce) < 50) {
      return this.lastFooterStatus;
    }
    
    const footerElement = document.querySelector('app-footer') as HTMLElement;
    if (!footerElement) {
      const fallback = { inFooterZone: false, approaching: false, footerOffset: 0 };
      this.lastFooterStatus = fallback;
      this.footerCheckDebounce = now;
      return fallback;
    }
    
    const footerRect = footerElement.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const footerThreshold = 200; // 页脚感知阈值
    
    let footerOffset = 0;
    if (footerRect.top < viewportHeight) {
      footerOffset = Math.max(0, viewportHeight - footerRect.top);
      footerOffset = Math.min(footerOffset, footerRect.height);
    }
    
    const inFooterZone = footerRect.top < viewportHeight * 0.8; // 80%视口
    const approaching = footerRect.top < viewportHeight + footerThreshold;
    
    const result = { inFooterZone, approaching, footerOffset };
    this.lastFooterStatus = result;
    this.footerCheckDebounce = now;
    
    return result;
  }
  
  /**
   * 更新TOC的页脚状态
   */
  private updateTOCFooterState(footerStatus: { inFooterZone: boolean; approaching: boolean; footerOffset: number }): void {
    const tocElement = document.querySelector('.faq-toc.desktop-toc') as HTMLElement;
    if (!tocElement) return;
    
    // 根据页脚状态更新TOC类
    tocElement.classList.toggle('in-footer-zone', footerStatus.inFooterZone);
    tocElement.classList.toggle('footer-approaching', footerStatus.approaching);
    
    // 设置CSS变量用于高度调整
    if (footerStatus.approaching && footerStatus.footerOffset > 0) {
      document.documentElement.style.setProperty('--footer-overlap', `${footerStatus.footerOffset}px`);
    } else {
      document.documentElement.style.setProperty('--footer-overlap', '0px');
    }
  }
  
  /**
   * 在页脚区域清除活跃状态
   */
  private clearActiveStateInFooterZone(): void {
    if (this.activeScrollElement) {
      this.activeScrollElement = '';
      this.cdr.markForCheck();
    }
  }

  /**
   * 简化的页脚偏移更新
   */
  private updateFooterOffsetOptimized(footerOffset: number): void {
    // 设置简单的页脚可见性标志
    const isFooterVisible = footerOffset > 20;
    document.documentElement.style.setProperty('--footer-visible', isFooterVisible ? '1' : '0');
  }

  // Cache DOM elements to avoid repeated queries
  private cachedSidebar: Element | null = null;
  private cachedToc: Element | null = null;
  private lastFooterState: boolean | null = null;
  private lastFooterOffset: number | null = null;
  
  // 页脚状态缓存
  private lastFooterStatus: { inFooterZone: boolean; approaching: boolean; footerOffset: number } | null = null;
  private footerCheckDebounce: number = 0;

  /**
   * Observe footer with retry logic to ensure it's found
   */
  private observeFooterWithRetry(retries: number = 0): void {
    const maxRetries = 10;
    const delay = 200;
    
    const tryObserve = () => {
      const footerElement = document.querySelector('app-footer');
      if (footerElement && this.footerObserver) {
        this.footerObserver.observe(footerElement);
        return;
      }
      
      if (retries < maxRetries) {
        setTimeout(() => {
          this.observeFooterWithRetry(retries + 1);
        }, delay);
      }
    };
    
    tryObserve();
  }

  /**
   * Clean up footer observer and optimized scroll listener
   */
  private cleanupFooterObserver(): void {
    if (this.footerObserver) {
      this.footerObserver.disconnect();
      this.footerObserver = undefined;
    }
    
    if (this.footerAnimationFrame) {
      cancelAnimationFrame(this.footerAnimationFrame);
      this.footerAnimationFrame = undefined;
    }
    
    if (this.optimizedScrollListener) {
      window.removeEventListener('scroll', this.optimizedScrollListener);
      this.optimizedScrollListener = undefined;
    }
    
    // Clear cached elements
    this.cachedSidebar = null;
    this.cachedToc = null;
    this.cachedFaqElements = null;
    this.cachedQuestionTexts.clear();
    this.lastFooterState = null;
    this.lastFooterOffset = null;
    
    // Reset CSS variables and classes
    document.documentElement.style.removeProperty('--footer-offset');
    
    // Remove footer-visible classes using cached elements or query if needed
    if (this.cachedSidebar || (this.cachedSidebar = document.querySelector('.faq-sidebar'))) {
      this.cachedSidebar.classList.remove('footer-visible');
    }
    if (this.cachedToc || (this.cachedToc = document.querySelector('.faq-toc.desktop-toc'))) {
      this.cachedToc.classList.remove('footer-visible');
    }
  }

  // ========================
  // Preview Mode Methods
  // ========================


  /**
   * Setup preview mode with content from editor
   */
  private setupPreviewMode(faqId: string): void {
    
    // Get preview data from storage
    const previewData = this.previewService.getPreviewData(faqId);
    
    if (previewData) {
      
      // Update page title to indicate preview mode
      this.title.setTitle(`[Preview] ${previewData.question} - Data Sync Pro FAQ`);
      
      // Create virtual FAQ item for preview
      const previewFAQ: FAQItem = {
        id: previewData.faqId,
        name: previewData.faqId,
        question: previewData.question,
        category: previewData.category,
        subCategory: previewData.subCategory,
        answerPath: '', // No path needed for preview
        answer: '',
        safeAnswer: this.sanitizer.bypassSecurityTrustHtml(previewData.htmlContent)
      };
      
      // Set this as the current FAQ
      this.current.faqItem = previewFAQ;
      this.current.category = previewData.category;
      this.current.subCategory = previewData.subCategory || '';
      this.current.faqTitle = previewData.question;
      
      // Initialize FAQ list with preview item to avoid "no FAQ" message
      this.faqList = [previewFAQ];
      
      // Hide sidebar search results since we're showing preview
      this.search.isActive = false;
      this.search.isOpen = false;
      
      // Set UI state to show content
      this.ui.isLoading = false;
      
      // Force change detection
      this.cdr.markForCheck();
      
      
      // Setup storage listener for real-time updates
      this.setupPreviewUpdateListener(faqId);
    } else {
      console.error('❌ No preview data found in SessionStorage for faqId:', faqId);
      this.handleMissingPreviewData(faqId);
    }
  }

  /**
   * Handle case when preview data is not found
   */
  private handleMissingPreviewData(faqId: string): void {
    // Update page title
    this.title.setTitle('[Preview Error] Preview data not found - Data Sync Pro FAQ');
    
    // Create error FAQ item
    const errorFAQ: FAQItem = {
      id: faqId,
      name: faqId,
      question: 'Preview Data Not Found',
      category: 'Error',
      subCategory: '',
      answerPath: '',
      answer: '',
      safeAnswer: this.sanitizer.bypassSecurityTrustHtml(`
        <div style="text-align: center; padding: 2rem; border: 2px dashed #f0ad4e; border-radius: 8px; background: #fdf6e3;">
          <h3 style="color: #f0ad4e; margin-bottom: 1rem;">⚠️ Preview Data Not Found</h3>
          <p style="margin-bottom: 1rem; color: #666;">Unable to find preview data for FAQ ID <code>${faqId}</code> in session storage.</p>
          <p style="margin-bottom: 1.5rem; color: #666;">Please return to the editor and open preview again.</p>
          <button onclick="window.close()" style="background: #5bc0de; color: white; border: none; padding: 0.5rem 1rem; border-radius: 4px; cursor: pointer; margin-right: 0.5rem;">Close Preview</button>
          <button onclick="window.opener?.focus(); window.close();" style="background: #5cb85c; color: white; border: none; padding: 0.5rem 1rem; border-radius: 4px; cursor: pointer;">Back to Editor</button>
        </div>
      `)
    };
    
    // Set the error FAQ as current
    this.current.faqItem = errorFAQ;
    this.current.category = 'Error';
    this.current.subCategory = '';
    this.current.faqTitle = 'Preview Data Not Found';
    
    // Set single item list to avoid "no FAQ" message
    this.faqList = [errorFAQ];
    
    this.ui.isLoading = false;
    this.cdr.markForCheck();
  }

  /**
   * Listen for preview content updates from editor
   */
  private setupPreviewUpdateListener(faqId: string): void {
    
    // Enhanced storage event listener
    const handleStorageEvent = (event: StorageEvent) => {
      const sessionKey = `faq-preview-${faqId}`;
      const backupKey = `backup-faq-preview-${faqId}`;
      /*
      console.log('📡 Storage event received:', {
        key: event.key,
        hasNewValue: !!event.newValue,
        storageType: event.storageArea === sessionStorage ? 'sessionStorage' : 'localStorage'
      });
      */
      // Check both sessionStorage and localStorage keys
      if ((event.key === sessionKey || event.key === backupKey) && event.newValue) {
        try {
          const updatedData: PreviewData = JSON.parse(event.newValue);
          
          this.updatePreviewContent(updatedData);
        } catch (error) {
          console.error('❌ Error parsing preview update data:', error);
        }
      }
    };

    // Listen for storage events (cross-tab communication)
    window.addEventListener('storage', handleStorageEvent);
    
    // Enhanced periodic check for updates (fallback mechanism)
    const updateInterval = setInterval(() => {
      this.checkForPreviewUpdates(faqId);
    }, 1000); // Increased frequency to 1 second for better responsiveness
    
    // Clean up interval on destroy
    this.destroy$.pipe(takeUntil(this.destroy$)).subscribe(() => {
      clearInterval(updateInterval);
      window.removeEventListener('storage', handleStorageEvent);
    });
  }

  /**
   * Update preview content with new data
   */
  private updatePreviewContent(updatedData: PreviewData): void {
    if (!this.current.faqItem) return;

    
    // Update the current FAQ item with new content
    this.current.faqItem.question = updatedData.question;
    this.current.faqItem.safeAnswer = this.sanitizer.bypassSecurityTrustHtml(updatedData.htmlContent);
    
    // Update page title
    this.title.setTitle(`[Preview] ${updatedData.question} - Data Sync Pro FAQ`);
    
    // Update timestamp
    this.setPreviewTimestamp(updatedData.timestamp);
    
    // Trigger change detection
    this.cdr.markForCheck();
    
    // Force DOM update
    this.cdr.detectChanges();
    
  }

  /**
   * Check for preview updates (fallback mechanism)
   */
  private checkForPreviewUpdates(faqId: string): void {
    const currentData = this.previewService.getPreviewData(faqId);
    if (!currentData || !this.current.faqItem) return;

    const currentTimestamp = this.getPreviewTimestamp();
    
    if (currentData.timestamp > currentTimestamp) {
      this.updatePreviewContent(currentData);
    }
  }

  /**
   * Get preview timestamp for comparison
   */
  private getPreviewTimestamp(): number {
    return (this.current.faqItem as any)?._previewTimestamp || 0;
  }

  /**
   * Set preview timestamp
   */
  private setPreviewTimestamp(timestamp: number): void {
    if (this.current.faqItem) {
      (this.current.faqItem as any)._previewTimestamp = timestamp;
    }
  }

  /**
   * Check if currently in preview mode
   */
  isPreviewMode(): boolean {
    return this.route.snapshot.queryParams['preview'] === 'true';
  }



}

