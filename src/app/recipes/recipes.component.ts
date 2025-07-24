import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  ViewEncapsulation,
  HostListener
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Meta, Title } from '@angular/platform-browser';
import { Subject } from 'rxjs';
import { takeUntil, debounceTime } from 'rxjs/operators';

import {
  RecipeItem,
  RecipeCategory,
  RecipeFilter,
  RecipeProgress,
  RecipeNavigationState
} from '../shared/models/recipe.model';
import { RecipeService } from '../shared/services/recipe.service';
import { SelectedRecipe } from './recipe-search-overlay/recipe-search-overlay.component';

interface UIState {
  isLoading: boolean;
  sidebarCollapsed: boolean;
  mobileSidebarOpen: boolean;
  mobileTOCOpen: boolean;
  isMobile: boolean;
  currentView: 'home' | 'category' | 'recipe';
  tocHidden: boolean;
  tocInFooterZone: boolean;
  tocFooterApproaching: boolean;
  activeRecipeTab: string;
}

interface TOCPaginationState {
  currentPage: number;
  itemsPerPage: number;
  totalPages: number;
  startIndex: number;
  endIndex: number;
}

interface SearchState {
  query: string;
  isActive: boolean;
  results: RecipeItem[];
  hasResults: boolean;
  isOverlayOpen: boolean;
}

