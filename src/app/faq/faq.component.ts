import {
  Component,
  ViewChild,
  ElementRef,
  HostListener,
  OnInit,
  ViewEncapsulation
} from '@angular/core';
import { MatExpansionPanel } from '@angular/material/expansion';
import { ViewChildren, QueryList } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import faqData from '../../assets/data/faqs.json';
import { AnalyticsService } from '../analytics.service';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
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
  safeAnswer?: SafeHtml;
  category: string;
  subCategory: string;
  isPopular?: boolean;
}

@Component({
  selector: 'app-faq',
  templateUrl: './faq.component.html',
  styleUrls: ['./faq.component.scss'],
  encapsulation: ViewEncapsulation.None
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
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
    private sanitizer: DomSanitizer,
    private analyticsService: AnalyticsService
  ) {}

  ngOnInit(): void {

    this.initFaqData();                     
    this.route.paramMap.subscribe(p => {
      this.currentCategory    = p.get('cat')    ?? '';
      this.currentSubCategory = p.get('subCat') ?? '';
    });
    
  }
  private initFaqData(): void {
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
  private encode = (s: string) => encodeURIComponent(s.trim());
  goHome(): void { this.router.navigate(['/faq']); }
  
  goCategory(cat: string) {          
    this.router.navigate(['/faq', this.encode(cat)]);
  }
  
  goSub(cat: string, sub: string) {
    this.router.navigate(['/faq', this.encode(cat), this.encode(sub)]);
  }

  private toFAQItem(rec: SourceFAQRecord): FAQItem {
    const BASE = 'assets/faq-item/';
    const file  = (rec.Answer__c ?? '').replace(/^\/+/, '');
    return {
      question   : rec.Question__c ?? '',
      answer : `${BASE}${file}`,
      category   : rec.Category__c ?? '',
      subCategory: rec.SubCategory__c ?? '',
      isPopular  : false,
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
    if (!item.safeAnswer) {
      this.http
        .get(item.answer, { responseType: 'text' })
        .subscribe(raw => {
          const html = this.fixAssetPaths(
            this.unescapeHtml(this.removeParagraphs(raw))
          );
          item.safeAnswer = this.sanitizer.bypassSecurityTrustHtml(html);
        });
    }
  }

  onSearchBlur(): void {
    this.searchFocused = false;
  }

  toRegistryKey(answer: string): string {
    return answer.replace(/\.html$/, '').toLowerCase();
  }
  openSearchOverlay() {
    this.isSearchOpen = true;
  }
  private fixAssetPaths(raw: string): string {
    const DEPLOY = '/www.data-sync-pro.io/';        // <-- must match --deploy-url
    return raw
      .replace(/\\+/g, '/')                         // 1) \ -> /
      .replace(/src="assets\//g, `src="${DEPLOY}assets/`); // 2) add prefix
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

}

