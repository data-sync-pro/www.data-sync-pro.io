import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  ViewEncapsulation,
  HostListener
} from '@angular/core';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { ActivatedRoute, Router } from '@angular/router';
import { Meta, Title } from '@angular/platform-browser';
import { Subject } from 'rxjs';
import { takeUntil, debounceTime } from 'rxjs/operators';

import {
  RecipeItem,
  RecipeCategory,
  RecipeFilter,
  RecipeProgress,
  RecipeNavigationState,
  RecipeSection,
  RecipeTab,
  RecipeTOCStructure
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
  activeSectionId: string;
  expandedTabs: Set<string>;
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
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [
    trigger('slideInOut', [
      transition(':enter', [
        style({ height: '0', opacity: 0, overflow: 'hidden' }),
        animate('200ms ease-in', style({ height: '*', opacity: 1 }))
      ]),
      transition(':leave', [
        animate('200ms ease-out', style({ height: '0', opacity: 0, overflow: 'hidden' }))
      ])
    ])
  ]
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
    activeRecipeTab: 'overview',
    activeSectionId: 'use-case',
    expandedTabs: new Set(['overview'])
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
  
  // Recipe TOC structure
  recipeTOC: RecipeTOCStructure = {
    tabs: [],
    currentTabId: 'overview',
    currentSectionId: 'use-case',
    expandedTabs: new Set(['overview'])
  };
  
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
    
    // Add body class to hide footer on recipe pages
    document.body.classList.add('recipe-page');
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
    
    // Remove body class when leaving recipe pages
    document.body.classList.remove('recipe-page');
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
          // Generate TOC structure for the loaded recipe
          this.generateRecipeTOCStructure();
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
    this.ui.activeSectionId = 'use-case';
    this.ui.expandedTabs = new Set(['overview']);
    
    if (this.ui.isMobile) {
      this.closeMobileSidebar();
    }
  }

  /**
   * Change recipe tab
   */
  changeRecipeTab(tabName: string): void {
    console.log('Changing recipe tab to:', tabName);
    
    this.ui.activeRecipeTab = tabName;
    this.recipeTOC.currentTabId = tabName;
    
    // Toggle tab expansion
    if (this.ui.expandedTabs.has(tabName)) {
      this.ui.expandedTabs.delete(tabName);
    } else {
      this.ui.expandedTabs.add(tabName);
    }
    this.recipeTOC.expandedTabs = this.ui.expandedTabs;
    
    // Set first section as active and scroll to it
    const selectedTab = this.recipeTOC.tabs.find(tab => tab.id === tabName);
    if (selectedTab && selectedTab.sections.length > 0) {
      this.ui.activeSectionId = selectedTab.sections[0].id;
      this.recipeTOC.currentSectionId = selectedTab.sections[0].id;
      
      // Scroll to first section after tab content is rendered with extra delay for padding to take effect
      setTimeout(() => {
        this.scrollToSectionWithRetry(selectedTab.sections[0].id);
      }, 400); // Increased delay for better DOM rendering and padding application
    }
    
    // Close mobile TOC after tab change
    if (this.ui.isMobile) {
      this.closeMobileTOC();
    }
    
    this.cdr.markForCheck();
  }

  /**
   * Change recipe section
   */
  changeRecipeSection(sectionId: string): void {
    console.log('Changing recipe section to:', sectionId);
    
    this.ui.activeSectionId = sectionId;
    this.recipeTOC.currentSectionId = sectionId;
    
    // Ensure the parent tab is expanded and active
    this.ensureParentTabActive(sectionId);
    
    // Scroll to the section element with improved reliability
    this.scrollToSectionWithRetry(sectionId);
    
    this.cdr.markForCheck();
  }

  /**
   * Ensure the parent tab of a section is active and expanded
   */
  private ensureParentTabActive(sectionId: string): void {
    const parentTab = this.recipeTOC.tabs.find(tab => 
      tab.sections.some(section => section.id === sectionId)
    );
    
    if (parentTab) {
      console.log('Ensuring parent tab is active:', parentTab.id);
      this.ui.activeRecipeTab = parentTab.id;
      this.recipeTOC.currentTabId = parentTab.id;
      this.ui.expandedTabs.add(parentTab.id);
      this.recipeTOC.expandedTabs = this.ui.expandedTabs;
    }
  }

  /**
   * Toggle tab expansion in TOC
   */
  toggleTabExpansion(tabId: string): void {
    if (this.ui.expandedTabs.has(tabId)) {
      this.ui.expandedTabs.delete(tabId);
    } else {
      this.ui.expandedTabs.add(tabId);
    }
    this.recipeTOC.expandedTabs = this.ui.expandedTabs;
    this.cdr.markForCheck();
  }

  /**
   * Wrapper method for scrolling with better retry handling
   */
  private scrollToSectionWithRetry(sectionId: string): void {
    // Allow multiple attempts with increasing delays to ensure DOM is ready
    let attempts = 0;
    const maxAttempts = 5;
    
    const attemptScroll = () => {
      attempts++;
      const container = document.querySelector('.recipe-main') as HTMLElement;
      
      if (container && container.scrollHeight > container.clientHeight) {
        // Container is ready, proceed with scroll
        this.scrollToSection(sectionId, 0);
      } else if (attempts < maxAttempts) {
        // Container not ready or no scrollable content, retry
        console.log(`Container not ready, retry ${attempts}/${maxAttempts}`);
        setTimeout(attemptScroll, 100 * attempts); // 100ms, 200ms, 300ms, etc.
      } else {
        // Final attempt
        console.log('Final scroll attempt after retries');
        this.scrollToSection(sectionId, 0);
      }
    };
    
    attemptScroll();
  }

  /**
   * Scroll to specific section with container-based scrolling to prevent footer appearance
   */
  private scrollToSection(sectionId: string, retryCount: number = 0): void {
    console.log('Scrolling to section:', sectionId, 'retry:', retryCount);
    
    const section = this.recipeTOC.tabs
      .flatMap(tab => tab.sections)
      .find(section => section.id === sectionId);
    
    if (section && section.elementId) {
      // Use requestAnimationFrame to ensure DOM is fully rendered
      requestAnimationFrame(() => {
        const element = document.getElementById(section.elementId!);
        const container = document.querySelector('.recipe-main') as HTMLElement;
        
        if (element && container) {
          console.log('Element and container found:', section.elementId, 'scrolling...');
          
          // Get container dimensions and scroll info
          const containerRect = container.getBoundingClientRect();
          const elementRect = element.getBoundingClientRect();
          const containerScrollTop = container.scrollTop;
          const containerHeight = container.clientHeight;
          const containerScrollHeight = container.scrollHeight;
          
          // Calculate element position relative to container
          const elementTopInContainer = elementRect.top - containerRect.top + containerScrollTop;
          const headerOffset = 100; // Fixed header offset
          
          // Calculate target scroll position
          let targetScrollTop = elementTopInContainer - headerOffset;
          
          // Calculate maximum scroll position to prevent over-scrolling
          const maxScrollTop = containerScrollHeight - containerHeight;
          
          // Check if element is in bottom area of container
          const elementRelativePosition = elementTopInContainer / containerScrollHeight;
          if (elementRelativePosition > 0.8) {
            // For bottom sections, use scrollIntoView to ensure visibility without over-scrolling
            console.log('Bottom section detected, using scrollIntoView');
            element.scrollIntoView({
              behavior: 'smooth',
              block: 'center', // Center the element instead of aligning to top
              inline: 'nearest'
            });
            return;
          }
          
          // Ensure we don't scroll beyond container boundaries
          const finalScrollPosition = Math.min(Math.max(0, targetScrollTop), maxScrollTop);
          
          console.log('Container scroll calculation:', {
            elementTopInContainer,
            targetScrollTop,
            maxScrollTop,
            finalScrollPosition,
            containerHeight,
            containerScrollHeight,
            elementRelativePosition
          });

          // Scroll the container instead of the window
          container.scrollTo({
            top: finalScrollPosition,
            behavior: 'smooth'
          });
          
        } else {
          console.warn('Element or container not found:', section.elementId);
          
          // Retry up to 3 times with increasing delays
          if (retryCount < 3) {
            setTimeout(() => {
              this.scrollToSection(sectionId, retryCount + 1);
            }, 200 * (retryCount + 1)); // 200ms, 400ms, 600ms
          } else {
            console.error('Failed to find element after retries:', section.elementId);
            // Final fallback: use scrollIntoView
            const fallbackElement = document.getElementById(section.elementId!);
            if (fallbackElement) {
              fallbackElement.scrollIntoView({
                behavior: 'smooth',
                block: 'center',
                inline: 'nearest'
              });
            }
          }
        }
      });
    } else {
      console.warn('Section not found in TOC structure:', sectionId);
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
    return 2; // Overview and Walkthrough are always available (Download merged into Overview)
  }

  /**
   * Generate recipe TOC structure based on current recipe
   */
  generateRecipeTOCStructure(): void {
    if (!this.currentRecipe) {
      this.recipeTOC.tabs = [];
      return;
    }

    const tabs: RecipeTab[] = [];

    // Overview Tab
    tabs.push({
      id: 'overview',
      title: 'Overview',
      icon: 'article',
      description: '',
      sections: [
        {
          id: 'use-case',
          title: 'Use Case',
          icon: 'info',
          elementId: 'recipe-use-case'
        },
        {
          id: 'building-permissions',
          title: 'Building Permissions',
          icon: 'build',
          elementId: 'recipe-building-permissions'
        },
        {
          id: 'using-permissions',
          title: 'Using Permissions',
          icon: 'group',
          elementId: 'recipe-using-permissions'
        },
        {
          id: 'setup-instructions',
          title: 'Setup Instructions',
          icon: 'settings',
          elementId: 'recipe-setup-instructions'
        }
      ]
    });

    // Add download sections to Overview tab if downloadable executable exists
    if (this.currentRecipe.downloadableExecutable) {
      tabs[0].sections.push(
        {
          id: 'download-executable',
          title: 'Download Executable',
          icon: 'get_app',
          elementId: 'recipe-download-executable'
        },
        {
          id: 'installation-guide',
          title: 'Installation Guide',
          icon: 'install_desktop',
          elementId: 'recipe-installation-guide'
        },
        {
          id: 'version-info',
          title: 'Version Information',
          icon: 'info',
          elementId: 'recipe-version-info'
        }
      );
    }

    // Walkthrough Tab
    const walkthroughSections: RecipeSection[] = [];
    const walkthrough = this.currentRecipe.walkthrough;

    if (walkthrough.createExecutable) {
      walkthroughSections.push({
        id: 'create-executable',
        title: 'Create Executable',
        icon: 'add_circle',
        elementId: 'recipe-create-executable'
      });
    }

    if (walkthrough.retrieve) {
      walkthroughSections.push({
        id: 'retrieve-data',
        title: 'Retrieve Data',
        icon: 'download',
        elementId: 'recipe-retrieve-data'
      });
    }

    if (walkthrough.scoping) {
      walkthroughSections.push({
        id: 'scoping',
        title: 'Scoping',
        icon: 'filter_list',
        elementId: 'recipe-scoping'
      });
    }

    if (walkthrough.match) {
      walkthroughSections.push({
        id: 'match',
        title: 'Match',
        icon: 'compare_arrows',
        elementId: 'recipe-match'
      });
    }

    if (walkthrough.mapping) {
      walkthroughSections.push({
        id: 'mapping',
        title: 'Mapping',
        icon: 'swap_horiz',
        elementId: 'recipe-mapping'
      });
    }

    if (walkthrough.action) {
      walkthroughSections.push({
        id: 'action',
        title: 'Action',
        icon: 'play_arrow',
        elementId: 'recipe-action'
      });
    }

    if (walkthrough.verify) {
      walkthroughSections.push({
        id: 'verify',
        title: 'Verify',
        icon: 'check_circle',
        elementId: 'recipe-verify'
      });
    }

    if (walkthrough.previewTransformed) {
      walkthroughSections.push({
        id: 'preview-transformed',
        title: 'Preview Transformed',
        icon: 'preview',
        elementId: 'recipe-preview-transformed'
      });
    }

    if (walkthrough.addSchedule) {
      walkthroughSections.push({
        id: 'add-schedule',
        title: 'Add Schedule',
        icon: 'schedule',
        elementId: 'recipe-add-schedule'
      });
    }

    tabs.push({
      id: 'walkthrough',
      title: 'Walkthrough',
      icon: 'timeline',
      description: 'Step-by-step Guide',
      sections: walkthroughSections
    });


    this.recipeTOC.tabs = tabs;
    this.recipeTOC.currentTabId = this.ui.activeRecipeTab;
    this.recipeTOC.currentSectionId = this.ui.activeSectionId;
    this.recipeTOC.expandedTabs = this.ui.expandedTabs;
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