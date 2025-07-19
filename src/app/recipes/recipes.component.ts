import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  ViewEncapsulation
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

interface UIState {
  isLoading: boolean;
  sidebarCollapsed: boolean;
  mobileSidebarOpen: boolean;
  mobileTOCOpen: boolean;
  isMobile: boolean;
  currentView: 'home' | 'category' | 'recipe';
}

interface SearchState {
  query: string;
  isActive: boolean;
  results: RecipeItem[];
  hasResults: boolean;
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
    currentView: 'home'
  };

  search: SearchState = {
    query: '',
    isActive: false,
    results: [],
    hasResults: true
  };

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
    difficulties: [],
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
    
    if (this.ui.isMobile) {
      this.closeMobileSidebar();
    }
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
   * Get category icon for sidebar
   */
  getCategoryIcon(categoryName: string): string {
    switch (categoryName) {
      case 'action-button': return 'smart_button';
      case 'batch': return 'layers';
      case 'data-list': return 'list_alt';
      case 'data-loader': return 'upload_file';
      case 'triggers': return 'bolt';
      default: return 'description';
    }
  }
}