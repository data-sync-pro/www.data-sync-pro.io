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
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import {
  RecipeItem,
  RecipeCategory,
  RecipeFilter,
  RecipeNavigationState,
  RecipeSection,
  RecipeTab,
  RecipeTOCStructure
} from '../shared/models/recipe.model';
import { RecipeService } from '../shared/services/recipe.service';
import { RecipePreviewService, RecipePreviewData } from '../shared/services/recipe-preview.service';
import { SelectedSuggestion } from './recipe-search-overlay/recipe-search-overlay.component';

interface SearchResult {
  item: RecipeItem;
  score: number;
  matchType: 'title' | 'content' | 'category';
  matchedText: string;
  highlightedTitle: string;
  highlightedOverview: string;
}

interface UIState {
  isLoading: boolean;
  sidebarCollapsed: boolean;
  mobileSidebarOpen: boolean;
  isMobile: boolean;
  currentView: 'home' | 'category' | 'recipe';
  isPreviewMode: boolean;
  tocHidden: boolean;
  activeSectionId: string;
  userHasScrolled: boolean;
  scrollTicking: boolean;
}

interface SearchState {
  query: string;
  isActive: boolean;
  results: SearchResult[];
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
    isMobile: false,
    currentView: 'home',
    isPreviewMode: false,
    tocHidden: false,
    activeSectionId: 'use-case',
    userHasScrolled: false,
    scrollTicking: false
  };

  private optimizedScrollListener?: () => void;
  private sectionObserver?: IntersectionObserver;
  private visibleSections = new Set<string>();

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
    currentSectionId: 'use-case'
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
    private previewService: RecipePreviewService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.initializeComponent();
    this.setupRouteHandling();
    this.loadInitialData();
    this.checkMobileView();
    this.loadSidebarState();
    this.setupOptimizedScrollListener();
    this.setupSectionObserver();

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

    // Clean up scroll listener
    if (this.optimizedScrollListener) {
      window.removeEventListener('scroll', this.optimizedScrollListener);
    }

    // Clean up section observer
    if (this.sectionObserver) {
      this.sectionObserver.disconnect();
    }

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
   * Sort recipes by category first, then by title A-Z
   */
  private sortRecipesByCategoryAndTitle(recipes: RecipeItem[]): RecipeItem[] {
    return [...recipes].sort((a, b) => {
      const categoryCompare = a.category.localeCompare(b.category);
      if (categoryCompare !== 0) {
        return categoryCompare;
      }
      return a.title.localeCompare(b.title);
    });
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
      
      // Check for preview mode
      this.route.queryParamMap.pipe(
        takeUntil(this.destroy$)
      ).subscribe(queryParams => {
        const isPreview = queryParams.get('preview') === 'true';
        const previewRecipeId = queryParams.get('recipeId');
        
        if (isPreview && previewRecipeId) {
          this.ui.isPreviewMode = true;
          this.ui.currentView = 'recipe';
          this.loadPreviewRecipe(previewRecipeId);
          this.setupPreviewSync(previewRecipeId);
        } else {
          this.ui.isPreviewMode = false;
          // Determine current view for normal mode
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
        }
      });
      
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
        // Only set filteredRecipes when in home view to avoid overwriting category filters
        if (this.ui.currentView === 'home') {
          this.filteredRecipes = this.sortRecipesByCategoryAndTitle(recipes);
        }
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
        this.filteredRecipes = this.sortRecipesByCategoryAndTitle(recipes);
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
        this.filteredRecipes = this.sortRecipesByCategoryAndTitle(recipes);
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
   * Load specific recipe details by slug
   */
  private loadRecipeDetails(category: string, recipeSlug: string): void {
    this.recipeService.getRecipe(category, recipeSlug).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (recipe) => {
        this.currentRecipe = recipe;
        this.updateUIState({ isLoading: false });

        if (recipe) {
          // Generate TOC structure for the loaded recipe
          this.generateRecipeTOCStructure();
          // Reset scroll state
          this.ui.userHasScrolled = false;
          // Re-observe all sections after recipe loads
          this.observeAllSections();
          // Handle initial URL hash if present
          this.handleInitialHash();
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
   * Load recipe from preview data
   */
  private loadPreviewRecipe(recipeId: string): void {
    const previewData = this.previewService.getPreviewData(recipeId);
    
    if (previewData) {
      // Convert preview data to RecipeItem format
      this.currentRecipe = this.convertPreviewToRecipeItem(previewData);
      this.updateUIState({ isLoading: false });
      
      if (this.currentRecipe) {
        this.generateRecipeTOCStructure();
        this.ui.userHasScrolled = false;
        // Re-observe all sections after preview recipe loads
        this.observeAllSections();
        // Handle initial URL hash if present
        this.handleInitialHash();

        // Set initial timestamp for comparison
        this.setPreviewTimestamp(previewData.timestamp);
      }
    
      this.cdr.markForCheck();
    } else {
      this.updateUIState({ isLoading: false });
    }
  }

  /**
   * Setup preview synchronization for cross-tab updates
   */
  private setupPreviewSync(recipeId: string): void {
    // Enhanced storage event listener
    const handleStorageChange = (event: StorageEvent) => {
      const sessionKey = `recipe-preview-${recipeId}`;
      const backupKey = `backup-recipe-preview-${recipeId}`;

      // Check both sessionStorage and localStorage keys
      if ((event.key === sessionKey || event.key === backupKey) && event.newValue) {
        try {
          const previewData = JSON.parse(event.newValue) as RecipePreviewData;
          this.updatePreviewContent(previewData);
        } catch (error) {
          console.error('❌ Error parsing recipe preview update data:', error);
        }
      }
    };

    // Listen for storage changes (cross-tab communication)
    window.addEventListener('storage', handleStorageChange);

    // Enhanced periodic check for updates (fallback mechanism)
    const updateInterval = setInterval(() => {
      this.checkForPreviewUpdates(recipeId);
    }, 1000);
    
    // Cleanup on destroy
    this.destroy$.subscribe(() => {
      clearInterval(updateInterval);
      window.removeEventListener('storage', handleStorageChange);
    });
  }

  /**
   * Update preview content with new data
   */
  private updatePreviewContent(previewData: RecipePreviewData): void {
    if (!this.currentRecipe) return;

    // Convert and update the current recipe item
    this.currentRecipe = this.convertPreviewToRecipeItem(previewData);
    
    // Update page title if needed
    document.title = `[Preview] ${previewData.title} - Data Sync Pro Recipes`;
    
    // Regenerate TOC structure for updated content
    this.generateRecipeTOCStructure();
    // Re-observe all sections after content update
    this.observeAllSections();

    // Update timestamp for comparison
    this.setPreviewTimestamp(previewData.timestamp);
    
    // Trigger change detection
    this.cdr.markForCheck();
  }

  /**
   * Check for preview updates via periodic polling (fallback mechanism)
   */
  private checkForPreviewUpdates(recipeId: string): void {
    const currentData = this.previewService.getPreviewData(recipeId);
    if (!currentData || !this.currentRecipe) return;

    const currentTimestamp = this.getPreviewTimestamp();

    if (currentData.timestamp > currentTimestamp) {
      this.updatePreviewContent(currentData);
    }
  }

  /**
   * Get preview timestamp for comparison
   */
  private getPreviewTimestamp(): number {
    return (this.currentRecipe as any)?._previewTimestamp || 0;
  }

  /**
   * Set preview timestamp
   */
  private setPreviewTimestamp(timestamp: number): void {
    if (this.currentRecipe) {
      (this.currentRecipe as any)._previewTimestamp = timestamp;
    }
  }

  /**
   * Convert preview data to RecipeItem format
   */
  private convertPreviewToRecipeItem(previewData: RecipePreviewData): RecipeItem {
    const sourceRecipe = previewData.recipeData;
    
    return {
      id: sourceRecipe.id,
      title: sourceRecipe.title,
      category: sourceRecipe.category,
      DSPVersions: sourceRecipe.DSPVersions,
      overview: sourceRecipe.overview,
      whenToUse: sourceRecipe.whenToUse,
      generalImages: sourceRecipe.generalImages,
      prerequisites: sourceRecipe.prerequisites,
      direction: sourceRecipe.direction,
      connection: sourceRecipe.connection,
      walkthrough: sourceRecipe.walkthrough,
      downloadableExecutables: sourceRecipe.downloadableExecutables,
      relatedRecipes: sourceRecipe.relatedRecipes,
      keywords: sourceRecipe.keywords
    };
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
    // Check if navigating to the same recipe
    const isSameRecipe = this.currentRecipe &&
                        this.currentRecipe.id === recipe.id &&
                        this.currentRecipe.category === recipe.category;

    this.router.navigate(['/recipes', recipe.category, recipe.slug]);

    // Reset to top section when navigating to a different recipe
    if (!isSameRecipe) {
      this.ui.activeSectionId = 'use-case';
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
          this.search.results = results.map(result => ({
            item: result,
            score: result.relevanceScore || 0,
            matchType: 'title' as const,
            matchedText: result.highlightedTitle || result.title,
            highlightedTitle: result.highlightedTitle || result.title,
            highlightedOverview: result.highlightedDescription || result.overview
          }));
          this.search.hasResults = results.length > 0;
          this.filteredRecipes = this.sortRecipesByCategoryAndTitle(results);
          this.cdr.markForCheck();
        },
        error: (error) => {
          console.error('Search failed:', error);
        }
      });
    } else {
      this.filteredRecipes = this.sortRecipesByCategoryAndTitle(this.recipes);
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
    this.filteredRecipes = this.sortRecipesByCategoryAndTitle(this.recipes);
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
    
    return path;
  }

  /**
   * Get recipes for current view
   */
  get currentRecipes(): RecipeItem[] {
    return this.search.isActive ? this.search.results.map(result => result.item) : this.filteredRecipes;
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
  handleSearchOverlaySelect(selectedRecipe: SelectedSuggestion): void {
    // Navigate to the selected recipe using slug
    this.router.navigate(['/recipes', selectedRecipe.category, selectedRecipe.slug]);


    this.closeSearchOverlay();
  }







  /**
   * Generate recipe TOC structure based on current recipe - Dynamic generation
   */
  generateRecipeTOCStructure(): void {
    if (!this.currentRecipe) {
      this.recipeTOC.tabs = [];
      return;
    }

    const tabs: RecipeTab[] = [];

    // Generate Overview Tab dynamically based on available content
    const overviewSections = this.generateOverviewSections();
    tabs.push({
      id: 'overview',
      title: 'Overview',
      sections: overviewSections
    });

    // Generate Walkthrough Tab dynamically
    const walkthroughSections = this.generateWalkthroughSections();
    if (walkthroughSections.length > 0) {
      tabs.push({
        id: 'walkthrough',
        title: 'Walkthrough',
        sections: walkthroughSections
      });
    }

    this.recipeTOC.tabs = tabs;
    this.recipeTOC.currentSectionId = this.ui.activeSectionId;
  }

  /**
   * Configuration for overview sections
   */
  private readonly overviewSectionConfigs = [
    {
      id: 'overview',
      title: 'Overview',
      elementId: 'recipe-overview',
      contentType: 'html',
      isVisible: () => this.hasValidOverview(),
      getData: () => this.currentRecipe?.overview,
      alwaysShow: true,
      isHighlight: true
    },
    {
      id: 'when-to-use',
      title: 'General Use Case',
      elementId: 'recipe-when-to-use',
      contentType: 'html',
      isVisible: () => this.hasValidWhenToUse(),
      getData: () => this.currentRecipe?.whenToUse
    },
    {
      id: 'dsp-versions',
      title: 'Supported DSP Versions',
      elementId: 'recipe-dsp-versions',
      contentType: 'tag-list',
      isVisible: () => !!(this.currentRecipe?.DSPVersions?.length && this.currentRecipe.DSPVersions.length > 0),
      getData: () => this.currentRecipe?.DSPVersions,
      tagClass: 'version-tag'
    },
    {
      id: 'prerequisites',
      title: 'Prerequisites',
      elementId: 'recipe-prerequisites',
      contentType: 'prerequisites',
      isVisible: () => this.hasArrayPrerequisites(),
      getData: () => this.getValidPrerequisites()
    },
    {
      id: 'building-permissions',
      title: 'Permission Sets for Building',
      elementId: 'recipe-building-permissions',
      contentType: 'list',
      isVisible: () => this.getPermissionSetsForBuilding().length > 0,
      getData: () => this.getPermissionSetsForBuilding()
    },
    {
      id: 'using-permissions',
      title: 'Permission Sets for Using',
      elementId: 'recipe-using-permissions',
      contentType: 'list',
      isVisible: () => this.getPermissionSetsForUsing().length > 0,
      getData: () => this.getPermissionSetsForUsing()
    },
    {
      id: 'download-executables',
      title: 'Download Executable Files',
      elementId: 'recipe-download-executables',
      contentType: 'download-list',
      isVisible: () => this.hasValidDownloadableExecutables(),
      getData: () => this.getValidDownloadableExecutables()
    },
    {
      id: 'related-recipes',
      title: 'Related Recipes',
      elementId: 'recipe-related',
      contentType: 'link-list',
      isVisible: () => this.hasValidRelatedRecipes(),
      getData: () => this.getValidRelatedRecipes()
    },
  ];

  /**
   * Generate Overview sections dynamically based on available content
   */
  private generateOverviewSections(): RecipeSection[] {
    const sections: RecipeSection[] = [];

    // Iterate through configuration and add visible sections
    for (const config of this.overviewSectionConfigs) {
      // Check if section should be visible
      if (config.alwaysShow || (config.isVisible && config.isVisible())) {
        sections.push({
          id: config.id,
          title: config.title,
          elementId: config.elementId
        });
      }
    }

    return sections;
  }

  /**
   * Get visible overview sections with their data for template rendering
   */
  getVisibleOverviewSections() {
    return this.overviewSectionConfigs.filter(config => 
      config.alwaysShow || (config.isVisible && config.isVisible())
    ).map(config => ({
      ...config,
      data: config.getData ? config.getData() : null
    }));
  }

  /**
   * Generate Walkthrough sections dynamically based on available content
   */
  private generateWalkthroughSections(): RecipeSection[] {
    const sections: RecipeSection[] = [];
    const walkthrough = this.currentRecipe?.walkthrough;

    // Handle new array format
    if (Array.isArray(walkthrough)) {
      walkthrough.forEach((step, index) => {
        sections.push({
          id: `step-${index}`,
          title: step.step || `Step ${index + 1}`,
          elementId: `recipe-step-${index}`
        });
      });
    }
    return sections;
  }



  // ==================== Scroll Tracking Methods ====================

  /**
   * Setup optimized scroll listener for section highlighting
   */
  private setupOptimizedScrollListener(): void {
    if (typeof window === 'undefined') return;
    
    this.optimizedScrollListener = () => {
      // Mark that user has scrolled - this enables TOC highlighting
      if (!this.ui.userHasScrolled) {
        this.ui.userHasScrolled = true;
      }
      
      if (!this.ui.scrollTicking) {
        requestAnimationFrame(() => {
          this.handleOptimizedScroll();
          this.ui.scrollTicking = false;
        });
        this.ui.scrollTicking = true;
      }
    };
    
    window.addEventListener('scroll', this.optimizedScrollListener, { passive: true });
  }

  /**
   * Handle scroll events
   * Note: Section highlighting is handled by Intersection Observer
   */
  private handleOptimizedScroll(): void {
    // Reserved for future scroll-based features if needed
  }

  /**
   * Setup Intersection Observer for automatic TOC highlighting
   */
  private setupSectionObserver(): void {
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      return;
    }

    const options: IntersectionObserverInit = {
      root: null,
      rootMargin: '-80px 0px -60% 0px', // Account for header and focus on top sections
      threshold: 0
    };

    this.sectionObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        const sectionId = entry.target.id;
        if (entry.isIntersecting) {
          this.visibleSections.add(sectionId);
        } else {
          this.visibleSections.delete(sectionId);
        }
      });

      // Update active section to the first visible one
      if (this.visibleSections.size > 0) {
        const firstVisible = Array.from(this.visibleSections)[0];
        this.updateActiveSection(firstVisible);
      }
    }, options);

    // Start observing sections
    this.observeAllSections();
  }

  /**
   * Observe all sections for TOC highlighting
   */
  private observeAllSections(): void {
    // Delay to ensure DOM is rendered
    setTimeout(() => {
      // Observe Overview sections
      this.getOverviewSectionsForTOC().forEach(section => {
        const element = document.getElementById(section.elementId || '');
        if (element) {
          this.sectionObserver?.observe(element);
        }
      });

      // Observe Walkthrough steps
      this.walkthroughStepsData.forEach((_, index) => {
        const element = document.getElementById(`step-${index}`);
        if (element) {
          this.sectionObserver?.observe(element);
        }
      });
    }, 100);
  }

  /**
   * Update active section for TOC highlighting
   */
  private updateActiveSection(sectionId: string): void {
    if (this.ui.activeSectionId !== sectionId) {
      this.ui.activeSectionId = sectionId;
      this.recipeTOC.currentSectionId = sectionId;
      this.cdr.markForCheck();
    }
  }


  /**
   * Get Overview sections for TOC display
   */
  getOverviewSectionsForTOC(): RecipeSection[] {
    const overviewTab = this.recipeTOC.tabs.find(tab => tab.id === 'overview');
    return overviewTab ? overviewTab.sections : [];
  }

  /**
   * Get Walkthrough sections for TOC display
   */
  getWalkthroughSectionsForTOC(): RecipeSection[] {
    const walkthroughTab = this.recipeTOC.tabs.find(tab => tab.id === 'walkthrough');
    return walkthroughTab ? walkthroughTab.sections : [];
  }

  /**
   * Navigate to Overview section - Scroll to section anchor
   */
  navigateToOverviewSection(sectionId: string): void {
    const sectionElement = document.getElementById(sectionId);
    if (sectionElement) {
      sectionElement.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });

      // Update URL hash for anchor support
      this.updateUrlHash(sectionId);

      // Update active section for TOC highlighting
      this.ui.activeSectionId = sectionId;
      this.recipeTOC.currentSectionId = sectionId;
      this.cdr.markForCheck();
    }
  }

  /**
   * Navigate to Walkthrough section - Scroll to step anchor
   */
  navigateToWalkthroughSection(stepIndex: number): void {
    // Scroll to the step immediately (no tab switching needed)
    this.scrollToStep(stepIndex);
    // Update URL hash for anchor support
    this.updateUrlHash(`step-${stepIndex}`);
  }

  /**
   * Scroll to a specific step by index
   */
  private scrollToStep(stepIndex: number): void {
    const stepElement = document.getElementById(`step-${stepIndex}`);
    if (stepElement) {
      stepElement.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });

      // Update active section for TOC highlighting
      this.ui.activeSectionId = `step-${stepIndex}`;
      this.recipeTOC.currentSectionId = `step-${stepIndex}`;
      this.cdr.markForCheck();
    }
  }

  /**
   * Update URL hash without triggering page reload
   */
  private updateUrlHash(sectionId: string): void {
    if (typeof window !== 'undefined' && window.history) {
      const currentUrl = window.location.pathname + window.location.search;
      const newUrl = `${currentUrl}#${sectionId}`;
      window.history.replaceState(null, '', newUrl);
    }
  }

  /**
   * Handle initial URL hash on page load
   */
  private handleInitialHash(): void {
    if (typeof window === 'undefined') return;

    const hash = window.location.hash.slice(1); // Remove '#' prefix
    if (hash) {
      // Delay to ensure DOM is rendered
      setTimeout(() => {
        const element = document.getElementById(hash);
        if (element) {
          element.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
          });

          // Update active section
          this.ui.activeSectionId = hash;
          this.recipeTOC.currentSectionId = hash;
          this.cdr.markForCheck();
        }
      }, 300);
    }
  }

  /**
   * Listen for hash changes (back/forward navigation)
   */
  @HostListener('window:hashchange', ['$event'])
  onHashChange(): void {
    const hash = window.location.hash.slice(1);
    if (hash) {
      const element = document.getElementById(hash);
      if (element) {
        element.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });

        // Update active section
        this.ui.activeSectionId = hash;
        this.recipeTOC.currentSectionId = hash;
        this.cdr.markForCheck();
      }
    }
  }



  // ==================== Walkthrough Step Navigation ====================

  /**
   * Get all walkthrough steps for current recipe
   */
  get walkthroughSteps(): string[] {
    if (!this.currentRecipe?.walkthrough) return [];

    const steps: string[] = [];
    const walkthrough = this.currentRecipe.walkthrough;

    if (Array.isArray(walkthrough)) {
      // New format - return step names
      return walkthrough.map((step, index) => step.step || `Step ${index + 1}`);
    }

    return steps;
  }

  /**
   * Get walkthrough steps data for template iteration
   */
  get walkthroughStepsData(): any[] {
    if (!this.currentRecipe?.walkthrough || !Array.isArray(this.currentRecipe.walkthrough)) {
      return [];
    }
    return this.currentRecipe.walkthrough;
  }













  /**
   * Check if current recipe has array prerequisites with valid items
   */
  hasArrayPrerequisites(): boolean {
    if (!this.currentRecipe?.prerequisites || !Array.isArray(this.currentRecipe.prerequisites)) {
      return false;
    }
    
    // Check if there's at least one prerequisite with actual content
    return this.currentRecipe.prerequisites.some(prereq => 
      (prereq.description && prereq.description.trim().length > 0) ||
      (prereq.quickLinks && prereq.quickLinks.length > 0 && 
       prereq.quickLinks.some(link => link.title && link.title.trim().length > 0))
    );
  }

  /**
   * Get permission sets for building
   */
  getPermissionSetsForBuilding(): string[] {
    if (!this.currentRecipe) return [];
    
    // New format - extract from prerequisites array
    const buildingPermissions: string[] = [];
    if (Array.isArray(this.currentRecipe.prerequisites)) {
      this.currentRecipe.prerequisites.forEach(prereq => {
        if (prereq.description.toLowerCase().includes('permission') && 
            prereq.description.toLowerCase().includes('building')) {
          // This is a simplified extraction - you might want to improve this logic
          buildingPermissions.push(prereq.description);
        }
      });
    }
    
    return buildingPermissions;
  }

  /**
   * Get permission sets for using
   */
  getPermissionSetsForUsing(): string[] {
    if (!this.currentRecipe) return [];

    // New format - extract from prerequisites array
    const usingPermissions: string[] = [];
    if (Array.isArray(this.currentRecipe.prerequisites)) {
      this.currentRecipe.prerequisites.forEach(prereq => {
        if (prereq.description.toLowerCase().includes('permission') && 
            prereq.description.toLowerCase().includes('using')) {
          // This is a simplified extraction - you might want to improve this logic
          usingPermissions.push(prereq.description);
        }
      });
    }
    
    return usingPermissions;
  }

  /**
   * Check if current recipe has valid overview
   */
  hasValidOverview(): boolean {
    const overview = this.currentRecipe?.overview;
    return !!(overview && overview.trim().length > 0);
  }

  /**
   * Check if current recipe has valid when to use
   */
  hasValidWhenToUse(): boolean {
    const whenToUse = this.currentRecipe?.whenToUse;
    return !!(whenToUse && whenToUse.trim().length > 0);
  }

  /**
   * Check if current recipe has valid downloadable executables
   */
  hasValidDownloadableExecutables(): boolean {
    const executables = this.currentRecipe?.downloadableExecutables;
    return !!(executables && executables.length > 0 && 
              executables.some(exe => 
                (exe.filePath && exe.filePath.trim().length > 0) 
              ));
  }

  /**
   * Get valid downloadable executables (with non-empty title and url or filePath)
   */
  getValidDownloadableExecutables() {
    const executables = this.currentRecipe?.downloadableExecutables || [];
    return executables.filter(exe => 
      // Support new format with filePath
      (exe.filePath && exe.filePath.trim().length > 0)
    ).map(exe => {
      // Transform new format to legacy format for template compatibility
      if (exe.filePath && !exe.title && !exe.url) {
        const fileName = exe.filePath.split('/').pop() || exe.filePath;
        // Remove extension and keep the original filename (including special characters)
        const titleFromFileName = fileName.replace(/\.[^/.]+$/, '');
        
        // Build correct assets path for download
        const correctUrl = this.buildAssetPath(exe.filePath);
        
        return {
          ...exe,
          title: titleFromFileName,
          url: correctUrl,
          // Keep original filename for download attribute
          originalFileName: fileName
        };
      }
      return exe;
    });
  }

  /**
   * Build correct asset path for recipe files
   */
  private buildAssetPath(filePath: string): string {
    if (!this.currentRecipe || !filePath) return filePath;
    
    // If filePath already starts with '/assets/', return as is
    if (filePath.startsWith('/assets/')) {
      return filePath;
    }
    
    // If filePath already starts with 'assets/', make it absolute
    if (filePath.startsWith('assets/')) {
      return `/${filePath}`;
    }
    
    // If filePath is absolute URL, return as is
    if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
      return filePath;
    }
    
    // Build the correct absolute assets path: /assets/recipes/{recipeId}/{filePath}
    // Replace em dash and other dash characters with underscore to match actual folder names
    const normalizedRecipeId = this.currentRecipe.id.replace(/[\u2010-\u2015]/g, '_');
    return `/assets/recipes/${normalizedRecipeId}/${filePath}`;
  }

  /**
   * Handle download link click to bypass Angular routing
   */
  downloadExecutable(url: string, title: string, originalFileName?: string): void {
    if (!url) {
      console.error('Download URL is empty');
      return;
    }
    
    // Replace em dash and other dash characters with underscore in the URL to match actual folder names
    const normalizedUrl = url.replace(/[\u2010-\u2015]/g, '_');

    // Create a temporary anchor element to force download
    const link = document.createElement('a');
    link.href = normalizedUrl;
    // Use original filename if available, otherwise use title
    link.download = originalFileName || title || 'download';
    
    // Use direct download approach without opening in new tab
    // This avoids potential routing issues
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Track download event if analytics service is available
    if (this.currentRecipe) {
      this.recipeService.trackRecipeEvent({
        type: 'download',
        recipeId: this.currentRecipe.id,
        recipeTitle: this.currentRecipe.title,
        recipeCategory: this.currentRecipe.category,
        timestamp: new Date()
      });
    }
  }

  /**
   * Check if current recipe has valid related recipes
   */
  hasValidRelatedRecipes(): boolean {
    const related = this.currentRecipe?.relatedRecipes;
    return !!(related && related.length > 0 && 
              related.some(recipe => recipe.title && recipe.title.trim().length > 0 && 
                                    recipe.url && recipe.url.trim().length > 0));
  }

  /**
   * Get valid related recipes (with non-empty title and url)
   */
  getValidRelatedRecipes() {
    const related = this.currentRecipe?.relatedRecipes || [];
    return related.filter(recipe => recipe.title && recipe.title.trim().length > 0 && 
                                   recipe.url && recipe.url.trim().length > 0);
  }

  /**
   * Get valid prerequisites (with non-empty content)
   */
  getValidPrerequisites() {
    const prerequisites = this.currentRecipe?.prerequisites || [];
    if (!Array.isArray(prerequisites)) return [];
    
    return prerequisites.filter(prereq => 
      (prereq.description && prereq.description.trim().length > 0) ||
      (prereq.quickLinks && prereq.quickLinks.length > 0 && 
       prereq.quickLinks.some(link => link.title && link.title.trim().length > 0))
    );
  }

}