import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

/**
 * UI State interface for Recipe pages
 */
export interface RecipeUIState {
  isLoading: boolean;
  sidebarCollapsed: boolean;
  mobileSidebarOpen: boolean;
  isMobile: boolean;
  currentView: 'home' | 'category' | 'recipe';
  isPreviewMode: boolean;
  tocHidden: boolean;
  activeSectionId: string;
  userHasScrolled: boolean;
}

/**
 * Service to manage UI state for Recipe pages
 * Provides reactive state management using BehaviorSubject
 */
@Injectable({
  providedIn: 'root'
})
export class RecipeUiStateService {

  // Initial state
  private readonly initialState: RecipeUIState = {
    isLoading: false,
    sidebarCollapsed: false,
    mobileSidebarOpen: false,
    isMobile: false,
    currentView: 'home',
    isPreviewMode: false,
    tocHidden: false,
    activeSectionId: 'use-case',
    userHasScrolled: false
  };

  // State subject - holds current state
  private state$ = new BehaviorSubject<RecipeUIState>(this.initialState);

  constructor() {
    this.loadSidebarStateFromStorage();
    this.checkMobileView();
    this.setupResizeListener();
  }

  // ==================== State Observables ====================

  /**
   * Get the complete UI state as observable
   */
  getState(): Observable<RecipeUIState> {
    return this.state$.asObservable();
  }

  /**
   * Get current state snapshot (synchronous)
   */
  getCurrentState(): RecipeUIState {
    return this.state$.value;
  }

  // ==================== State Update Methods ====================

  /**
   * Update state with partial updates
   */
  updateState(updates: Partial<RecipeUIState>): void {
    const currentState = this.state$.value;
    const newState = { ...currentState, ...updates };
    this.state$.next(newState);
  }

  /**
   * Reset state to initial values
   */
  resetState(): void {
    this.state$.next({ ...this.initialState });
  }

  // ==================== Loading State ====================

  /**
   * Set loading state
   */
  setLoading(isLoading: boolean): void {
    this.updateState({ isLoading });
  }

  /**
   * Get current loading state (synchronous)
   */
  isLoading(): boolean {
    return this.state$.value.isLoading;
  }

  // ==================== View Management ====================

  /**
   * Set current view type
   */
  setCurrentView(view: 'home' | 'category' | 'recipe'): void {
    this.updateState({ currentView: view });
  }

  /**
   * Get current view (synchronous)
   */
  getCurrentView(): 'home' | 'category' | 'recipe' {
    return this.state$.value.currentView;
  }

  /**
   * Check if showing home view
   */
  isHomeView(): boolean {
    return this.state$.value.currentView === 'home';
  }

  /**
   * Check if showing category view
   */
  isCategoryView(): boolean {
    return this.state$.value.currentView === 'category';
  }

  /**
   * Check if showing recipe details view
   */
  isRecipeView(): boolean {
    return this.state$.value.currentView === 'recipe';
  }

  // ==================== Preview Mode ====================

  /**
   * Set preview mode
   */
  setPreviewMode(isPreviewMode: boolean): void {
    this.updateState({ isPreviewMode });
  }

  /**
   * Get preview mode state (synchronous)
   */
  isPreviewMode(): boolean {
    return this.state$.value.isPreviewMode;
  }

  // ==================== Sidebar Management ====================

  /**
   * Toggle sidebar collapsed state
   */
  toggleSidebar(): void {
    const collapsed = !this.state$.value.sidebarCollapsed;
    this.updateState({ sidebarCollapsed: collapsed });
    this.saveSidebarStateToStorage(collapsed);
  }

  /**
   * Set sidebar collapsed state
   */
  setSidebarCollapsed(collapsed: boolean): void {
    this.updateState({ sidebarCollapsed: collapsed });
    this.saveSidebarStateToStorage(collapsed);
  }

