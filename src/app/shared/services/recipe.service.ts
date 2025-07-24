import { Injectable, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, of, throwError } from 'rxjs';
import { map, catchError, shareReplay, tap, finalize } from 'rxjs/operators';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

import {
  SourceRecipeRecord,
  RecipeItem,
  RecipeCategory,
  RecipeSearchResult,
  RecipeFilter,
  RecipeSortOptions,
  RecipeStats,
  RecipeProgress,
  RecipeEvent,
  RecipeContentStatus,
  RecipeCategoryType
} from '../models/recipe.model';

@Injectable({
  providedIn: 'root'
})
export class RecipeService implements OnDestroy {
  private readonly RECIPE_DATA_URL = 'assets/data/recipes.json';
  private readonly RECIPE_CONTENT_BASE = 'assets/recipe-content/';
  
  // Cache
  private recipesCache$ = new BehaviorSubject<RecipeItem[]>([]);
  private contentCache = new Map<string, SafeHtml>();
  private categoriesCache: RecipeCategory[] = [];
  
  // Local Storage Cache Keys
  private readonly STORAGE_KEY_RECIPE_CONTENT = 'recipe_content_cache';
  private readonly STORAGE_KEY_RECIPE_PROGRESS = 'recipe_progress_cache';
  private readonly STORAGE_KEY_POPULAR_RECIPES = 'popular_recipes_cache';
  private readonly CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
  
  // Loading state
  private isLoading = false;
  private isInitialized = false;
  
  // Preloading
  private preloadingQueue = new Set<string>();
  private intersectionObserver?: IntersectionObserver;
  private readonly PRELOAD_THRESHOLD = 0.1;
  
  // Categories mapping
  private readonly CATEGORY_DISPLAY_NAMES: { [key in RecipeCategoryType]: string } = {
    'action-button': 'Action Button',
    'batch': 'Batch Processing',
    'data-list': 'Data List',
    'data-loader': 'Data Loader',
    'triggers': 'Triggers'
  };
  
  private readonly CATEGORY_DESCRIPTIONS: { [key in RecipeCategoryType]: string } = {
    'action-button': 'Create custom action buttons that execute data processing workflows',
    'batch': 'Process large volumes of data efficiently with batch operations',
    'data-list': 'Build actionable data lists with interactive capabilities',
    'data-loader': 'Load data from external files like CSV into Salesforce',
    'triggers': 'Set up event-driven data processing based on record changes'
  };

  constructor(
    private http: HttpClient,
    private sanitizer: DomSanitizer
  ) {
    this.initializeService();
    this.initializeIntersectionObserver();
    this.loadFromLocalStorage();
  }

  ngOnDestroy(): void {
    if (this.intersectionObserver) {
      this.intersectionObserver.disconnect();
    }
  }

  /**
   * Initialize service
   */
  private initializeService(): void {
    if (!this.isInitialized) {
      this.loadRecipes();
      this.isInitialized = true;
    }
  }

  /**
   * Load recipes from JSON file
   */
  private loadRecipes(): void {
    if (this.isLoading) {
      return;
    }

    this.isLoading = true;

    this.http.get<SourceRecipeRecord[]>(this.RECIPE_DATA_URL).pipe(
      map(records => this.transformRecipeRecords(records)),
      tap(recipes => this.updateCategoriesCache(recipes)),
      shareReplay(1),
      finalize(() => this.isLoading = false)
    ).subscribe({
      next: (recipes) => {
        this.recipesCache$.next(recipes);
        this.saveToLocalStorage(recipes);
      },
      error: (error) => {
        console.error('Failed to load recipes:', error);
        this.recipesCache$.next([]);
      }
    });
  }

