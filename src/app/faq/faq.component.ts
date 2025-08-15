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
import { MatExpansionPanel } from '@angular/material/expansion';
import { DomSanitizer } from '@angular/platform-browser';
import { AnalyticsService } from '../analytics.service';
import { Meta, Title } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, fromEvent } from 'rxjs';
import { takeUntil, debounceTime } from 'rxjs/operators';

// 导入统一的模型和服务
import { FAQItem, FAQCategory, FAQSubCategory } from '../shared/models/faq.model';
import { FAQService } from '../shared/services/faq.service';
import { PerformanceService } from '../shared/services/performance.service';

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
    sidebarCollapsed: false,
    mobileSidebarOpen: false,
    mobileTOCOpen: false,
    isMobile: false,
    tocHidden: false
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

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private sanitizer: DomSanitizer,
    private analyticsService: AnalyticsService,
    private faqService: FAQService,
    private meta: Meta,
    private title: Title,
    private cdr: ChangeDetectorRef,
    private performanceService: PerformanceService
  ) {}

  ngOnInit(): void {
    this.initFaqData();
    this.loadRatingsFromLocalStorage();
    this.cleanupFavoriteData();
    this.loadSidebarState();
    this.checkMobileView();
    this.setupScrollListener();
    this.setupFooterObserver();
    this.setupOptimizedScrollListener();
    this.setupNavLinkHandler();

    this.route.paramMap.pipe(
      takeUntil(this.destroy$)
    ).subscribe(params => {
      this.current.category = params.get('cat') ? this.safeDecodeURIComponent(params.get('cat')!) : '';
      this.current.subCategory = params.get('subCat') ? this.safeDecodeURIComponent(params.get('subCat')!) : '';
      
      // Update TOC pagination when navigation changes
      this.updateTOCPaginationIndices();
      this.cdr.detectChanges();
      
      this.updatePageMetadata();
    });

    // 处理URL片段，自动展开对应的FAQ项目
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
    // 延迟初始化缓存，确保DOM完全渲染
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
    
    // Clean up intersection observer
    if (this.expansionPanels) {
      this.expansionPanels.forEach(panel => {
        const element = (panel as any)._elementRef?.nativeElement;
        if (element) {
          this.faqService.unobserveElement(element);
        }
      });
    }
    
    // Clean up footer observer
    this.cleanupFooterObserver();
    
    // Clean up nav link handler
    this.cleanupNavLinkHandler();
  }

  private initFaqData(): void {
    this.updateUIState({ isLoading: true });

    // 使用新的FAQ服务
    this.faqService.getFAQs().pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (faqs) => {
        this.faqList = faqs;
        this.updateUIState({ isLoading: false });
        
        // Initialize TOC pagination when data is loaded
        this.updateTOCPaginationIndices();
        
        // Clear cached elements when FAQ data changes
        this.cachedFaqElements = null;
        this.cachedQuestionTexts.clear();
        
        // 数据加载完成后处理pending fragment
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

    // 加载分类信息
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
  private encode = (s: string) => encodeURIComponent(s.trim());
  
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
    
    this.closeAllFAQPanels();
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


  private closeAllFAQPanels(): void {
    setTimeout(() => {
      if (!this.expansionPanels) return;
      
      this.expansionPanels.forEach(panel => {
        if (panel.expanded) {
          panel.close();
        }
      });
    }, 0);
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

  // 计算搜索相关性评分
  private calculateRelevanceScore(item: FAQItem, query: string): { score: number; matchType: 'title' | 'content' | 'category'; matchedText: string } {
    const lowerQuery = query.toLowerCase();
    const lowerQuestion = item.question.toLowerCase();
    const lowerAnswer = item.answer.toLowerCase();
    const lowerCategory = item.category.toLowerCase();
    const lowerSubCategory = item.subCategory?.toLowerCase() || '';

    let score = 0;
    let matchType: 'title' | 'content' | 'category' = 'content';
    let matchedText = '';

    // 标题完全匹配 - 最高分
    if (lowerQuestion === lowerQuery) {
      score = 100;
      matchType = 'title';
      matchedText = item.question;
    }
    // 标题开头匹配 - 高分
    else if (lowerQuestion.startsWith(lowerQuery)) {
      score = 90;
      matchType = 'title';
      matchedText = item.question;
    }
    // 标题包含匹配 - 中高分
    else if (lowerQuestion.includes(lowerQuery)) {
      score = 80;
      matchType = 'title';
      matchedText = item.question;
    }
    // 分类匹配 - 中分
    else if (lowerCategory.includes(lowerQuery) || lowerSubCategory.includes(lowerQuery)) {
      score = 60;
      matchType = 'category';
      matchedText = item.category + (item.subCategory ? ` > ${item.subCategory}` : '');
    }
    // 答案内容匹配 - 低分
    else if (lowerAnswer.includes(lowerQuery)) {
      score = 40;
      matchType = 'content';
      // 提取匹配的上下文
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

  // TOC 优化的计算属性
  private _cachedTrendingQuestions?: FAQItem[];
  private _lastFaqListLength?: number;

  get trendingQuestions(): FAQItem[] {
    // 缓存热门问题，只有当FAQ列表变化时才重新计算
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
    // 移动设备使用抽屉式TOC，这里返回false
    if (this.ui.isMobile) {
      return false;
    }

    // 搜索状态不显示
    if (this.search.isActive || this.search.query.trim()) {
      return false;
    }

    // 首页显示trending questions
    if (this.showHome) {
      return this.trendingQuestions.length > 0;
    }

    // 分类页面显示分类TOC
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

    // 如果有搜索查询，使用智能搜索
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

  // 智能搜索方法
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

    if (exactMatch) {
      setTimeout(() => this.expandFAQPanel(exactMatch), 100);
    }

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
      this.cdr.markForCheck(); // 触发变更检测显示加载状态

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
          this.cdr.markForCheck(); // 确保错误状态也能更新UI
        }
      });
    }
  }

  navigateToFAQ(item: FAQItem): void {
    // Mark that user has interacted - this enables TOC highlighting
    this.userHasScrolled = true;
    
    // 增加查看次数
    if (!item.viewCount) {
      item.viewCount = 0;
    }
    item.viewCount++;

    // 设置当前FAQ
    this.updateCurrentState({
      faqTitle: item.question,
      faqItem: item
    });

    // 强制刷新缓存以确保滚动同步准确性
    this.refreshFaqElementsCache();

    // 更新浏览器URL
    this.updateBrowserURL(item);

    // 跟踪FAQ查看
    this.trackFAQView(item);

    // Scroll to top instead of FAQ item for better navigation experience
    this.scrollToTop();
  }

  onFaqClosed(): void {
    // FAQ关闭时，检查是否还有其他展开的FAQ
    setTimeout(() => {
      const hasOpenPanels = this.expansionPanels?.some(panel => panel.expanded);
      if (!hasOpenPanels) {
        // If no expanded FAQ, remove fragment from URL
        this.clearBrowserURLFragment();
        // Clear current FAQ title
        this.current.faqTitle = '';
        this.current.faqItem = null;
      }
    }, 100);
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
    const fragment = this.slugify(item.question);
    // Use current category/subcategory if already in a specific subcategory view
    // This ensures clicking a FAQ in Preview subcategory stays in Preview
    const category = this.current.category || item.category;
    const subCategory = this.current.subCategory || item.subCategory;
    const url = this.buildFAQUrl(category, subCategory);
    
    this.router.navigate([url], {
      fragment: fragment,
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
      url += `/${encodeURIComponent(category)}`;
      if (subCategory) {
        url += `/${encodeURIComponent(subCategory)}`;
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
    setTimeout(() => this.expandFAQPanel(faqItem), 500);
  }



  selectSuggestion(suggestion: string): void {
    this.search.query = suggestion;
    this.search.showSuggestions = false;
    this.search.selectedIndex = -1;

    const faqItem = this.faqList.find(item => item.question === suggestion);
    if (faqItem) {
      this.expandFAQPanel(faqItem);
      this.onFaqOpened(faqItem);
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
    // 设置初始查询
    this.searchOverlayInitialQuery = initialQuery || '';
    this.updateSearchState({ isOpen: true });
  }

  closeSearchOverlay(): void {
    this.searchOverlayInitialQuery = ''; // 清空初始查询
    this.updateSearchState({ isOpen: false });
  }
  @ViewChild('faqSearchBox') faqSearchBox!: ElementRef<HTMLInputElement>;
  @ViewChildren(MatExpansionPanel) expansionPanels!: QueryList<MatExpansionPanel>;

  slugify(s: string): string {
    return s.toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
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
        const panel = this.expansionPanels.toArray()[idx];
        
        // Open the panel
        panel.open();
        
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
  
    const cat = sel.category;
    const sub = sel.subCategory ?? '';
    const frag= this.slugify(sel.question);
  
    this.router.navigate(
      sub ? ['/', cat, sub] : ['/', cat],
      { fragment: frag }
    );
  
    this.search.isOpen = false;
  
    setTimeout(() => this.openAndScroll(sel.question, sel.id));
  }
  
  
  handleTrendingSelect(sel: {
    question: string;
    category: string;
    subCategory: string | null;
  }): void {

    const frag = this.slugify(sel.question);

    this.router.navigate(['/', sel.category], { fragment: frag });

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
      // 立即处理fragment，不需要长时间延迟
      setTimeout(() => {
        this.scrollToAndExpandFAQ(this.pendingFragment!);
        this.pendingFragment = undefined;
        // 确保UI立即更新
        this.cdr.detectChanges();
      }, 100); // 减少延迟时间，只等待DOM更新
    }
  }

  private expandFAQPanel(faqItem: FAQItem): void {
    setTimeout(() => {
      if (!this.expansionPanels) return;
      
      const panels = this.expansionPanels.toArray();
      const faqList = this.current.category ? this.filteredFAQ : this.allFaqList;
      const targetIndex = faqList.findIndex(item => item.id === faqItem.id);

      if (targetIndex >= 0 && panels[targetIndex]) {
        panels[targetIndex].open();
      }
    }, 50);
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
      const url = this.buildFAQUrl(faqItem.category, faqItem.subCategory);
      this.router.navigate([url], { fragment: this.slugify(faqItem.question) });
      return;
    }

    // Navigate to the TOC page containing this FAQ
    this.navigateToFAQPage(faqItem);
    
    // Set current FAQ state
    this.current.faqItem = faqItem;
    this.current.faqTitle = faqItem.question;
    this.activeScrollElement = faqItem.question;

    this.expandFAQPanel(faqItem);
    this.onFaqOpened(faqItem);
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
    const fragment = this.slugify(faqItem.question);
    const baseUrl = window.location.origin;
    const url = this.buildFAQUrl(faqItem.category, faqItem.subCategory);
    return `${baseUrl}${url}#${fragment}`;
  }

  toggleSocialShare(faqItem: FAQItem): void {
    faqItem.showSocialShare = !faqItem.showSocialShare;

    // 关闭其他FAQ的社交分享下拉菜单
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

    // 跟踪分享事件
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
    // 创建临时的成功提示
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

    // 添加动画样式
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

    // 3秒后移除提示
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

      // 跟踪分享事件
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
    // 检查是否在输入框中，如果是则跳过处理
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

    // / 键打开搜索（仅当不在输入框中时）
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
    
    if (problematicFAQs.length > 0) {
      console.log('Problematic FAQs:', problematicFAQs.map(faq => ({
        id: faq.id,
        question: faq.question,
        answerPath: faq.answerPath
      })));
    }
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

    // 展开对应的FAQ面板
    this.expandFAQPanel(item);

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

    // 展开对应的FAQ面板
    this.expandFAQPanel(item);

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


}

