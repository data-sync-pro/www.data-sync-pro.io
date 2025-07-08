import {
  Component,
  ViewChild,
  ElementRef,
  HostListener,
  OnInit,
  OnDestroy,
  ViewEncapsulation,
  ViewChildren,
  QueryList
} from '@angular/core';
import { MatExpansionPanel } from '@angular/material/expansion';
import { DomSanitizer } from '@angular/platform-browser';
import { AnalyticsService } from '../analytics.service';
import { Meta, Title } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

// 导入统一的模型和服务
import { FAQItem, FAQCategory } from '../shared/models/faq.model';
import { FAQService } from '../shared/services/faq.service';

@Component({
  selector: 'app-faq',
  templateUrl: './faq.component.html',
  styleUrls: ['./faq.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class FaqComponent implements OnInit, OnDestroy {
  searchQuery = '';
  searchFocused = false;

  currentCategory = '';
  currentSubCategory = '';

  faqList: FAQItem[] = [];
  categories: FAQCategory[] = [];

  suggestions: string[] = [];
  showSuggestions = false;
  selectedSuggestionIndex = -1;
  isSearchOpen = false;
  isLoading = false;

  private searchTimeout: any;
  private destroy$ = new Subject<void>();
  private pendingFragment?: string;
  private isTransitioning = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private sanitizer: DomSanitizer,
    private analyticsService: AnalyticsService,
    private faqService: FAQService,
    private meta: Meta,
    private title: Title
  ) {}

  ngOnInit(): void {
    this.initFaqData();
    this.loadRatingsFromLocalStorage();
    this.cleanupFavoriteData();

    this.route.paramMap.pipe(
      takeUntil(this.destroy$)
    ).subscribe(p => {
      this.currentCategory    = p.get('cat')    ?? '';
      this.currentSubCategory = p.get('subCat') ?? '';
      this.updatePageMetadata();
    });

    // 处理URL片段，自动展开对应的FAQ项目
    this.route.fragment.pipe(
      takeUntil(this.destroy$)
    ).subscribe(fragment => {
      if (fragment) {
        this.pendingFragment = fragment;
        this.handlePendingFragment();
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initFaqData(): void {
    this.isLoading = true;

    // 使用新的FAQ服务
    this.faqService.getFAQs().pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (faqs) => {
        this.faqList = faqs;
        this.isLoading = false;
        // 数据加载完成后处理pending fragment
        this.handlePendingFragment();
      },
      error: (error) => {
        console.error('Failed to load FAQ data:', error);
        this.isLoading = false;
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
  goHome(): void { this.router.navigate(['/faq']); }
  
  goCategory(cat: string) {          
    this.router.navigate(['/faq', this.encode(cat)]);
  }
  
  goSub(cat: string, sub: string) {
    this.router.navigate(['/faq', this.encode(cat), this.encode(sub)]);
  }

  get categoryNames(): string[] {
    return this.categories.map(cat => cat.name);
  }

  get allFaqList(): FAQItem[] {
    return this.faqList;
  }

  get filteredFAQ(): FAQItem[] {
    const q = this.searchQuery.toLowerCase().trim();
    return this.faqList.filter(item => {

      if (this.currentCategory && item.category !== this.currentCategory) return false;

      if (this.currentSubCategory && item.subCategory !== this.currentSubCategory) return false;

      if (q) {
        return (
          item.question.toLowerCase().includes(q) ||
          item.answer.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }

  pickCategory(cat: string): void {
    this.currentCategory = cat;
    this.currentSubCategory = '';
  }

  clearCategory(): void {
    this.currentCategory = '';
    this.currentSubCategory = '';
  }

  pickSubCategory(subCat: string): void {
    this.currentSubCategory = subCat;
  }
  

  onFaqOpened(item: FAQItem): void {
    // Update browser URL
    this.updateBrowserURL(item);

    // Track FAQ view
    this.trackFAQView(item);

    // Handle FAQ transition smoothly
    this.smoothFAQTransition(item);

    // Load FAQ content
    if (!item.safeAnswer && item.answerPath) {
      item.isLoading = true;

      this.faqService.getFAQContent(item.answerPath).pipe(
        takeUntil(this.destroy$)
      ).subscribe({
        next: (content) => {
          item.safeAnswer = content;
          item.isLoading = false;
        },
        error: (error) => {
          console.error('Failed to load FAQ content:', error);
          item.safeAnswer = this.sanitizer.bypassSecurityTrustHtml(
            '<p class="error-message">Failed to load content, please try again later</p>'
          );
          item.isLoading = false;
        }
      });
    }
  }

  onFaqClosed(): void {
    // FAQ关闭时，检查是否还有其他展开的FAQ
    setTimeout(() => {
      const hasOpenPanels = this.expansionPanels?.some(panel => panel.expanded);
      if (!hasOpenPanels) {
        // 如果没有展开的FAQ，移除URL中的fragment
        this.clearBrowserURLFragment();
      }
    }, 100);
  }

  private smoothFAQTransition(targetItem: FAQItem): void {
    // 防止并发过渡动画
    if (this.isTransitioning) {
      return;
    }

    // 第一步：检查是否有其他展开的FAQ
    const hasOtherOpenPanels = this.expansionPanels?.some(panel =>
      panel.expanded && this.getFAQItemFromPanel(panel)?.id !== targetItem.id
    );

    if (hasOtherOpenPanels) {
      // 如果有其他展开的FAQ，执行平滑切换
      this.isTransitioning = true;
      this.performSmoothTransition(targetItem);

      // 500ms后重置状态
      setTimeout(() => {
        this.isTransitioning = false;
      }, 500);
    } else {
      // 如果没有其他展开的FAQ，直接滚动到目标位置
      this.scrollToFAQTitle(targetItem);
    }
  }

  private performSmoothTransition(targetItem: FAQItem): void {
    const fragment = this.slugify(targetItem.question);
    const targetElement = document.getElementById(fragment);

    if (!targetElement) return;

    // 第一步：计算最终滚动位置（考虑其他FAQ关闭后的布局变化）
    const finalScrollPosition = this.calculateFinalScrollPosition(targetElement);

    // 第二步：开始关闭其他FAQ
    this.closeOtherFAQPanels(targetItem);

    // 第三步：在关闭动画进行时，开始渐进式滚动
    this.performProgressiveScroll(targetElement, finalScrollPosition);
  }

  private calculateFinalScrollPosition(targetElement: HTMLElement): number {
    const elementRect = targetElement.getBoundingClientRect();
    const viewportHeight = window.innerHeight;

    // 计算理想的偏移量（视口高度的12%，确保标题在第二位置）
    const idealOffset = Math.min(100, viewportHeight * 0.12);

    // 估算其他FAQ关闭后可能节省的空间
    const estimatedSpaceSaved = this.estimateSpaceSavedFromClosing();

    // 计算最终滚动位置
    const targetScrollTop = window.scrollY + elementRect.top - idealOffset - estimatedSpaceSaved;

    return Math.max(0, targetScrollTop);
  }

  private estimateSpaceSavedFromClosing(): number {
    if (!this.expansionPanels) return 0;

    let estimatedHeight = 0;
    this.expansionPanels.forEach(panel => {
      if (panel.expanded) {
        // 估算每个展开的FAQ内容高度（平均值）
        estimatedHeight += 200; // 大概的内容高度
      }
    });

    return Math.min(estimatedHeight, 300); // 限制最大估算值
  }

  private performProgressiveScroll(targetElement: HTMLElement, finalPosition: number): void {
    const startPosition = window.scrollY;
    const distance = finalPosition - startPosition;

    // 如果距离很小，直接跳过滚动
    if (Math.abs(distance) < 30) return;

    // 分阶段滚动：先快速接近，再精确定位

    // 第一阶段：立即滚动到中间位置（50ms内）
    const intermediatePosition = startPosition + (distance * 0.6);
    window.scrollTo({
      top: intermediatePosition,
      behavior: 'smooth'
    });

    // 第二阶段：等待关闭动画进行一半时，继续滚动（150ms后）
    setTimeout(() => {
      const secondStagePosition = startPosition + (distance * 0.85);
      window.scrollTo({
        top: secondStagePosition,
        behavior: 'smooth'
      });
    }, 150);

    // 第三阶段：最终精确定位（300ms后，关闭动画基本完成）
    setTimeout(() => {
      // 重新计算位置，因为DOM可能已经改变
      const currentRect = targetElement.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const idealOffset = Math.min(100, viewportHeight * 0.12);
      const finalScrollTop = window.scrollY + currentRect.top - idealOffset;

      window.scrollTo({
        top: Math.max(0, finalScrollTop),
        behavior: 'smooth'
      });
    }, 300);
  }

  private getFAQItemFromPanel(panel: MatExpansionPanel): FAQItem | null {
    if (!this.expansionPanels) return null;

    const panels = this.expansionPanels.toArray();
    const panelIndex = panels.indexOf(panel);

    if (panelIndex >= 0) {
      const faqList = this.currentCategory ? this.filteredFAQ : this.allFaqList;
      return faqList[panelIndex] || null;
    }

    return null;
  }

  private scrollToFAQTitle(item: FAQItem): void {
    // 等待DOM更新后滚动到FAQ标题
    setTimeout(() => {
      const fragment = this.slugify(item.question);
      const element = document.getElementById(fragment);

      if (element) {
        // 滚动到FAQ标题，确保标题在视口的上方第二个位置
        this.scrollToSecondPosition(element);
      }
    }, 200); // 给足够时间让expansion panel动画完成
  }

  private closeOtherFAQPanels(currentItem: FAQItem): void {
    // 等待ViewChildren初始化
    setTimeout(() => {
      if (this.expansionPanels) {
        const panels = this.expansionPanels.toArray();

        // 根据当前页面类型确定使用哪个FAQ列表
        const faqList = this.currentCategory ? this.filteredFAQ : this.allFaqList;
        const currentIndex = faqList.findIndex(item => item.id === currentItem.id);

        // 关闭除当前FAQ外的所有其他FAQ
        panels.forEach((panel, index) => {
          if (index !== currentIndex && panel.expanded) {
            panel.close();
          }
        });
      }
    }, 50);
  }

  private updateBrowserURL(item: FAQItem): void {
    const fragment = this.slugify(item.question);

    // 构建新的URL路径
    let newUrl = '/faq';
    if (item.category) {
      newUrl += `/${encodeURIComponent(item.category)}`;
      if (item.subCategory) {
        newUrl += `/${encodeURIComponent(item.subCategory)}`;
      }
    }

    // 使用Router.navigate更新URL，但不触发导航
    this.router.navigate([newUrl], {
      fragment: fragment,
      replaceUrl: true // 替换当前历史记录，而不是添加新的
    });
  }

  private clearBrowserURLFragment(): void {
    // 构建当前URL路径（不包含fragment）
    let currentUrl = '/faq';
    if (this.currentCategory) {
      currentUrl += `/${encodeURIComponent(this.currentCategory)}`;
      if (this.currentSubCategory) {
        currentUrl += `/${encodeURIComponent(this.currentSubCategory)}`;
      }
    }

    // 移除fragment
    this.router.navigate([currentUrl], {
      replaceUrl: true
    });
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
    this.searchFocused = false;
    // Delay hiding suggestions to allow for click events
    setTimeout(() => {
      this.showSuggestions = false;
    }, 200);
  }

  onSearchFocus(): void {
    this.searchFocused = true;
    if (this.searchQuery.trim()) {
      this.updateSuggestions();
    }
  }

  onSearchInput(event: any): void {
    this.searchQuery = event.target.value;
    this.updateSuggestions();
  }

  onSearchKeydown(event: KeyboardEvent): void {
    if (!this.showSuggestions || this.suggestions.length === 0) return;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.selectedSuggestionIndex = Math.min(
          this.selectedSuggestionIndex + 1,
          this.suggestions.length - 1
        );
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.selectedSuggestionIndex = Math.max(this.selectedSuggestionIndex - 1, -1);
        break;
      case 'Enter':
        event.preventDefault();
        if (this.selectedSuggestionIndex >= 0) {
          this.selectSuggestion(this.suggestions[this.selectedSuggestionIndex]);
        }
        break;
      case 'Escape':
        this.showSuggestions = false;
        this.selectedSuggestionIndex = -1;
        break;
    }
  }

  private updateSuggestions(): void {
    const query = this.searchQuery.toLowerCase().trim();
    if (query.length < 2) {
      this.suggestions = [];
      this.showSuggestions = false;
      return;
    }

    // Debounce search to improve performance
    clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => {
      this.suggestions = this.faqList
        .filter(item =>
          item.question.toLowerCase().includes(query) ||
          item.category.toLowerCase().includes(query) ||
          (item.subCategory && item.subCategory.toLowerCase().includes(query))
        )
        .map(item => item.question)
        .slice(0, 8); // Limit to 8 suggestions

      this.showSuggestions = this.suggestions.length > 0;
      this.selectedSuggestionIndex = -1;
    }, 300);
  }

  selectSuggestion(suggestion: string): void {
    this.searchQuery = suggestion;
    this.showSuggestions = false;
    this.selectedSuggestionIndex = -1;

    // Find and expand the corresponding FAQ
    const faqItem = this.faqList.find(item => item.question === suggestion);
    if (faqItem) {
      // Scroll to the FAQ item
      setTimeout(() => {
        const element = document.getElementById(this.slugify(faqItem.question));
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
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

  @HostListener('document:keydown', ['$event'])
  onGlobalKeydown(event: KeyboardEvent): void {
    // Focus search on '/' key press
    if (event.key === '/' && !this.isInputFocused()) {
      event.preventDefault();
      this.focusSearch();
    }
  }

  private isInputFocused(): boolean {
    const activeElement = document.activeElement as HTMLElement;
    return activeElement?.tagName === 'INPUT' ||
           activeElement?.tagName === 'TEXTAREA' ||
           activeElement?.contentEditable === 'true';
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

  /**
   * Clean up data related to removed favorite functionality
   */
  private cleanupFavoriteData(): void {
    // Remove favorite data from localStorage since favorite functionality has been removed
    localStorage.removeItem('faqFavorites');
  }

  toRegistryKey(answer: string): string {
    return answer.replace(/\.html$/, '').toLowerCase();
  }
  openSearchOverlay() {
    this.isSearchOpen = true;
  }

  closeSearchOverlay() {
    this.isSearchOpen = false;
  }
  @ViewChild('faqSearchBox') faqSearchBox!: ElementRef<HTMLInputElement>;
  @ViewChildren(MatExpansionPanel) expansionPanels!: QueryList<MatExpansionPanel>;

  @HostListener('document:keydown', ['$event']) handleSlash(event: KeyboardEvent) {      
    if (event.key === '/' && !event.ctrlKey && !event.metaKey && !event.altKey && this.isTypingField(event.target)) {      
      event.preventDefault();      
      this.openSearch();      
    }
  }
  private isTypingField(t: EventTarget | null): boolean {
    if (!t || !(t as HTMLElement)) return true;
    const tag = (t as HTMLElement).tagName.toLowerCase();
    return (
      tag !== 'input' &&
      tag !== 'textarea' &&
      !(t as HTMLElement).isContentEditable
    );
  }
  slugify(s: string): string {
    return s.toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
  }
  private openSearch() {
    this.faqSearchBox.nativeElement.focus();
    this.searchFocused = true;
    this.showSuggestions = !!this.searchQuery.trim();
  }

  @ViewChildren(MatExpansionPanel) panels!: QueryList<MatExpansionPanel>;
  @ViewChildren(MatExpansionPanel, { read: ElementRef })
  panelEls!: QueryList<ElementRef<HTMLElement>>;

  
  get showHome(): boolean {
    return (
      !this.currentCategory && !this.currentSubCategory && !this.searchQuery
    );
  }

  private openAndScroll(question: string): void {
    setTimeout(() => {
      const idx = this.filteredFAQ.findIndex(f => f.question === question);
      if (idx >= 0) {
        const panel  = this.panels.toArray()[idx];
        const panelEl= this.panelEls.toArray()[idx].nativeElement;
  
        panel.open();                                          // 展开
        panelEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  }
  
  trackBySlug(_: number, item: FAQItem) { return this.slugify(item.question); }

  handleSearchSelect(sel: {
    question: string;
    category: string;
    subCategory: string | null;
    subCatFilterApplied?: boolean;
  }): void {
  
    const cat = sel.category;
    const sub = sel.subCatFilterApplied ? (sel.subCategory ?? '') : '';
    const frag= this.slugify(sel.question);
  
    this.router.navigate(
      sub ? ['/faq', cat, sub] : ['/faq', cat],
      { fragment: frag }
    );
  
    this.isSearchOpen = false;
  
    setTimeout(() => this.openAndScroll(sel.question));
  }
  
  
  handleTrendingSelect(sel: {
    question: string;
    category: string;
    subCategory: string | null;
  }): void {

    const frag = this.slugify(sel.question);

    this.router.navigate(['/faq', sel.category], { fragment: frag });

    setTimeout(() => this.openAndScroll(sel.question));
  }

  // 分享功能相关方法
  private updatePageMetadata(): void {
    let pageTitle = 'FAQ - Data Sync Pro';
    let pageDescription = 'Frequently Asked Questions about Data Sync Pro';

    if (this.currentCategory) {
      pageTitle = `${this.currentCategory} FAQ - Data Sync Pro`;
      pageDescription = `Frequently Asked Questions about ${this.currentCategory}`;

      if (this.currentSubCategory) {
        pageTitle = `${this.currentSubCategory} FAQ - Data Sync Pro`;
        pageDescription = `Frequently Asked Questions about ${this.currentSubCategory}`;
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
      }, 100);
    }
  }

  private expandFAQPanel(faqItem: FAQItem): void {
    // 等待ViewChildren初始化
    setTimeout(() => {
      if (this.expansionPanels) {
        const panels = this.expansionPanels.toArray();

        // 根据当前页面类型确定使用哪个FAQ列表
        const faqList = this.currentCategory ? this.filteredFAQ : this.allFaqList;
        const targetIndex = faqList.findIndex(item => item.id === faqItem.id);

        if (targetIndex >= 0 && panels[targetIndex]) {
          panels[targetIndex].open();
        }
      }
    }, 50);
  }

  private scrollToSecondPosition(element: HTMLElement): void {
    // 计算将元素放在第二个位置的滚动位置
    const elementRect = element.getBoundingClientRect();
    const viewportHeight = window.innerHeight;

    // 动态计算偏移量，确保FAQ标题在视口的理想位置
    const idealOffset = Math.min(120, viewportHeight * 0.15); // 视口高度的15%，最多120px

    // 计算目标滚动位置
    const targetScrollTop = window.scrollY + elementRect.top - idealOffset;

    // 确保不会滚动到页面顶部之上
    const finalScrollTop = Math.max(0, targetScrollTop);

    // 检查是否需要滚动（避免不必要的滚动）
    const currentScrollTop = window.scrollY;
    const scrollDifference = Math.abs(finalScrollTop - currentScrollTop);

    // 只有当滚动距离超过50px时才进行滚动
    if (scrollDifference > 50) {
      // 平滑滚动到目标位置
      window.scrollTo({
        top: finalScrollTop,
        behavior: 'smooth'
      });
    }
  }

  private scrollToAndExpandFAQ(fragment: string): void {
    // 首先尝试通过ID找到元素
    let element = document.getElementById(fragment);

    if (!element) {
      // 如果没找到，可能是在主页面，尝试查找对应的FAQ项目
      const faqItem = this.faqList.find(item => this.slugify(item.question) === fragment);
      if (faqItem) {
        // 如果当前不在正确的分类页面，导航到正确的页面
        if (this.currentCategory !== faqItem.category ||
            (faqItem.subCategory && this.currentSubCategory !== faqItem.subCategory)) {

          const categoryPath = faqItem.category ? `/${encodeURIComponent(faqItem.category)}` : '';
          const subCategoryPath = faqItem.subCategory ? `/${encodeURIComponent(faqItem.subCategory)}` : '';

          this.router.navigate([`/faq${categoryPath}${subCategoryPath}`], {
            fragment: fragment
          });
          return;
        }

        // 展开FAQ项目
        this.expandFAQPanel(faqItem);
        this.onFaqOpened(faqItem);
        this.updateFAQMetadata(faqItem);

        // 等待DOM更新后再查找元素
        setTimeout(() => {
          element = document.getElementById(fragment);
          if (element) {
            this.scrollToSecondPosition(element);
          }
        }, 300);
      }
    } else {
      // 找到对应的FAQ项目并展开
      const faqItem = this.faqList.find(item => this.slugify(item.question) === fragment);
      if (faqItem) {
        this.expandFAQPanel(faqItem);
        this.onFaqOpened(faqItem);
        this.updateFAQMetadata(faqItem);
      }

      // 滚动到元素
      this.scrollToSecondPosition(element);
    }
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
    const categoryPath = faqItem.category ? `/${encodeURIComponent(faqItem.category)}` : '';
    const subCategoryPath = faqItem.subCategory ? `/${encodeURIComponent(faqItem.subCategory)}` : '';

    return `${baseUrl}/faq${categoryPath}${subCategoryPath}#${fragment}`;
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

}