@Component({
  selector: 'app-recipes',
  templateUrl: './recipes.component.html',
  styleUrls: ['./recipes.component.scss'],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RecipesComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // State management
  ui: UIState = {
    isLoading: false,
    sidebarCollapsed: false,
    mobileSidebarOpen: false,
    mobileTOCOpen: false,
    isMobile: false,
    currentView: 'home',
    tocHidden: false,
    tocInFooterZone: false,
    tocFooterApproaching: false,
    activeRecipeTab: 'overview'
  };

  // TOC pagination state
  tocPagination: TOCPaginationState = {
    currentPage: 1,
    itemsPerPage: 8,
    totalPages: 1,
    startIndex: 0,
    endIndex: 0
  };

  // TOC data
  private _cachedTrendingRecipes?: RecipeItem[];
  private _lastRecipesLength?: number;

  search: SearchState = {
    query: '',
    isActive: false,
    results: [],
    hasResults: true,
    isOverlayOpen: false
  };

  // Search overlay state
  searchOverlayInitialQuery = '';

  navigation: RecipeNavigationState = {
    category: '',
    recipeName: ''
  };

  // Data
  recipes: RecipeItem[] = [];
  categories: RecipeCategory[] = [];
  currentRecipe: RecipeItem | null = null;
  filteredRecipes: RecipeItem[] = [];
  
  // Filters
  currentFilter: RecipeFilter = {
    categories: [],
    searchQuery: '',
    showPopularOnly: false,
    tags: []
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private recipeService: RecipeService,
    private meta: Meta,
    private title: Title,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.initializeComponent();
    this.setupRouteHandling();
    this.loadInitialData();
    this.checkMobileView();
    this.loadSidebarState();
    this.loadTOCState();
  }

  /**
   * Keyboard shortcuts for search overlay
   */
  @HostListener('document:keydown./', ['$event'])
  onSlashKey(event: KeyboardEvent) {
    if (!this.search.isOverlayOpen && !this.isInputFocused()) {
      event.preventDefault();
      this.openSearchOverlay();
    }
  }

  @HostListener('document:keydown.control.k', ['$event'])
  @HostListener('document:keydown.meta.k', ['$event'])
  onCtrlK(event: KeyboardEvent) {
    event.preventDefault();
    if (!this.search.isOverlayOpen) {
      this.openSearchOverlay();
    }
  }

  @HostListener('document:keydown.escape')
  onEscape() {
    if (this.search.isOverlayOpen) {
      this.closeSearchOverlay();
    }
  }

  private isInputFocused(): boolean {
    const activeElement = document.activeElement;
    return !!(activeElement instanceof HTMLInputElement || 
           activeElement instanceof HTMLTextAreaElement ||
           (activeElement && activeElement.tagName === 'INPUT') ||
           (activeElement && activeElement.tagName === 'TEXTAREA'));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Initialize component
   */
  private initializeComponent(): void {
    this.updateUIState({ isLoading: true });
  }

  /**
   * Setup route parameter handling
   */
  private setupRouteHandling(): void {
    this.route.paramMap.pipe(
      takeUntil(this.destroy$)
    ).subscribe(params => {
      const category = params.get('category') || '';
      const recipeName = params.get('recipeName') || '';
      
      this.navigation = { category, recipeName };
      
      // Determine current view
      if (recipeName) {
        this.ui.currentView = 'recipe';
        this.loadRecipeDetails(category, recipeName);
      } else if (category) {
        this.ui.currentView = 'category';
        this.loadCategoryRecipes(category);
      } else {
        this.ui.currentView = 'home';
        this.loadAllRecipes();
      }
      
      this.updatePageMetadata();
      this.cdr.markForCheck();
    });
  }

  /**
   * Load initial data
   */
  private loadInitialData(): void {
    this.updateUIState({ isLoading: true });
    
    // Load categories
    this.recipeService.getCategories().pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (categories) => {
        this.categories = categories;
        this.cdr.markForCheck();
      },
      error: (error) => {
        console.error('Failed to load categories:', error);
      }
    });
    
    // Load all recipes
    this.recipeService.getRecipes().pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (recipes) => {
        this.recipes = recipes;
        this.filteredRecipes = recipes;
        this.resetTOCPagination();
        this.updateUIState({ isLoading: false });
        this.cdr.markForCheck();
      },
      error: (error) => {
        console.error('Failed to load recipes:', error);
        this.updateUIState({ isLoading: false });
      }
    });
  }

  /**
   * Load all recipes for home view
   */
  private loadAllRecipes(): void {
    this.recipeService.getRecipes().pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (recipes) => {
        this.recipes = recipes;
        this.filteredRecipes = recipes;
        this.updateUIState({ isLoading: false });
        this.cdr.markForCheck();
      },
      error: (error) => {
        console.error('Failed to load recipes:', error);
        this.updateUIState({ isLoading: false });
      }
    });
  }

  /**
   * Load recipes for specific category
   */
  private loadCategoryRecipes(category: string): void {
    this.recipeService.getRecipesByCategory(category).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (recipes) => {
        this.recipes = recipes;
        this.filteredRecipes = recipes;
        this.updateUIState({ isLoading: false });
        this.cdr.markForCheck();
      },
      error: (error) => {
        console.error('Failed to load category recipes:', error);
        this.updateUIState({ isLoading: false });
      }
    });
  }

  /**
   * Load specific recipe details
   */
  private loadRecipeDetails(category: string, recipeName: string): void {
    this.recipeService.getRecipe(category, recipeName).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (recipe) => {
        this.currentRecipe = recipe;
        this.updateUIState({ isLoading: false });
        
        if (recipe) {
          this.trackRecipeView(recipe);
        }
        
        this.cdr.markForCheck();
      },
      error: (error) => {
        console.error('Failed to load recipe details:', error);
        this.updateUIState({ isLoading: false });
      }
    });
  }

  /**
   * Get recipe count
   */
  getRecipeCount(): number {
    return this.recipes.length;
  }

  /**
   * Navigate to home
   */
  goHome(): void {
    this.router.navigate(['/recipes']);
  }

  /**
   * Navigate to category
   */
  goToCategory(categoryName: string): void {
    this.router.navigate(['/recipes', categoryName]);
    
    if (this.ui.isMobile) {
      this.closeMobileSidebar();
    }
  }

  /**
   * Navigate to recipe
   */
  goToRecipe(recipe: RecipeItem): void {
    this.router.navigate(['/recipes', recipe.category, recipe.name]);
    
    // Reset to overview tab when navigating to a different recipe
    this.ui.activeRecipeTab = 'overview';
    
    if (this.ui.isMobile) {
      this.closeMobileSidebar();
    }
  }

  /**
   * Change recipe tab
   */
  changeRecipeTab(tabName: string): void {
    this.ui.activeRecipeTab = tabName;
    this.cdr.markForCheck();
  }

  /**
   * Search recipes
   */
  searchRecipes(query: string): void {
    this.search.query = query;
    this.search.isActive = query.trim().length > 0;
    
    if (this.search.isActive) {
      this.recipeService.searchRecipes(query, this.currentFilter).pipe(
        takeUntil(this.destroy$)
      ).subscribe({
        next: (results) => {
          this.search.results = results;
          this.search.hasResults = results.length > 0;
          this.filteredRecipes = results;
          this.cdr.markForCheck();
        },
        error: (error) => {
          console.error('Search failed:', error);
        }
      });
    } else {
      this.filteredRecipes = this.recipes;
      this.search.results = [];
      this.cdr.markForCheck();
    }
  }

  /**
   * Clear search
   */
  clearSearch(): void {
    this.search.query = '';
    this.search.isActive = false;
    this.search.results = [];
    this.filteredRecipes = this.recipes;
    this.cdr.markForCheck();
  }

  /**
   * Track recipe view
   */
  private trackRecipeView(recipe: RecipeItem): void {
    this.recipeService.trackRecipeEvent({
      type: 'view',
      recipeId: recipe.id,
      recipeTitle: recipe.title,
      recipeCategory: recipe.category,
      timestamp: new Date()
    });
  }

  /**
   * Update recipe progress
   */
  updateRecipeProgress(recipe: RecipeItem, stepNumber: number): void {
    const progress: RecipeProgress = {
      recipeId: recipe.id,
      currentStep: stepNumber,
      completedSteps: recipe.completedSteps || [],
      timeSpent: 0, // Could be calculated based on time tracking
      lastAccessed: new Date()
    };
    
    if (!progress.completedSteps.includes(stepNumber)) {
      progress.completedSteps.push(stepNumber);
    }
    
    this.recipeService.saveRecipeProgress(progress);
    
    // Update local recipe state
    recipe.currentStep = stepNumber;
    recipe.completedSteps = progress.completedSteps;
    
    this.cdr.markForCheck();
  }

  /**
   * Check if mobile view
   */
  private checkMobileView(): void {
    this.updateUIState({ isMobile: window.innerWidth <= 768 });
  }

  /**
   * Toggle sidebar
   */
  toggleSidebar(): void {
    const collapsed = !this.ui.sidebarCollapsed;
    this.updateUIState({ sidebarCollapsed: collapsed });
    localStorage.setItem('recipe-sidebar-collapsed', collapsed.toString());
  }

  /**
   * Toggle mobile sidebar
   */
  toggleMobileSidebar(): void {
    this.updateUIState({ mobileSidebarOpen: !this.ui.mobileSidebarOpen });
  }

  /**
   * Close mobile sidebar
   */
  closeMobileSidebar(): void {
    this.updateUIState({ mobileSidebarOpen: false });
  }

  /**
   * Load sidebar state from localStorage
   */
  private loadSidebarState(): void {
    const savedState = localStorage.getItem('recipe-sidebar-collapsed');
    if (savedState !== null) {
      this.updateUIState({ sidebarCollapsed: savedState === 'true' });
    }
  }

  /**
   * Update page metadata
   */
  private updatePageMetadata(): void {
    let pageTitle = 'Recipes - Data Sync Pro';
    let pageDescription = 'Step-by-step recipes for Data Sync Pro implementation';

    if (this.currentRecipe) {
      pageTitle = `${this.currentRecipe.title} - Recipe - Data Sync Pro`;
      pageDescription = this.currentRecipe.description;
    } else if (this.navigation.category) {
      const category = this.categories.find(cat => cat.name === this.navigation.category);
      if (category) {
        pageTitle = `${category.displayName} Recipes - Data Sync Pro`;
        pageDescription = category.description;
      }
    }

    this.title.setTitle(pageTitle);
    this.meta.updateTag({ name: 'description', content: pageDescription });
    this.meta.updateTag({ property: 'og:title', content: pageTitle });
    this.meta.updateTag({ property: 'og:description', content: pageDescription });
    this.meta.updateTag({ property: 'og:url', content: window.location.href });
  }

  /**
   * State update helper for OnPush optimization
   */
  private updateUIState(updates: Partial<UIState>): void {
    this.ui = { ...this.ui, ...updates };
    this.cdr.markForCheck();
  }

  /**
   * Get current breadcrumb path
   */
  get breadcrumbPath(): { name: string; url: string }[] {
    const path = [{ name: 'Recipes', url: '/recipes' }];
    
    if (this.navigation.category) {
      const category = this.categories.find(cat => cat.name === this.navigation.category);
      const categoryName = category?.displayName || this.navigation.category;
      path.push({ 
        name: categoryName, 
        url: `/recipes/${this.navigation.category}` 
      });
    }
    
    if (this.currentRecipe) {
      path.push({ 
        name: this.currentRecipe.title, 
        url: `/recipes/${this.navigation.category}/${this.navigation.recipeName}` 
      });
    }
    
    return path;
  }

  /**
   * Get recipes for current view
   */
  get currentRecipes(): RecipeItem[] {
    return this.search.isActive ? this.search.results : this.filteredRecipes;
  }

  /**
   * Check if showing home view
   */
  get showHome(): boolean {
    return this.ui.currentView === 'home' && !this.search.isActive;
  }

  /**
   * Check if showing category view
   */
  get showCategory(): boolean {
    return this.ui.currentView === 'category' && !this.search.isActive;
  }

  /**
   * Check if showing recipe details
   */
  get showRecipeDetails(): boolean {
    return this.ui.currentView === 'recipe' && !!this.currentRecipe;
  }

  /**
   * Get current category info
   */
  get currentCategory(): RecipeCategory | null {
    return this.categories.find(cat => cat.name === this.navigation.category) || null;
  }

  /**
   * Get category icon for sidebar - Updated with more semantic and visually appealing icons
   */
  getCategoryIcon(categoryName: string): string {
    switch (categoryName) {
      case 'action-button': return 'touch_app';        // More intuitive touch/action icon
      case 'batch': return 'batch_prediction';         // Specialized batch processing icon  
      case 'data-list': return 'view_list';           // Clearer list visualization icon
      case 'data-loader': return 'cloud_upload';      // Modern cloud upload icon
      case 'triggers': return 'flash_on';             // Dynamic lightning icon
      default: return 'article';                      // More semantic document icon
    }
  }

  /**
   * Open search overlay
   */
  openSearchOverlay(initialQuery = ''): void {
    this.searchOverlayInitialQuery = initialQuery;
    this.search.isOverlayOpen = true;
    
    // Prevent body scrolling when overlay is open
    document.body.style.overflow = 'hidden';
    
    this.cdr.markForCheck();
  }

  /**
   * Close search overlay
   */
  closeSearchOverlay(): void {
    this.search.isOverlayOpen = false;
    
    // Restore body scrolling
    document.body.style.overflow = '';
    
    this.cdr.markForCheck();
  }

  /**
   * Handle search overlay selection
   */
  handleSearchOverlaySelect(selectedRecipe: SelectedRecipe): void {
    // Navigate to the selected recipe
    this.router.navigate(['/recipes', selectedRecipe.category, selectedRecipe.id]);
    
    // Track search usage
    this.recipeService.trackRecipeEvent({
      type: 'search',
      recipeId: selectedRecipe.id,
      recipeTitle: selectedRecipe.title,
      recipeCategory: selectedRecipe.category,
      searchQuery: this.searchOverlayInitialQuery,
      timestamp: new Date()
    });
    
    this.closeSearchOverlay();
  }

  // ==================== TOC Methods ====================

  /**
   * Check if TOC should be shown
   */
  get shouldShowTOC(): boolean {
    // Don't show during search
    if (this.search.isActive || this.search.query.trim()) return false;
    
    // Show on home page if we have trending recipes
    if (this.showHome) return this.trendingRecipes.length > 0;
    
    // Show on category pages if we have multiple recipes
    return (!!this.navigation.category) && this.currentRecipes.length > 1;
  }

  /**
   * Get trending recipes for home page TOC
   */
  get trendingRecipes(): RecipeItem[] {
    if (!this._cachedTrendingRecipes || this._lastRecipesLength !== this.recipes.length) {
      // Sort by estimated time (shorter first) and category diversity
      this._cachedTrendingRecipes = [...this.recipes]
        .sort((a, b) => {
          // Sort by title alphabetically
          // Finally by title alphabetically
          return a.title.localeCompare(b.title);
        })
        .slice(0, 20); // Limit to 20 trending recipes
      
      this._lastRecipesLength = this.recipes.length;
    }
    return this._cachedTrendingRecipes;
  }

  /**
   * Get current TOC title
   */
  get currentTOCTitle(): string {
    if (this.showHome) return 'Popular Recipes';
    if (this.navigation.category) {
      const category = this.categories.find(c => c.name === this.navigation.category);
      return category ? `${category.displayName} Recipes` : 'Category Recipes';
    }
    return 'Recipes';
  }

  /**
   * Get TOC item count
   */
  get tocItemCount(): number {
    if (this.showHome) return this.trendingRecipes.length;
    return this.currentRecipes.length;
  }

  /**
   * Get recipe tab count for TOC
   */
  getRecipeTabCount(): number {
    let count = 2; // Overview and Walkthrough are always available
    if (this.currentRecipe?.downloadableExecutable) {
      count++; // Add Download tab if available
    }
    return count;
  }

  /**
   * Get paginated trending recipes
   */
  get paginatedTrendingRecipes(): RecipeItem[] {
    if (!this.showHome) return [];
    return this.trendingRecipes.slice(this.tocPagination.startIndex, this.tocPagination.endIndex);
  }

  /**
   * Get paginated category recipes
   */
  get paginatedCategoryRecipes(): RecipeItem[] {
    if (this.showHome) return [];
    return this.currentRecipes.slice(this.tocPagination.startIndex, this.tocPagination.endIndex);
  }

  /**
   * Get TOC pagination info
   */
  get tocPaginationInfo(): string {
    const start = this.tocPagination.startIndex + 1;
    const end = Math.min(this.tocPagination.endIndex, this.tocItemCount);
    return `${start}-${end} of ${this.tocItemCount}`;
  }

  /**
   * Check if has previous TOC page
   */
  get hasPreviousTOCPage(): boolean {
    return this.tocPagination.currentPage > 1;
  }

  /**
   * Check if has next TOC page
   */
  get hasNextTOCPage(): boolean {
    return this.tocPagination.currentPage < this.tocPagination.totalPages;
  }

  /**
   * Go to previous TOC page
   */
  goToPreviousTOCPage(): void {
    if (this.tocPagination.currentPage > 1) {
      this.tocPagination.currentPage--;
      this.updateTOCPaginationIndices();
      this.cdr.markForCheck();
    }
  }

  /**
   * Go to next TOC page
   */
  goToNextTOCPage(): void {
    if (this.tocPagination.currentPage < this.tocPagination.totalPages) {
      this.tocPagination.currentPage++;
      this.updateTOCPaginationIndices();
      this.cdr.markForCheck();
    }
  }

  /**
   * Update TOC pagination indices
   */
  private updateTOCPaginationIndices(): void {
    const totalItems = this.tocItemCount;
    this.tocPagination.totalPages = Math.ceil(totalItems / this.tocPagination.itemsPerPage);
    this.tocPagination.startIndex = (this.tocPagination.currentPage - 1) * this.tocPagination.itemsPerPage;
    this.tocPagination.endIndex = Math.min(
      this.tocPagination.startIndex + this.tocPagination.itemsPerPage,
      totalItems
    );
  }

  /**
   * Reset TOC pagination
   */
  private resetTOCPagination(): void {
    this.tocPagination.currentPage = 1;
    this.updateTOCPaginationIndices();
  }

  /**
   * Toggle TOC visibility
   */
  toggleTOC(): void {
    this.ui.tocHidden = !this.ui.tocHidden;
    this.saveTOCState();
    this.cdr.markForCheck();
  }

  /**
   * Toggle mobile TOC
   */
  toggleMobileTOC(): void {
    this.ui.mobileTOCOpen = !this.ui.mobileTOCOpen;
    this.cdr.markForCheck();
  }

  /**
   * Close mobile TOC
   */
  closeMobileTOC(): void {
    this.ui.mobileTOCOpen = false;
    this.cdr.markForCheck();
  }

  /**
   * Save TOC state to localStorage
   */
  private saveTOCState(): void {
    try {
      localStorage.setItem('recipe_toc_hidden', JSON.stringify(this.ui.tocHidden));
    } catch (error) {
      console.warn('Failed to save TOC state:', error);
    }
  }

  /**
   * Load TOC state from localStorage
   */
  private loadTOCState(): void {
    try {
      const saved = localStorage.getItem('recipe_toc_hidden');
      if (saved !== null) {
        this.ui.tocHidden = JSON.parse(saved);
      }
    } catch (error) {
      console.warn('Failed to load TOC state:', error);
    }
  }

}