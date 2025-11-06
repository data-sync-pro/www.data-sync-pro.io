import {
  Component,
  OnInit,
  OnDestroy,
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  ViewEncapsulation,
  HostListener
} from '@angular/core';
import { Subject, combineLatest } from 'rxjs';
import { takeUntil, distinctUntilChanged } from 'rxjs/operators';
import { ActivatedRoute } from '@angular/router';

import {
  Recipe,
  Category,
  Filter,
  NavigationState,
  Section,
  Tab,
  SearchState
} from '../core/models/recipe.model';
import { CacheService } from '../core/services/cache.service';
import { SearchService as CoreSearchService } from '../core/services/search.service';
import { LoggerService } from '../core/services/logger.service';
import { sortRecipesByCategoryAndTitle } from '../core/utils';
import { TocService } from './services/toc.service';
import { NavigationService } from './services/navigation.service';
import { Store } from '../core/store/recipe.store';
import { UIState } from '../core/store/store.interface';
import { PreviewSyncService } from './services/preview-sync.service';
import { RouteHandlerService } from './services/route-handler.service';
import { SearchStateService } from './services/search.service';
import { RECIPE_CLASSES, RECIPE_MESSAGES} from '../core/constants/recipe.constants';
import { SelectedSuggestion } from './search-overlay/search-overlay.component';

