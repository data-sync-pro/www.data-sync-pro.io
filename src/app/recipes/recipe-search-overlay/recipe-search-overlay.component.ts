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

interface Recipe {
  id: string;
  title: string;
  description: string;
  category: string;
  duration: string;
  tags: string[];
  steps: any[];
}

export interface SelectedRecipe extends Recipe {
  categoryFilterApplied: boolean;
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
  @Output() selectedResult = new EventEmitter<SelectedRecipe>();
  @ViewChild('searchInput') searchInputRef!: ElementRef<HTMLInputElement>;

  searchQuery = '';
  selectedCategory = '';
  categories: string[] = [];
  
  isLoading = true;
  loadError = false;
  
  recipes: Recipe[] = [];
  filteredRecipes: Recipe[] = [];

  constructor(
    private http: HttpClient,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    // Load recipes data
    this.loadRecipes();
  }

  loadRecipes() {
    // TODO: Replace with actual recipe data endpoint
    // For now, using mock data
    this.recipes = this.getMockRecipes();
    this.categories = [...new Set(this.recipes.map(r => r.category))];
    this.filterRecipes();
    this.isLoading = false;
    this.cdr.detectChanges();
  }

  getMockRecipes(): Recipe[] {
    return [
      {
        id: '1',
        title: 'Basic Salesforce to SQL Server Sync',
        description: 'Learn how to set up a basic data synchronization between Salesforce and SQL Server',
        category: 'Database Integration',
        duration: '30 mins',
        tags: ['SQL Server', 'Salesforce', 'Basic'],
        steps: []
      },
      {
        id: '2',
        title: 'Real-time Account Sync with Change Data Capture',
        description: 'Implement real-time synchronization using Salesforce Change Data Capture',
        category: 'Real-time Sync',
        duration: '2 hours',
        tags: ['CDC', 'Real-time', 'Accounts'],
        steps: []
      },
      {
        id: '3',
        title: 'Batch Processing Large Data Sets',
        description: 'Optimize batch processing for large data volumes between systems',
        category: 'Performance',
        duration: '1 hour',
        tags: ['Batch', 'Performance', 'Large Data'],
        steps: []
      },
      {
        id: '4',
        title: 'Error Handling and Retry Logic',
        description: 'Implement robust error handling and retry mechanisms for data sync',
        category: 'Best Practices',
        duration: '45 mins',
        tags: ['Error Handling', 'Retry', 'Reliability'],
        steps: []
      },
      {
        id: '5',
        title: 'Multi-Object Relationship Sync',
        description: 'Synchronize complex object relationships between systems',
        category: 'Advanced Patterns',
        duration: '1.5 hours',
        tags: ['Relationships', 'Complex', 'Multi-Object'],
        steps: []
      }
    ];
  }

  @HostListener('document:keydown.escape')
  onEscape() {
    if (this.isOpen) this.close();
  }

  @HostListener('document:keydown./')
  onSlashKey(event: KeyboardEvent) {
    if (!this.isOpen && !this.isInputFocused()) {
      event.preventDefault();
      this.open();
    }
  }

  @HostListener('document:keydown.control.k', ['$event'])
  @HostListener('document:keydown.meta.k', ['$event'])
  onCtrlK(event: KeyboardEvent) {
    event.preventDefault();
    if (!this.isOpen) {
      this.open();
    }
  }

  private isInputFocused(): boolean {
    const activeElement = document.activeElement;
    return activeElement instanceof HTMLInputElement || 
           activeElement instanceof HTMLTextAreaElement;
  }

  private open() {
    // This would be triggered from parent component
    // Just here for keyboard shortcut handling
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['isOpen']?.currentValue) {
      if (changes['initialQuery'] || this.initialQuery) {
        this.searchQuery = this.initialQuery;
        setTimeout(() => {
          this.filterRecipes();
        }, 0);
      }
      
      setTimeout(() => {
        this.searchInputRef?.nativeElement?.focus();
        if (this.searchQuery) {
          this.searchInputRef?.nativeElement?.select();
        }
      }, 0);
    }
    
    if (changes['initialQuery'] && !changes['isOpen']) {
      this.searchQuery = this.initialQuery;
      this.filterRecipes();
    }
  }

  onSelectRecipe(recipe: Recipe) {
    const categoryFilterApplied = !!this.selectedCategory;
    
    this.selectedResult.emit({
      ...recipe,
      categoryFilterApplied,
    } as SelectedRecipe);
    
    this.close();
  }

  selectCategory(category: string) {
    this.selectedCategory = this.selectedCategory === category ? '' : category;
    this.filterRecipes();
  }


  clearFilters() {
    this.searchQuery = '';
    this.selectedCategory = '';
    this.filterRecipes();
  }

  close() {
    this.closed.emit();
  }

  filterRecipes() {
    const query = this.searchQuery.trim().toLowerCase();
    
    this.filteredRecipes = this.recipes.filter(recipe => {
      const matchQuery = !query || 
        recipe.title.toLowerCase().includes(query) ||
        recipe.description.toLowerCase().includes(query) ||
        recipe.tags.some(tag => tag.toLowerCase().includes(query));
      
      const matchCategory = !this.selectedCategory || 
        recipe.category === this.selectedCategory;
      
      return matchQuery && matchCategory;
    });
  }

}