  /**
   * Transform source recipe records to application format
   */
  private transformRecipeRecords(records: SourceRecipeRecord[]): RecipeItem[] {
    return records.map(record => ({
      id: record.id,
      name: record.name,
      title: record.title,
      category: record.category,
      description: record.description,
      useCase: record.useCase,
      safeUseCase: this.sanitizer.bypassSecurityTrustHtml(record.useCase),
      prerequisites: {
        ...record.prerequisites,
        safeDirections: this.sanitizer.bypassSecurityTrustHtml(record.prerequisites.directions)
      },
      walkthrough: record.walkthrough,
      downloadableExecutable: record.downloadableExecutable,
      tags: record.tags,
      lastUpdated: new Date(record.lastUpdated),
      author: record.author,
      seqNo: record.seqNo,
      isExpanded: false,
      isLoading: false,
      viewCount: 0,
      currentStep: 0,
      completedSteps: [],
      showSocialShare: false
    }));
  }

  /**
   * Update categories cache
   */
  private updateCategoriesCache(recipes: RecipeItem[]): void {
    const categoryMap = new Map<string, number>();
    
    recipes.forEach(recipe => {
      const count = categoryMap.get(recipe.category) || 0;
      categoryMap.set(recipe.category, count + 1);
    });

    this.categoriesCache = Array.from(categoryMap.entries()).map(([category, count]) => ({
      name: category,
      displayName: this.CATEGORY_DISPLAY_NAMES[category as RecipeCategoryType] || category,
      description: this.CATEGORY_DESCRIPTIONS[category as RecipeCategoryType] || '',
      count
    }));
  }

  /**
   * Get all recipes
   */
  getRecipes(): Observable<RecipeItem[]> {
    return this.recipesCache$.asObservable();
  }

  /**
   * Get recipes by category
   */
  getRecipesByCategory(category: string): Observable<RecipeItem[]> {
    return this.recipesCache$.pipe(
      map(recipes => recipes.filter(recipe => recipe.category === category))
    );
  }

  /**
   * Get single recipe by name and category
   */
  getRecipe(category: string, recipeName: string): Observable<RecipeItem | null> {
    return this.recipesCache$.pipe(
      map(recipes => recipes.find(recipe => 
        recipe.category === category && recipe.name === recipeName
      ) || null)
    );
  }

  /**
   * Get recipe categories
   */
  getCategories(): Observable<RecipeCategory[]> {
    if (this.categoriesCache.length > 0) {
      return of(this.categoriesCache);
    }
    
    return this.recipesCache$.pipe(
      map(() => this.categoriesCache)
    );
  }

  /**
   * Search recipes
   */
  searchRecipes(query: string, filter?: RecipeFilter): Observable<RecipeSearchResult[]> {
    return this.recipesCache$.pipe(
      map(recipes => {
        let filteredRecipes = recipes;

        // Apply category filter
        if (filter?.categories.length) {
          filteredRecipes = filteredRecipes.filter(recipe => 
            filter.categories.includes(recipe.category)
          );
        }


        // Apply search query
        if (query.trim()) {
          const searchResults = this.performSmartSearch(filteredRecipes, query);
          return searchResults;
        }

        // Convert to search results format
        return filteredRecipes.map(recipe => ({
          ...recipe,
          relevanceScore: 0
        }));
      })
    );
  }

