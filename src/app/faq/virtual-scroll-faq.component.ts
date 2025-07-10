import {
  Component,
  OnInit,
  ViewChild,
  ElementRef,
  HostListener,
  ChangeDetectorRef,
  OnDestroy,
} from '@angular/core';
import { CdkVirtualScrollViewport } from '@angular/cdk/scrolling';
import { Subject } from 'rxjs';
import { takeUntil, debounceTime } from 'rxjs/operators';

interface VirtualFAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
  subCategory: string;
  isExpanded?: boolean;
  height?: number;
}

@Component({
  selector: 'app-virtual-scroll-faq',
  template: `
    <div class="virtual-faq-container">
      <!-- Search Box -->
      <div class="search-section">
        <input
          #searchInput
          [(ngModel)]="searchQuery"
          (input)="onSearchChange()"
          placeholder="Search FAQs..."
          class="search-input"
        />
        <div class="results-info">Showing {{ displayedItems.length }} / {{ totalItems }} FAQs</div>
      </div>

      <!-- Virtual Scroll Container -->
      <cdk-virtual-scroll-viewport
        #viewport
        [itemSize]="itemHeight"
        [minBufferPx]="bufferSize"
        [maxBufferPx]="bufferSize * 2"
        class="faq-viewport"
        (scrolledIndexChange)="onScrollIndexChange($event)"
      >
        <div
          *cdkVirtualFor="let item of displayedItems; let i = index; trackBy: trackByFn"
          class="virtual-faq-item"
          [class.expanded]="item.isExpanded"
        >
          <!-- FAQ标题 -->
          <div
            class="faq-header"
            (click)="toggleFAQ(item, i)"
            [attr.aria-expanded]="item.isExpanded"
            role="button"
            tabindex="0"
            (keydown.enter)="toggleFAQ(item, i)"
            (keydown.space)="toggleFAQ(item, i)"
          >
            <h3 class="faq-question">{{ item.question }}</h3>
            <span class="expand-icon" [class.rotated]="item.isExpanded">▼</span>
          </div>

          <!-- FAQ内容 -->
          <div
            class="faq-content"
            *ngIf="item.isExpanded"
            [style.height]="item.isExpanded ? 'auto' : '0'"
          >
            <div class="faq-answer" [innerHTML]="item.answer" appSimpleZoomable></div>
            <div class="faq-meta">
              <span class="category">{{ item.category }}</span>
              <span class="subcategory" *ngIf="item.subCategory"> > {{ item.subCategory }} </span>
            </div>
          </div>
        </div>
      </cdk-virtual-scroll-viewport>

      <!-- Loading Indicator -->
      <div class="loading-indicator" *ngIf="isLoading">
        <div class="spinner"></div>
        <span>Loading...</span>
      </div>

      <!-- No Results Message -->
      <div class="no-results" *ngIf="!isLoading && displayedItems.length === 0">
        <p>No matching FAQs found</p>
        <button (click)="clearSearch()" class="clear-btn">Clear Search</button>
      </div>
    </div>
  `,
  styleUrls: ['./virtual-scroll-faq.component.scss'],
})
export class VirtualScrollFAQComponent implements OnInit, OnDestroy {
  @ViewChild('viewport', { static: true }) viewport!: CdkVirtualScrollViewport;
  @ViewChild('searchInput') searchInput!: ElementRef<HTMLInputElement>;

  // Data properties
  allItems: VirtualFAQItem[] = [];
  displayedItems: VirtualFAQItem[] = [];
  searchQuery = '';

  // Virtual scroll configuration
  itemHeight = 80; // Base item height
  bufferSize = 200; // Buffer size

  // State management
  isLoading = false;
  totalItems = 0;
  currentScrollIndex = 0;

  // Search debounce
  private searchSubject = new Subject<string>();
  private destroy$ = new Subject<void>();

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.initializeData();
    this.setupSearchDebounce();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * 初始化FAQ数据
   */
  private async initializeData(): Promise<void> {
    this.isLoading = true;

    try {
      // 模拟加载大量FAQ数据
      this.allItems = await this.loadFAQData();
      this.displayedItems = [...this.allItems];
      this.totalItems = this.allItems.length;
    } catch (error) {
      console.error('加载FAQ数据失败:', error);
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  /**
   * 模拟加载FAQ数据
   */
  private async loadFAQData(): Promise<VirtualFAQItem[]> {
    // 模拟异步加载
    return new Promise(resolve => {
      setTimeout(() => {
        const items: VirtualFAQItem[] = [];
        for (let i = 1; i <= 1000; i++) {
          items.push({
            id: `faq-${i}`,
            question: `FAQ问题 ${i}: 这是一个示例问题，用于演示虚拟滚动功能`,
            answer: `这是FAQ ${i}的详细答案。包含了相关的解决方案和说明信息。`,
            category: `分类${Math.ceil(i / 100)}`,
            subCategory: `子分类${Math.ceil(i / 20)}`,
            isExpanded: false,
          });
        }
        resolve(items);
      }, 1000);
    });
  }

  /**
   * 设置搜索防抖
   */
  private setupSearchDebounce(): void {
    this.searchSubject.pipe(debounceTime(300), takeUntil(this.destroy$)).subscribe(query => {
      this.performSearch(query);
    });
  }

  /**
   * 搜索变化处理
   */
  onSearchChange(): void {
    this.searchSubject.next(this.searchQuery);
  }

  /**
   * 执行搜索
   */
  private performSearch(query: string): void {
    if (!query.trim()) {
      this.displayedItems = [...this.allItems];
    } else {
      const lowerQuery = query.toLowerCase();
      this.displayedItems = this.allItems.filter(
        item =>
          item.question.toLowerCase().includes(lowerQuery) ||
          item.answer.toLowerCase().includes(lowerQuery) ||
          item.category.toLowerCase().includes(lowerQuery) ||
          item.subCategory.toLowerCase().includes(lowerQuery)
      );
    }

    // 重置滚动位置
    this.viewport.scrollToIndex(0);
    this.cdr.detectChanges();
  }

  /**
   * 清除搜索
   */
  clearSearch(): void {
    this.searchQuery = '';
    this.displayedItems = [...this.allItems];
    this.searchInput.nativeElement.focus();
  }

  /**
   * Toggle FAQ expanded state
   */
  toggleFAQ(item: VirtualFAQItem, _index: number): void {
    item.isExpanded = !item.isExpanded;

    // Dynamically adjust item height
    if (item.isExpanded) {
      item.height = this.calculateExpandedHeight(item);
    } else {
      item.height = this.itemHeight;
    }

    // Notify virtual scroll to update
    this.viewport.checkViewportSize();
  }

  /**
   * Calculate expanded height
   */
  private calculateExpandedHeight(item: VirtualFAQItem): number {
    // Base height + content height estimation
    const baseHeight = this.itemHeight;
    const contentHeight = Math.max(100, item.answer.length * 0.5);
    return baseHeight + contentHeight;
  }

  /**
   * Handle scroll index change
   */
  onScrollIndexChange(index: number): void {
    this.currentScrollIndex = index;
  }

  /**
   * Track function to optimize rendering performance
   */
  trackByFn(_index: number, item: VirtualFAQItem): string {
    return item.id;
  }

  /**
   * Keyboard shortcut support
   */
  @HostListener('document:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    if (event.key === '/' && !this.isInputActive()) {
      event.preventDefault();
      this.searchInput.nativeElement.focus();
    }
  }

  private isInputActive(): boolean {
    const activeElement = document.activeElement;
    return activeElement?.tagName === 'INPUT' || activeElement?.tagName === 'TEXTAREA';
  }
}
