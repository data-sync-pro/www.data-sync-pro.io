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
  @Output() closed = new EventEmitter<void>();
  @Output() selectedResult = new EventEmitter<FaqItem>();
  @ViewChild('searchInput') searchInputRef!: ElementRef<HTMLInputElement>;

  searchQuery = '';

  selectedCategory: string = '';
  selectedSubCategories: string[] = [];

  categories: string[] = [];
  subCategories: string[] = [];

  suggestions: FaqItem[] = [];
  filteredSuggestions: FaqItem[] = [];

  constructor(private http: HttpClient, private router: Router) {}

  ngOnInit() {
    this.http.get<RawFaq[]>('assets/data/faqs.json').subscribe((data) => {
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
      setTimeout(() => this.searchInputRef?.nativeElement?.focus(), 0);
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
}