  /**
   * Perform smart search with relevance scoring
   */
  private performSmartSearch(recipes: RecipeItem[], query: string): RecipeSearchResult[] {
    const lowerQuery = query.toLowerCase();
    const results: RecipeSearchResult[] = [];

    recipes.forEach(recipe => {
      let score = 0;
      const matchedFields: string[] = [];

      // Title match (highest priority)
      if (recipe.title.toLowerCase().includes(lowerQuery)) {
        score += 100;
        matchedFields.push('title');
      }

      // Description match
      if (recipe.description.toLowerCase().includes(lowerQuery)) {
        score += 50;
        matchedFields.push('description');
      }

      // Tags match
      if (recipe.tags.some(tag => tag.toLowerCase().includes(lowerQuery))) {
        score += 30;
        matchedFields.push('tags');
      }

      // Category match
      if (recipe.category.toLowerCase().includes(lowerQuery)) {
        score += 20;
        matchedFields.push('category');
      }

      // Use case match
      if (recipe.useCase.toLowerCase().includes(lowerQuery)) {
        score += 15;
        matchedFields.push('useCase');
      }

      if (score > 0) {
        results.push({
          ...recipe,
          relevanceScore: score,
          matchedFields,
          highlightedTitle: this.highlightKeywords(recipe.title, [query]),
          highlightedDescription: this.highlightKeywords(recipe.description, [query])
        });
      }
    });

    return results.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));
  }

  /**
   * Highlight keywords in text
   */
  private highlightKeywords(text: string, keywords: string[]): string {
    if (!keywords.length || !text) return text;

    return keywords.reduce((highlighted, keyword) => {
      if (!keyword.trim()) return highlighted;
      const regex = new RegExp(`(${this.escapeRegExp(keyword)})`, 'gi');
      return highlighted.replace(regex, '<mark class="search-highlight">$1</mark>');
    }, text);
  }

  /**
   * Escape special regex characters
   */
  private escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Track recipe progress
   */
  saveRecipeProgress(progress: RecipeProgress): void {
    const existingProgress = this.getRecipeProgress();
    existingProgress[progress.recipeId] = progress;
    
    localStorage.setItem(
      this.STORAGE_KEY_RECIPE_PROGRESS, 
      JSON.stringify(existingProgress)
    );
  }

  /**
   * Get recipe progress
   */
  getRecipeProgress(): { [recipeId: string]: RecipeProgress } {
    const stored = localStorage.getItem(this.STORAGE_KEY_RECIPE_PROGRESS);
    return stored ? JSON.parse(stored) : {};
  }

  /**
   * Track recipe events
   */
  trackRecipeEvent(event: RecipeEvent): void {
    // Implementation for analytics tracking
    console.log('Recipe event tracked:', event);
  }

  /**
   * Initialize intersection observer for preloading
   */
  private initializeIntersectionObserver(): void {
    if (typeof window === 'undefined' || typeof IntersectionObserver === 'undefined') {
      return;
    }

    this.intersectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const recipeId = entry.target.getAttribute('data-recipe-id');
            if (recipeId && !this.preloadingQueue.has(recipeId)) {
              this.preloadRecipeContent(recipeId);
            }
          }
        });
      },
      { threshold: this.PRELOAD_THRESHOLD }
    );
  }

  /**
   * Preload recipe content
   */
  private preloadRecipeContent(recipeId: string): void {
    this.preloadingQueue.add(recipeId);
    // Implementation for preloading recipe content
  }

  /**
   * Save to local storage
   */
  private saveToLocalStorage(recipes: RecipeItem[]): void {
    try {
      const cacheData = {
        recipes,
        timestamp: Date.now(),
        version: '1.0'
      };
      localStorage.setItem(this.STORAGE_KEY_RECIPE_CONTENT, JSON.stringify(cacheData));
    } catch (error) {
      console.warn('Failed to save recipes to local storage:', error);
    }
  }

  /**
   * Load from local storage
   */
  private loadFromLocalStorage(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY_RECIPE_CONTENT);
      if (stored) {
        const cacheData = JSON.parse(stored);
        const isExpired = Date.now() - cacheData.timestamp > this.CACHE_TTL;
        
        if (!isExpired && cacheData.recipes) {
          this.recipesCache$.next(cacheData.recipes);
          this.updateCategoriesCache(cacheData.recipes);
        }
      }
    } catch (error) {
      console.warn('Failed to load recipes from local storage:', error);
    }
  }

  /**
   * Get recipe statistics
   */
  getRecipeStats(): Observable<RecipeStats> {
    return this.recipesCache$.pipe(
      map(recipes => {
        const categoryStats = new Map<string, number>();
        
        recipes.forEach(recipe => {
          const count = categoryStats.get(recipe.category) || 0;
          categoryStats.set(recipe.category, count + 1);
        });

        return {
          totalRecipes: recipes.length,
          totalCategories: this.categoriesCache.length,
          mostViewedRecipes: recipes
            .sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0))
            .slice(0, 5),
          recentlyUpdated: recipes
            .sort((a, b) => b.lastUpdated.getTime() - a.lastUpdated.getTime())
            .slice(0, 5),
          avgCompletionTime: 0, // Removed estimatedTime calculation
          popularCategories: Array.from(categoryStats.entries())
            .map(([category, count]) => ({ category, count }))
            .sort((a, b) => b.count - a.count)
        };
      })
    );
  }
}