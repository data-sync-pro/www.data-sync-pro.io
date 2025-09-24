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
import { RecipeItem as OriginalRecipeItem } from '../../shared/models/recipe.model';
import { RecipeService } from '../../shared/services/recipe.service';

interface RawRecipe {
  id: string;
  title: string;
  category: string;
  overview: string;
  keywords: string[];
  isActive?: boolean;
}

interface RecipeItem {
  id: string;
  question: string;
  route: string;
  category: string;
  subCategory: string | null;
  tags: string[];
}

export interface SelectedSuggestion extends RecipeItem {
  subCatFilterApplied: boolean;
}

@Component({
  selector: 'app-recipe-search-overlay',
  templateUrl: './recipe-search-overlay.component.html',
  styleUrls: ['./recipe-search-overlay.component.scss'],
})
export class RecipeSearchOverlayComponent implements OnInit, OnChanges {
  @Input() isOpen = false;
  @Input() initialQuery = ''; 
  @Output() closed = new EventEmitter<void>();
  @Output() selectedResult = new EventEmitter<SelectedSuggestion>();
  @ViewChild('searchInput') searchInputRef!: ElementRef<HTMLInputElement>;

  searchQuery = '';

  selectedCategory: string = '';
  selectedSubCategories: string[] = [];

  categories: string[] = [];
  subCategories: string[] = [];
  isLoading = true;
  loadError = false;

  suggestions: RecipeItem[] = [];
  filteredSuggestions: RecipeItem[] = [];

  constructor(
    private http: HttpClient, 
    private router: Router,
    private cdr: ChangeDetectorRef,
    private recipeService: RecipeService
  ) {}

  ngOnInit() {
    this.loadRecipes();
  }

  private loadRecipes() {
    this.isLoading = true;
    this.loadError = false;
    
    this.recipeService.getRecipes().subscribe({
      next: (recipes) => {
        this.suggestions = recipes
          .filter(r => r.id) // Only include recipes with valid IDs
          .map((r) => ({
            id: r.id,
            question: r.title,
            route: `/recipes/${encodeURIComponent(r.category)}/${r.id}`,
            category: r.category,
            subCategory: r.keywords && r.keywords.length > 0 ? r.keywords[0] : null,
            tags: r.keywords && r.keywords.length > 0 
              ? [r.category, r.keywords[0]]
              : [r.category],
          }));

        this.categories = [...new Set(this.suggestions.map((i) => i.category))];
        this.filterSubCategoryList();
        this.filterSuggestions();
        this.isLoading = false;

        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error loading recipes:', error);
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

  onSelectSuggestion(item: RecipeItem) {
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
      
      if (changes['initialQuery'] || this.initialQuery) {
        this.searchQuery = this.initialQuery;
        
        setTimeout(() => {
          this.filterSuggestions();
        }, 0);
      }
      
      // Immediate focus without delay to improve responsiveness
      setTimeout(() => {
        this.searchInputRef?.nativeElement?.focus();
        
        if (this.searchQuery) {
          this.searchInputRef?.nativeElement?.select();
        }
      }, 0);
    }
    
    
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

    // Filter and add priority information
    const filteredWithPriority = this.suggestions
      .filter((i) => {
        // Search in recipe title
        const matchQuestion = kw ? i.question.toLowerCase().includes(kw) : true;

        const matchCat =
          !this.selectedCategory || i.category === this.selectedCategory;

        const matchSub =
          this.selectedSubCategories.length === 0 ||
          (i.subCategory && this.selectedSubCategories.includes(i.subCategory));

        return matchQuestion && matchCat && matchSub;
      })
      .map((i) => {
        // Add priority based on match type
        let priority = 999; // Default lowest priority

        if (kw) {
          // Category match - priority 1 (highest)
          if (i.category.toLowerCase().includes(kw)) {
            priority = 1;
          }
          // SubCategory match - priority 2
          else if (i.subCategory && i.subCategory.toLowerCase().includes(kw)) {
            priority = 2;
          }
          // Recipe title match - priority 3
          else if (i.question.toLowerCase().includes(kw)) {
            priority = 3;
          }
        }

        return { item: i, priority };
      })
      .sort((a, b) => {
        // Sort by priority first
        if (a.priority !== b.priority) {
          return a.priority - b.priority;
        }

        // Same priority, group by category first
        if (a.item.category !== b.item.category) {
          return a.item.category.localeCompare(b.item.category);
        }

        // Same category, group by subCategory
        const aSubCat = a.item.subCategory || '';
        const bSubCat = b.item.subCategory || '';
        if (aSubCat !== bSubCat) {
          return aSubCat.localeCompare(bSubCat);
        }

        // Finally, sort alphabetically by recipe title within same category/subcategory
        return a.item.question.localeCompare(b.item.question);
      })
      .map(result => result.item); // Return only the recipe items

    this.filteredSuggestions = filteredWithPriority;
  }

  get hasActiveFilters(): boolean {
    return !!(
      this.searchQuery.trim() ||
      this.selectedCategory ||
      this.selectedSubCategories.length > 0
    );
  }
}