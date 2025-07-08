import { 
  Component, 
  OnInit, 
  ViewChild, 
  ElementRef,
  HostListener 
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

interface PaginatedFAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
  subCategory: string;
  isExpanded?: boolean;
  viewCount?: number;
}

interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
  startIndex: number;
  endIndex: number;
}

@Component({
  selector: 'app-paginated-faq',
  template: `
    <div class="paginated-faq-container">
      <!-- 头部控制区 -->
      <div class="faq-controls">
        <div class="search-section">
          <input 
            #searchInput
            [(ngModel)]="searchQuery"
            (input)="onSearchInput()"
            placeholder="搜索FAQ..."
            class="search-input"
          />
          <button 
            *ngIf="searchQuery" 
            (click)="clearSearch()"
            class="clear-search-btn"
            title="清除搜索"
          >
            ✕
          </button>
        </div>

        <div class="filter-section">
          <select 
            [(ngModel)]="selectedCategory"
            (change)="onCategoryChange()"
            class="category-filter"
          >
            <option value="">所有分类</option>
            <option *ngFor="let category of categories" [value]="category">
              {{ category }}
            </option>
          </select>

          <select 
            [(ngModel)]="pageSize"
            (change)="onPageSizeChange()"
            class="page-size-selector"
          >
            <option [value]="10">每页 10 条</option>
            <option [value]="20">每页 20 条</option>
            <option [value]="50">每页 50 条</option>
            <option [value]="100">每页 100 条</option>
          </select>
        </div>
      </div>

      <!-- 结果信息 -->
      <div class="results-info">
        <span class="results-count">
          显示第 {{ paginationInfo.startIndex + 1 }} - {{ paginationInfo.endIndex }} 条，
          共 {{ paginationInfo.totalItems }} 条FAQ
        </span>
        <span class="page-info">
          第 {{ paginationInfo.currentPage }} / {{ paginationInfo.totalPages }} 页
        </span>
      </div>

      <!-- FAQ List -->
      <div class="faq-list" *ngIf="!isLoading">
        <div
          *ngFor="let item of currentPageItems; let i = index; trackBy: trackByFn"
          class="faq-item"
          [class.expanded]="item.isExpanded"
        >
          <div 
            class="faq-header"
            (click)="toggleFAQ(item)"
            [attr.aria-expanded]="item.isExpanded"
            role="button"
            tabindex="0"
            (keydown.enter)="toggleFAQ(item)"
            (keydown.space)="$event.preventDefault(); toggleFAQ(item)"
          >
            <div class="faq-title-section">
              <h3 class="faq-question" [innerHTML]="highlightSearchTerm(item.question)"></h3>
              <div class="faq-badges">
                <span class="category-badge">{{ item.category }}</span>
                <span class="view-count" *ngIf="item.viewCount">
                  👁 {{ item.viewCount }}
                </span>
              </div>
            </div>
            
            <div class="faq-actions">
              <span class="expand-icon" [class.rotated]="item.isExpanded">▼</span>
            </div>
          </div>

          <div 
            class="faq-content"
            *ngIf="item.isExpanded"
            [@expandCollapse]
          >
            <div class="faq-answer" [innerHTML]="highlightSearchTerm(item.answer)"></div>
            
            <!-- FAQ Feedback Area -->
            <div class="faq-feedback">
              <p>Was this answer helpful to you?</p>
              <div class="feedback-buttons">
                <button class="feedback-btn helpful">👍 Helpful</button>
                <button class="feedback-btn not-helpful">👎 Not Helpful</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div class="loading-state" *ngIf="isLoading">
        <div class="spinner"></div>
        <p>Loading...</p>
      </div>

      <!-- No Results State -->
      <div class="no-results" *ngIf="!isLoading && currentPageItems.length === 0">
        <div class="no-results-icon">🔍</div>
        <h3>No matching FAQs found</h3>
        <p>Try adjusting your search keywords or filter criteria</p>
        <button (click)="resetFilters()" class="reset-btn">Reset Filters</button>
      </div>

      <!-- Pagination Controls -->
      <div class="pagination-controls" *ngIf="paginationInfo.totalPages > 1">
        <div class="pagination-info">
          <span>Go to page</span>
          <input
            type="number"
            [(ngModel)]="jumpToPage"
            (keydown.enter)="goToPage(jumpToPage)"
            [min]="1"
            [max]="paginationInfo.totalPages"
            class="page-jump-input"
          />
          <span>of {{ paginationInfo.totalPages }}</span>
          <button (click)="goToPage(jumpToPage)" class="jump-btn">Go</button>
        </div>

        <div class="pagination-buttons">
          <button 
            (click)="goToPage(1)"
            [disabled]="paginationInfo.currentPage === 1"
            class="page-btn first-btn"
            title="首页"
          >
            ⏮
          </button>
          
          <button 
            (click)="goToPage(paginationInfo.currentPage - 1)"
            [disabled]="paginationInfo.currentPage === 1"
            class="page-btn prev-btn"
            title="上一页"
          >
            ◀
          </button>

          <div class="page-numbers">
            <button 
              *ngFor="let page of getVisiblePages()"
              (click)="goToPage(page)"
              [class.active]="page === paginationInfo.currentPage"
              [class.ellipsis]="page === -1"
              [disabled]="page === -1"
              class="page-btn number-btn"
            >
              {{ page === -1 ? '...' : page }}
            </button>
          </div>

          <button 
            (click)="goToPage(paginationInfo.currentPage + 1)"
            [disabled]="paginationInfo.currentPage === paginationInfo.totalPages"
            class="page-btn next-btn"
            title="下一页"
          >
            ▶
          </button>
          
          <button 
            (click)="goToPage(paginationInfo.totalPages)"
            [disabled]="paginationInfo.currentPage === paginationInfo.totalPages"
            class="page-btn last-btn"
            title="末页"
          >
            ⏭
          </button>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./paginated-faq.component.scss'],
  animations: []
})
export class PaginatedFAQComponent implements OnInit {
  @ViewChild('searchInput') searchInput!: ElementRef<HTMLInputElement>;

  // Data properties
  allItems: PaginatedFAQItem[] = [];
  filteredItems: PaginatedFAQItem[] = [];
  currentPageItems: PaginatedFAQItem[] = [];
  categories: string[] = [];

  // Search and filtering
  searchQuery = '';
  selectedCategory = '';
  private searchSubject = new Subject<string>();

  // Pagination properties
  pageSize = 20;
  jumpToPage = 1;
  paginationInfo: PaginationInfo = {
    currentPage: 1,
    totalPages: 1,
    pageSize: 20,
    totalItems: 0,
    startIndex: 0,
    endIndex: 0
  };

  // State
  isLoading = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.initializeData();
    this.setupSearchDebounce();
    this.loadFromURL();
  }

  /**
   * 初始化数据
   */
  private async initializeData(): Promise<void> {
    this.isLoading = true;
    
    try {
      // 模拟加载数据
      this.allItems = await this.loadFAQData();
      this.categories = [...new Set(this.allItems.map(item => item.category))];
      this.applyFilters();
    } catch (error) {
      console.error('加载FAQ数据失败:', error);
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Simulate loading FAQ data
   */
  private async loadFAQData(): Promise<PaginatedFAQItem[]> {
    return new Promise(resolve => {
      setTimeout(() => {
        const items: PaginatedFAQItem[] = [];
        const categories = ['Technical Support', 'Account Management', 'Product Features', 'Billing Issues', 'Troubleshooting'];

        for (let i = 1; i <= 500; i++) {
          const category = categories[Math.floor(Math.random() * categories.length)];
          items.push({
            id: `faq-${i}`,
            question: `FAQ Question ${i}: Common questions about ${category}`,
            answer: `This is the detailed answer for FAQ ${i}. It contains detailed explanations and solutions about ${category}. There will be more content here to demonstrate the search and pagination functionality.`,
            category,
            subCategory: `Subcategory ${Math.ceil(i / 50)}`,
            isExpanded: false,
            viewCount: Math.floor(Math.random() * 1000)
          });
        }
        resolve(items);
      }, 800);
    });
  }

  /**
   * 设置搜索防抖
   */
  private setupSearchDebounce(): void {
    this.searchSubject
      .pipe(
        debounceTime(300),
        distinctUntilChanged()
      )
      .subscribe(() => {
        this.applyFilters();
        this.updateURL();
      });
  }

  /**
   * 从URL加载状态
   */
  private loadFromURL(): void {
    this.route.queryParams.subscribe(params => {
      this.searchQuery = params['q'] || '';
      this.selectedCategory = params['category'] || '';
      this.pageSize = parseInt(params['pageSize']) || 20;
      this.paginationInfo.currentPage = parseInt(params['page']) || 1;
      
      if (this.allItems.length > 0) {
        this.applyFilters();
      }
    });
  }

  /**
   * 更新URL参数
   */
  private updateURL(): void {
    const queryParams: any = {};
    
    if (this.searchQuery) queryParams.q = this.searchQuery;
    if (this.selectedCategory) queryParams.category = this.selectedCategory;
    if (this.pageSize !== 20) queryParams.pageSize = this.pageSize;
    if (this.paginationInfo.currentPage !== 1) queryParams.page = this.paginationInfo.currentPage;

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      queryParamsHandling: 'merge'
    });
  }

  /**
   * 应用筛选条件
   */
  private applyFilters(): void {
    let filtered = [...this.allItems];

    // 搜索筛选
    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(item =>
        item.question.toLowerCase().includes(query) ||
        item.answer.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query)
      );
    }

    // 分类筛选
    if (this.selectedCategory) {
      filtered = filtered.filter(item => item.category === this.selectedCategory);
    }

    this.filteredItems = filtered;
    this.updatePagination();
  }

  /**
   * 更新分页信息
   */
  private updatePagination(): void {
    const totalItems = this.filteredItems.length;
    const totalPages = Math.ceil(totalItems / this.pageSize);
    
    // 确保当前页面在有效范围内
    if (this.paginationInfo.currentPage > totalPages) {
      this.paginationInfo.currentPage = Math.max(1, totalPages);
    }

    const startIndex = (this.paginationInfo.currentPage - 1) * this.pageSize;
    const endIndex = Math.min(startIndex + this.pageSize, totalItems);

    this.paginationInfo = {
      currentPage: this.paginationInfo.currentPage,
      totalPages,
      pageSize: this.pageSize,
      totalItems,
      startIndex,
      endIndex
    };

    // 获取当前页数据
    this.currentPageItems = this.filteredItems.slice(startIndex, endIndex);
    this.jumpToPage = this.paginationInfo.currentPage;
  }

  // 事件处理方法
  onSearchInput(): void {
    this.searchSubject.next(this.searchQuery);
  }

  onCategoryChange(): void {
    this.paginationInfo.currentPage = 1;
    this.applyFilters();
    this.updateURL();
  }

  onPageSizeChange(): void {
    this.paginationInfo.currentPage = 1;
    this.updatePagination();
    this.updateURL();
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.paginationInfo.totalPages) {
      this.paginationInfo.currentPage = page;
      this.updatePagination();
      this.updateURL();
      
      // 滚动到顶部
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  getVisiblePages(): number[] {
    const current = this.paginationInfo.currentPage;
    const total = this.paginationInfo.totalPages;
    const pages: number[] = [];

    if (total <= 7) {
      // 如果总页数少于等于7，显示所有页码
      for (let i = 1; i <= total; i++) {
        pages.push(i);
      }
    } else {
      // 复杂的页码显示逻辑
      pages.push(1);
      
      if (current > 4) {
        pages.push(-1); // 省略号
      }
      
      const start = Math.max(2, current - 1);
      const end = Math.min(total - 1, current + 1);
      
      for (let i = start; i <= end; i++) {
        if (!pages.includes(i)) {
          pages.push(i);
        }
      }
      
      if (current < total - 3) {
        pages.push(-1); // 省略号
      }
      
      if (!pages.includes(total)) {
        pages.push(total);
      }
    }

    return pages;
  }

  // 其他方法
  clearSearch(): void {
    this.searchQuery = '';
    this.onSearchInput();
  }

  resetFilters(): void {
    this.searchQuery = '';
    this.selectedCategory = '';
    this.paginationInfo.currentPage = 1;
    this.applyFilters();
    this.updateURL();
  }

  toggleFAQ(item: PaginatedFAQItem): void {
    item.isExpanded = !item.isExpanded;
    if (item.isExpanded) {
      item.viewCount = (item.viewCount || 0) + 1;
    }
  }



  highlightSearchTerm(text: string): string {
    if (!this.searchQuery.trim()) return text;
    
    const regex = new RegExp(`(${this.searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
  }

  trackByFn(index: number, item: PaginatedFAQItem): string {
    return item.id;
  }

  @HostListener('document:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    if (event.key === '/' && !this.isInputActive()) {
      event.preventDefault();
      this.searchInput.nativeElement.focus();
    }
  }

  private isInputActive(): boolean {
    const activeElement = document.activeElement;
    return activeElement?.tagName === 'INPUT' || 
           activeElement?.tagName === 'TEXTAREA' ||
           activeElement?.tagName === 'SELECT';
  }
}
