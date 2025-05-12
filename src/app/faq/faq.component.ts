import {
  Component,
  ViewChild,
  ElementRef,
  HostListener,
  OnInit,
} from '@angular/core';
import { MatExpansionPanel } from '@angular/material/expansion';
import { ViewChildren, QueryList } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import faqData from '../../assets/data/faqs.json';
import { AnalyticsService } from '../analytics.service';
import { FaqComponentRegistry } from './faq-registry';
interface SourceFAQRecord {
  Id: string;
  Question__c: string;
  Answer__c: string | null;
  Category__c: string;
  SubCategory__c: string | null;
  SeqNo__c?: string | null;
}

interface FAQItem {
  question: string;
  answer: string;
  safeAnswer: SafeHtml;
  category: string;
  subCategory: string;
  isPopular?: boolean;
}

@Component({
  selector: 'app-faq',
  templateUrl: './faq.component.html',
  styleUrls: ['./faq.component.scss'],
})
export class FaqComponent implements OnInit {
  searchQuery = '';
  searchFocused = false;

  currentCategory = '';
  currentSubCategory = '';

  faqList: FAQItem[] = [];

  subCategories: Record<string, string[]> = {};

  suggestions: string[] = [];
  showSuggestions = false;
  selectedSuggestionIndex = -1;
  isSearchOpen = false;

  constructor(
    private sanitizer: DomSanitizer,
    private analyticsService: AnalyticsService
  ) {}

  ngOnInit(): void {
    const data = faqData as unknown as SourceFAQRecord[];

    data.forEach((record) => {
      const cat = record.Category__c;
      const sub = record.SubCategory__c ?? '';
      if (cat) {
        if (!this.subCategories[cat]) {
          this.subCategories[cat] = [];
        }
        if (sub && !this.subCategories[cat].includes(sub)) {
          this.subCategories[cat].push(sub);
        }
      }
    });

    this.faqList = data.map(rec => this.toFAQItem(rec));
  }

  private toFAQItem(rec: SourceFAQRecord): FAQItem {
    let escapedAnswer = rec.Answer__c ?? '';
    escapedAnswer = this.removeParagraphs(escapedAnswer);
    const unescaped = this.unescapeHtml(escapedAnswer);
    const safe = this.sanitizer.bypassSecurityTrustHtml(unescaped);
    return {
      question: rec.Question__c ?? '',
      answer: unescaped,
      safeAnswer: safe,
      category: rec.Category__c ?? '',
      subCategory: rec.SubCategory__c ?? '',
      isPopular: false
    };
  }

  private removeParagraphs(str: string): string {
    return str
      .replace(/<p[^>]*>/g, '')
      .replace(/<\/p>/g, '');
  }

  private unescapeHtml(escapedStr: string): string {
    return escapedStr
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&amp;/g, '&');
  }

  get categories(): string[] {
    return Object.keys(this.subCategories);
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

  onFaqOpened(item: FAQItem) {
    if (this.analyticsService.userConsented) {
      const payload = {
        eventType: 'faq_open',
        faqQuestion: item.question,
        faqCategory: item.category,
        timestamp: new Date().toISOString()
      };
      this.analyticsService.trackCustomEvent(payload);
    }
  }

  onSearchBlur(): void {
    this.searchFocused = false;
  }

  public FaqComponentRegistry = FaqComponentRegistry;
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

  private openSearch() {
    this.faqSearchBox.nativeElement.focus();
    this.searchFocused = true;
    this.showSuggestions = !!this.searchQuery.trim();
  }

  @ViewChildren(MatExpansionPanel) panels!: QueryList<MatExpansionPanel>;
  @ViewChildren(MatExpansionPanel, { read: ElementRef })
  panelEls!: QueryList<ElementRef<HTMLElement>>;

  handleSearchSelect(item: {
    question: string;
    category: string;
    subCategory: string | null;
    subCatFilterApplied?: boolean;
  }) {
    this.currentCategory = item.category;

    this.currentSubCategory = item.subCatFilterApplied
      ? item.subCategory ?? ''
      : '';

    this.isSearchOpen = false;

    setTimeout(() => {
      const idx = this.filteredFAQ.findIndex(
        (f) => f.question === item.question
      );
      if (idx >= 0) {
        this.panels.toArray()[idx].open();
        this.panelEls.toArray()[idx].nativeElement.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
      }
    });
  }

  get showHome(): boolean {
    return (
      !this.currentCategory && !this.currentSubCategory && !this.searchQuery
    );
  }

  handleTrendingSelect(item: {
    question: string;
    category: string;
    subCategory: string | null;
  }) {
    this.currentCategory = item.category;
    this.currentSubCategory = '';

    setTimeout(() => {
      const idx = this.filteredFAQ.findIndex(
        (f) => f.question === item.question
      );
      if (idx >= 0) {
        this.panels.toArray()[idx].open();
        this.panelEls.toArray()[idx].nativeElement.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
      }
    });
  }

  
}

