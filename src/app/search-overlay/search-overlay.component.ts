import {
  Component,
  Output,
  EventEmitter,
  OnInit,
  ViewChild,
  ElementRef,
  Input,
  OnChanges,
  SimpleChanges,
  HostListener,
  ChangeDetectorRef,
} from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';

interface RawFaq {
  Id: string;
  Question__c: string;
  Answer__c: string;
  Category__c: string;
  SubCategory__c: string | null;
}

interface FaqItem {
  id: string;
  question: string;
  route: string;
  category: string;
  subCategory: string | null;
  tags: string[];
}
export interface SelectedSuggestion extends FaqItem {
  subCatFilterApplied: boolean;
}

@Component({
  selector: 'app-search-overlay',
  templateUrl: './search-overlay.component.html',
  styleUrls: ['./search-overlay.component.scss'],
})
export class SearchOverlayComponent implements OnInit, OnChanges {
  @Input() isOpen = false;
  @Input() initialQuery = ''; // 初始搜索查询
  @Output() closed = new EventEmitter<void>();
  @Output() selectedResult = new EventEmitter<FaqItem>();
  @ViewChild('searchInput') searchInputRef!: ElementRef<HTMLInputElement>;

  searchQuery = '';

  selectedCategory: string = '';
  selectedSubCategories: string[] = [];

  categories: string[] = [];
  subCategories: string[] = [];
  isLoading = true;
  loadError = false;

  suggestions: FaqItem[] = [];
  filteredSuggestions: FaqItem[] = [];

  constructor(
    private http: HttpClient, 
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.http.get<RawFaq[]>('assets/data/faqs.json').subscribe({
      next: (data) => {
        this.suggestions = data.map((r) => ({
          id: r.Id,
          question: r.Question__c,
          route: r.Answer__c.replace('.html', ''),
          category: r.Category__c,
          subCategory: r.SubCategory__c,
          tags: r.SubCategory__c
            ? [r.Category__c, r.SubCategory__c]
            : [r.Category__c],
        }));
        this.categories = [...new Set(this.suggestions.map((i) => i.category))];
        this.filterSubCategoryList();
        this.filterSuggestions();
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error loading FAQs:', error);
        this.loadError = true;
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  @HostListener('document:keydown.escape')
  onEscape() {
    if (this.isOpen) this.close();
  }

  onSelectSuggestion(item: FaqItem) {
    const subCatFilterApplied = this.selectedSubCategories.length > 0;

    this.selectedResult.emit({
      ...item,
      subCatFilterApplied,
    } as SelectedSuggestion);

    this.close();
  }

  selectCategory(cat: string) {
    this.selectedCategory = this.selectedCategory === cat ? '' : cat;
    this.filterSubCategoryList();
    this.filterSuggestions();
  }

  toggleSubCategory(sc: string) {
    const i = this.selectedSubCategories.indexOf(sc);
    i >= 0
      ? this.selectedSubCategories.splice(i, 1)
      : this.selectedSubCategories.push(sc);
    this.filterSuggestions();
  }

  filterSubCategoryList() {
    if (!this.selectedCategory) {
      this.subCategories = [];
      this.selectedSubCategories = [];
      return;
    }
    const subs = this.suggestions
      .filter((i) => i.category === this.selectedCategory && i.subCategory)
      .map((i) => i.subCategory!);
    this.subCategories = [...new Set(subs)];
    this.selectedSubCategories = this.selectedSubCategories.filter((s) =>
      this.subCategories.includes(s)
    );
  }

  clearFilters() {
    this.searchQuery = '';
    this.selectedCategory = '';
    this.selectedSubCategories = [];
    this.subCategories = [];
    this.filterSuggestions();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['isOpen']?.currentValue) {
      // 设置初始搜索查询
      if (changes['initialQuery'] || this.initialQuery) {
        this.searchQuery = this.initialQuery;
        // 触发搜索结果过滤
        setTimeout(() => {
          this.filterSuggestions();
        }, 0);
      }
      
      // Immediate focus without delay to improve responsiveness
      setTimeout(() => {
        this.searchInputRef?.nativeElement?.focus();
        // 如果有初始查询，选中所有文本
        if (this.searchQuery) {
          this.searchInputRef?.nativeElement?.select();
        }
      }, 0);
    }
    
    // 处理 initialQuery 变化
    if (changes['initialQuery'] && !changes['isOpen']) {
      this.searchQuery = this.initialQuery;
      this.filterSuggestions();
    }
  }

  close() {
    this.closed.emit();
  }

  filterSuggestions() {
    const kw = this.searchQuery.trim().toLowerCase();

    this.filteredSuggestions = this.suggestions.filter((i) => {
      const matchKW = kw ? i.question.toLowerCase().includes(kw) : true;

      const matchCat =
        !this.selectedCategory || i.category === this.selectedCategory;

      const matchSub =
        this.selectedSubCategories.length === 0 ||
        (i.subCategory && this.selectedSubCategories.includes(i.subCategory));

      return matchKW && matchCat && matchSub;
    });
  }

  get hasActiveFilters(): boolean {
    return !!(
      this.searchQuery.trim() ||
      this.selectedCategory ||
      this.selectedSubCategories.length > 0
    );
  }
}
