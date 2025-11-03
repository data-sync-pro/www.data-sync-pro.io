import { Injectable, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { RecipeItem, RecipeFilter, RecipeSearchState } from '../../core/models/recipe.model';
import { RecipeService } from '../../core/services/recipe.service';
import { RecipeLoggerService } from '../../core/services/logger.service';
import { SelectedSuggestion } from '../search-overlay/search-overlay.component';
import { BaseStateService } from '../../core/services/base-state.service';

/**
 * Search result event emitted when search results are updated
 */
export interface SearchResultEvent {
  query: string;
  results: RecipeItem[];
  hasResults: boolean;
}

/**
 * Service responsible for managing recipe search functionality
 * Extends BaseStateService for common state management patterns
 *
 * This service handles:
 * - Search state management
 * - Search execution (delegates to RecipeService)
 * - Search overlay visibility
 * - Search result navigation
 */
@Injectable({
  providedIn: 'root'
})
export class RecipeSearchService extends BaseStateService<RecipeSearchState> implements OnDestroy {

  private destroy$ = new Subject<void>();

  // Initial search state
  protected initialState: RecipeSearchState = {
    query: '',
    isActive: false,
    results: [],
    hasResults: true,
    isOverlayOpen: false
  };

  // localStorage disabled for search (temporary state)
  protected override storageOptions = {
    enabled: false
  };

  // Search overlay initial query
  private searchOverlayInitialQuery$ = new BehaviorSubject<string>('');

  // Search result events (Subject for one-time events, not persistent state)
  private searchResult$ = new Subject<SearchResultEvent>();

  constructor(
    private recipeService: RecipeService,
    private router: Router,
    private logger: RecipeLoggerService
  ) {
    super();
    this.initializeState();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Get search state as observable
   * @deprecated Use getState() from BaseStateService instead
   */
  getSearchState(): Observable<RecipeSearchState> {
    return this.getState();
  }

  /**
   * Get current search state value
   * @deprecated Use getCurrentState() from BaseStateService instead
   */
  getCurrentSearchState(): RecipeSearchState {
    return this.getCurrentState();
  }

  /**
   * Get search overlay initial query
   */
  getSearchOverlayInitialQuery(): Observable<string> {
    return this.searchOverlayInitialQuery$.asObservable();
  }

  /**
   * Get search result events
   */
  getSearchResultEvents(): Observable<SearchResultEvent> {
    return this.searchResult$.asObservable();
  }

  /**
   * Search recipes
   */
  searchRecipes(query: string, currentFilter: RecipeFilter, allRecipes: RecipeItem[]): void {
    if (query.trim().length > 0) {
      this.recipeService.searchRecipes(query, currentFilter).pipe(
        takeUntil(this.destroy$)
      ).subscribe({
        next: (results) => {
          // Update search state
          this.updateState({
            query: query,
            isActive: true,
            results: results,
            hasResults: results.length > 0
          });

          // Emit search result event
          this.searchResult$.next({
            query: query,
            results: results,
            hasResults: results.length > 0
          });
        },
        error: (error) => {
          this.logger.error('Search failed', error);

          // Update state with error
          this.updateState({
            query: query,
            isActive: true,
            results: [],
            hasResults: false
          });
        }
      });
    } else {
      // Clear search
      this.updateState({
        query: '',
        isActive: false,
        results: [],
        hasResults: true
      });

      // Emit search result event with all recipes
      this.searchResult$.next({
        query: '',
        results: allRecipes,
        hasResults: true
      });
    }
  }

  /**
   * Clear search
   */
  clearSearch(allRecipes: RecipeItem[]): void {
    this.updateState({
      query: '',
      isActive: false,
      results: [],
      hasResults: true
    });

    // Emit search result event with all recipes
    this.searchResult$.next({
      query: '',
      results: allRecipes,
      hasResults: true
    });
  }

  /**
   * Open search overlay
   */
  openSearchOverlay(initialQuery = ''): void {
    this.searchOverlayInitialQuery$.next(initialQuery);
    this.updateState({ isOverlayOpen: true });

    // Prevent body scrolling when overlay is open
    document.body.style.overflow = 'hidden';
  }

  /**
   * Close search overlay
   */
  closeSearchOverlay(): void {
    this.updateState({ isOverlayOpen: false });

    // Restore body scrolling
    document.body.style.overflow = '';
  }

  /**
   * Handle search overlay selection
   */
  handleSearchOverlaySelect(selectedRecipe: SelectedSuggestion): void {
    // Navigate to the selected recipe using slug
    this.router.navigate(['/recipes', selectedRecipe.category, selectedRecipe.slug]);

    // Close overlay
    this.closeSearchOverlay();
  }

  /**
   * Check if an input element is currently focused
   */
  isInputFocused(): boolean {
    const activeElement = document.activeElement;
    return !!(activeElement instanceof HTMLInputElement ||
           activeElement instanceof HTMLTextAreaElement ||
           (activeElement && activeElement.tagName === 'INPUT') ||
           (activeElement && activeElement.tagName === 'TEXTAREA'));
  }

  /**
   * Get whether search overlay is open
   */
  isSearchOverlayOpen(): boolean {
    return this.getCurrentState().isOverlayOpen;
  }

  /**
   * Get current search query
   */
  getCurrentQuery(): string {
    return this.getCurrentState().query;
  }

  /**
   * Check if search is active
   */
  isSearchActive(): boolean {
    return this.getCurrentState().isActive;
  }
}