  /**
   * Get sidebar collapsed state (synchronous)
   */
  isSidebarCollapsed(): boolean {
    return this.state$.value.sidebarCollapsed;
  }

  /**
   * Load sidebar state from localStorage
   */
  private loadSidebarStateFromStorage(): void {
    if (typeof localStorage === 'undefined') return;

    const savedState = localStorage.getItem('recipe-sidebar-collapsed');
    if (savedState !== null) {
      this.updateState({ sidebarCollapsed: savedState === 'true' });
    }
  }

  /**
   * Save sidebar state to localStorage
   */
  private saveSidebarStateToStorage(collapsed: boolean): void {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem('recipe-sidebar-collapsed', collapsed.toString());
  }

  // ==================== Mobile Sidebar Management ====================

  /**
   * Toggle mobile sidebar
   */
  toggleMobileSidebar(): void {
    this.updateState({ mobileSidebarOpen: !this.state$.value.mobileSidebarOpen });
  }

  /**
   * Open mobile sidebar
   */
  openMobileSidebar(): void {
    this.updateState({ mobileSidebarOpen: true });
  }

  /**
   * Close mobile sidebar
   */
  closeMobileSidebar(): void {
    this.updateState({ mobileSidebarOpen: false });
  }

  /**
   * Get mobile sidebar state (synchronous)
   */
  isMobileSidebarOpen(): boolean {
    return this.state$.value.mobileSidebarOpen;
  }

  // ==================== Mobile Detection ====================

  /**
   * Check if current device is mobile
   */
  private checkMobileView(): void {
    if (typeof window === 'undefined') return;
    this.updateState({ isMobile: window.innerWidth <= 768 });
  }

  /**
   * Setup window resize listener for mobile detection
   */
  private setupResizeListener(): void {
    if (typeof window === 'undefined') return;

    window.addEventListener('resize', () => {
      this.checkMobileView();
    });
  }

  /**
   * Get mobile state (synchronous)
   */
  isMobile(): boolean {
    return this.state$.value.isMobile;
  }

  // ==================== TOC Management ====================

  /**
   * Set TOC hidden state
   */
  setTocHidden(hidden: boolean): void {
    this.updateState({ tocHidden: hidden });
  }

  /**
   * Toggle TOC visibility
   */
  toggleToc(): void {
    this.updateState({ tocHidden: !this.state$.value.tocHidden });
  }

  /**
   * Get TOC hidden state (synchronous)
   */
  isTocHidden(): boolean {
    return this.state$.value.tocHidden;
  }

  // ==================== Section Management ====================

  /**
   * Set active section ID
   */
  setActiveSectionId(sectionId: string): void {
    this.updateState({ activeSectionId: sectionId });
  }

  /**
   * Get active section ID (synchronous)
   */
  getActiveSectionId(): string {
    return this.state$.value.activeSectionId;
  }

  // ==================== Scroll State Management ====================

  /**
   * Set user has scrolled flag
   */
  setUserHasScrolled(hasScrolled: boolean): void {
    this.updateState({ userHasScrolled: hasScrolled });
  }

  /**
   * Mark that user has scrolled
   */
  markUserScrolled(): void {
    if (!this.state$.value.userHasScrolled) {
      this.updateState({ userHasScrolled: true });
    }
  }

  /**
   * Reset scroll state
   */
  resetScrollState(): void {
    this.updateState({ userHasScrolled: false });
  }

  /**
   * Get user has scrolled state (synchronous)
   */
  hasUserScrolled(): boolean {
    return this.state$.value.userHasScrolled;
  }

  // ==================== Cleanup ====================

  /**
   * Cleanup method - reset state when navigating away
   */
  cleanup(): void {
    // Keep sidebar state and mobile state, but reset view-specific state
    this.updateState({
      isLoading: false,
      currentView: 'home',
      isPreviewMode: false,
      activeSectionId: 'use-case',
      userHasScrolled: false,
      mobileSidebarOpen: false
    });
  }
}