@Component({
  selector: 'app-recipes',
  templateUrl: './page.component.html',
  styleUrls: ['./page.component.scss'],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RecipesComponent implements OnInit, OnDestroy, AfterViewInit {
  private destroy$ = new Subject<void>();
  private needsObserverSetup: boolean = false;

  ui!: UIState;

  search: SearchState = {
    query: '',
    isActive: false,
    results: [],
    hasResults: true,
    isOverlayOpen: false
  };

  searchOverlayInitialQuery = '';

  navigation: NavigationState = {
    category: '',
    recipeName: ''
  };

  recipes: Recipe[] = [];
  categories: Category[] = [];
  currentRecipe: Recipe | null = null;
  filteredRecipes: Recipe[] = [];
  totalRecipeCount: number = 0;

  recipeTabs: Tab[] = [];

  currentFilter: Filter = {
    categories: []
  };

  constructor(
    private route: ActivatedRoute,
    private cacheService: CacheService,
    private coreSearchService: CoreSearchService,
    private cdr: ChangeDetectorRef,
    public recipeTocService: TocService,
    public recipeNavigationService: NavigationService,
    private store: Store,
    private previewSyncService: PreviewSyncService,
    private routeHandlerService: RouteHandlerService,
    private searchService: SearchStateService,
    private logger: LoggerService
  ) {}

  ngOnInit(): void {

    this.store.ui$
      .pipe(takeUntil(this.destroy$))
      .subscribe(state => {
        this.ui = state;
        this.cdr.markForCheck();
      });

    combineLatest([
      this.route.paramMap,
      this.route.queryParamMap
    ]).pipe(
      takeUntil(this.destroy$)
    ).subscribe(([params, queryParams]) => {

      const category = params.get('category') || '';
      const recipeName = params.get('recipeName') || '';

      this.navigation = {
        category,
        recipeName
      };

      this.routeHandlerService.handleRouteParams(params, queryParams);

      this.cdr.markForCheck();
    });

    this.routeHandlerService.getDataLoadedEvents()
      .pipe(takeUntil(this.destroy$))
      .subscribe(result => {
        this.currentRecipe = result.currentRecipe;
        this.recipeTabs = result.recipeTabs;

        this.recipes = result.recipes;
        this.filteredRecipes = result.filteredRecipes;
        this.needsObserverSetup = result.needsObserverSetup;
        this.totalRecipeCount = result.totalRecipeCount;
        this.cdr.markForCheck();
      });

    this.loadInitialData();

    this.recipeNavigationService.setupOptimizedScrollListener();
    this.recipeNavigationService.setupSectionObserver();

    this.recipeNavigationService.getNavigationEvents()
      .pipe(takeUntil(this.destroy$))
      .subscribe(event => {
        this.cdr.markForCheck();
      });

    this.searchService.getSearchState()
      .pipe(takeUntil(this.destroy$))
      .subscribe(state => {
        this.search = state;
        this.cdr.markForCheck();
      });

    this.searchService.getSearchResultEvents()
      .pipe(takeUntil(this.destroy$))
      .subscribe(event => {
        const sortedResults = sortRecipesByCategoryAndTitle(event.results);
        this.filteredRecipes = sortedResults;
        this.cdr.markForCheck();
      });

    this.searchService.getSearchOverlayInitialQuery()
      .pipe(
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(query => {
        this.searchOverlayInitialQuery = query;
        this.cdr.markForCheck();
      });

    this.previewSyncService.getUpdateEvents()
      .pipe(takeUntil(this.destroy$))
      .subscribe(event => {
        if (event.type === 'content-updated') {
          this.handlePreviewUpdate(event.recipe);
        }
      });

    document.body.classList.add(RECIPE_CLASSES.BODY_PAGE);
  }

  @HostListener('document:keydown./', ['$event'])
  onSlashKey(event: KeyboardEvent) {
    if (!this.search.isOverlayOpen && !this.searchService.isInputFocused()) {
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

  @HostListener('window:hashchange', ['$event'])
  onHashChange(): void {
    this.recipeNavigationService.handleInitialHash();
  }

  ngAfterViewInit(): void {
    if (this.needsObserverSetup && this.showRecipeDetails) {
      this.needsObserverSetup = false;
      requestAnimationFrame(() => {
        this.observeAllSections();
        this.recipeNavigationService.handleInitialHash();
      });
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();

    this.recipeNavigationService.cleanup();

    this.previewSyncService.cleanup();

    document.body.classList.remove(RECIPE_CLASSES.BODY_PAGE);
  }

  private loadInitialData(): void {

    this.cacheService.getRecipes$().pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (recipes) => {
        this.categories = this.coreSearchService.generateCategories(recipes);
        this.cdr.markForCheck();
      },
      error: (error) => {
        this.logger.error(RECIPE_MESSAGES.ERROR_LOAD_CATEGORIES, error);
      }
    });

  }

  private handlePreviewUpdate(recipe: Recipe): void {
    if (!this.currentRecipe) return;

    this.currentRecipe = recipe;

    this.recipeTocService.setCurrentRecipe(this.currentRecipe);
    this.recipeTabs = this.recipeTocService.generateRecipeTabs();

    this.needsObserverSetup = true;

    this.cdr.markForCheck();
  }

  goHome(): void {
    this.routeHandlerService.goHome();
  }

  goToCategory(categoryName: string): void {
    this.routeHandlerService.goToCategory(categoryName, true);
  }

  goToRecipe(recipe: Recipe): void {
    const currentId = this.currentRecipe?.id;
    const currentCategory = this.currentRecipe?.category;
    this.routeHandlerService.goToRecipe(recipe, currentId, currentCategory);
  }

  searchRecipes(query: string): void {
    this.searchService.searchRecipes(query, this.currentFilter, this.recipes);
  }

  clearSearch(): void {
    this.searchService.clearSearch(this.recipes);
  }

  openSearchOverlay(initialQuery = ''): void {
    this.searchService.openSearchOverlay(initialQuery);
  }

  closeSearchOverlay(): void {
    this.searchService.closeSearchOverlay();
  }

  handleSearchOverlaySelect(selectedRecipe: SelectedSuggestion): void {
    this.searchService.handleSearchOverlaySelect(selectedRecipe);
  }

  toggleSidebar(): void {
    this.store.toggleSidebar();
  }

  toggleMobileSidebar(): void {
    this.store.toggleMobileSidebar();
  }

  closeMobileSidebar(): void {
    this.store.closeMobileSidebar();
  }

  getVisibleOverviewSections() {
    return this.recipeTocService.getVisibleOverviewSections();
  }

  getAllSectionsForRendering(): any[] {
    return this.recipeTocService.getAllSectionsForRendering();
  }

  private observeAllSections(): void {
    const overviewElementIds = this.recipeTocService.getOverviewSectionsForTOC()
      .map((section: Section) => section.elementId || '')
      .filter((id: string) => id.length > 0);

    const walkthroughStepCount = this.walkthroughStepsData.length;

    this.recipeNavigationService.observeAllSections(overviewElementIds, walkthroughStepCount);
  }

  downloadExecutable(url: string, title: string, originalFileName?: string): void {
    if (!url) {
      this.logger.error('Download URL is empty');
      return;
    }

    const normalizedUrl = url.replace(/[\u2010-\u2015]/g, '_');

    const link = document.createElement('a');
    link.href = normalizedUrl;
    link.download = originalFileName || title || 'download';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    if (this.currentRecipe) {
      this.logger.debug('Recipe download tracked', {
        type: 'download',
        recipeId: this.currentRecipe.id,
        recipeTitle: this.currentRecipe.title,
        recipeCategory: this.currentRecipe.category,
        timestamp: new Date()
      });
    }
  }

  getRecipeCount(): number {
    return this.totalRecipeCount;
  }

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

  get currentRecipes(): Recipe[] {
    return this.search.isActive ? this.search.results : this.filteredRecipes;
  }

  get showHome(): boolean {
    return this.ui.currentView === 'home' && !this.search.isActive;
  }

  get showCategory(): boolean {
    return this.ui.currentView === 'category' && !this.search.isActive;
  }

  get showRecipeDetails(): boolean {
    return this.ui.currentView === 'recipe' && !!this.currentRecipe;
  }

  get currentCategory(): Category | null {
    return this.categories.find(cat => cat.name === this.navigation.category) || null;
  }

  get walkthroughSteps(): string[] {
    if (!this.currentRecipe?.walkthrough) return [];

    const walkthrough = this.currentRecipe.walkthrough;

    if (Array.isArray(walkthrough)) {
      return walkthrough.map((step, index) => step.step || `Step ${index + 1}`);
    }

    return [];
  }

  get walkthroughStepsData(): any[] {
    if (!this.currentRecipe?.walkthrough || !Array.isArray(this.currentRecipe.walkthrough)) {
      return [];
    }
    return this.currentRecipe.walkthrough;
  }

  trackByRecipeId(_: number, recipe: Recipe): string {
    return recipe.id;
  }

  trackByCategoryName(_: number, category: Category): string {
    return category.name;
  }

  trackBySectionId(index: number, section: any): string {
    return section.id || section.elementId || index.toString();
  }

  trackByStepIndex(index: number): number {
    return index;
  }

  trackByBreadcrumbUrl(_: number, crumb: {name: string; url: string}): string {
    return crumb.url;
  }

}
