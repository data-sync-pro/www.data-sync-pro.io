import { Injectable } from '@angular/core';
import { TIMING } from '../../../shared/constants/timing.constants';
import { BaseStateService } from '../../core/services/base-state.service';

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
 * Extends BaseStateService for common state management patterns
 * Provides reactive state management with localStorage persistence for sidebar state
 */
@Injectable({
  providedIn: 'root'
})
export class RecipeUiStateService extends BaseStateService<RecipeUIState> {

  // Initial state
  protected initialState: RecipeUIState = {
    isLoading: false,
    sidebarCollapsed: false,
    mobileSidebarOpen: false,
    isMobile: false,
    currentView: 'home',
    isPreviewMode: false,
    tocHidden: false,
    activeSectionId: 'recipe-overview',
    userHasScrolled: false
  };

  // localStorage configuration - only persist sidebar state
  protected override storageOptions = {
    enabled: true,
    key: 'recipe-ui-state',
    persistFields: ['sidebarCollapsed'] // Only persist sidebar collapse state
  };

  // Resize debounce timer
  private resizeTimer: any;

  constructor() {
    super();
    this.initializeState();
    this.checkMobileView();
    this.setupResizeListener();
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
    return this.getCurrentState().isLoading;
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
    return this.getCurrentState().currentView;
  }

  /**
   * Check if showing home view
   */
  isHomeView(): boolean {
    return this.getCurrentState().currentView === 'home';
  }

  /**
   * Check if showing category view
   */
  isCategoryView(): boolean {
    return this.getCurrentState().currentView === 'category';
  }

  /**
   * Check if showing recipe details view
   */
  isRecipeView(): boolean {
    return this.getCurrentState().currentView === 'recipe';
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
    return this.getCurrentState().isPreviewMode;
  }

  // ==================== Sidebar Management ====================

  /**
   * Toggle sidebar collapsed state
   * Automatically persisted to localStorage via BaseStateService
   */
  toggleSidebar(): void {
    const collapsed = !this.getCurrentState().sidebarCollapsed;
    this.updateState({ sidebarCollapsed: collapsed });
  }

  /**
   * Set sidebar collapsed state
   * Automatically persisted to localStorage via BaseStateService
   */
  setSidebarCollapsed(collapsed: boolean): void {
    this.updateState({ sidebarCollapsed: collapsed });
  }

  /**
   * Get sidebar collapsed state (synchronous)
   */
  isSidebarCollapsed(): boolean {
    return this.getCurrentState().sidebarCollapsed;
  }

  // ==================== Mobile Sidebar Management ====================

  /**
   * Toggle mobile sidebar
   */
  toggleMobileSidebar(): void {
    this.updateState({ mobileSidebarOpen: !this.getCurrentState().mobileSidebarOpen });
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
    return this.getCurrentState().mobileSidebarOpen;
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
   * Uses debounce to prevent excessive calls during resize
   */
  private setupResizeListener(): void {
    if (typeof window === 'undefined') return;

    window.addEventListener('resize', () => {
      // Clear existing timer
      if (this.resizeTimer) {
        clearTimeout(this.resizeTimer);
      }

      // Set new timer with debounce delay
      this.resizeTimer = setTimeout(() => {
        this.checkMobileView();
      }, TIMING.SCROLL_DEBOUNCE);
    });
  }

  /**
   * Get mobile state (synchronous)
   */
  isMobile(): boolean {
    return this.getCurrentState().isMobile;
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
    this.updateState({ tocHidden: !this.getCurrentState().tocHidden });
  }

  /**
   * Get TOC hidden state (synchronous)
   */
  isTocHidden(): boolean {
    return this.getCurrentState().tocHidden;
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
    return this.getCurrentState().activeSectionId;
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
    if (!this.getCurrentState().userHasScrolled) {
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
    return this.getCurrentState().userHasScrolled;
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
      activeSectionId: 'recipe-overview',
      userHasScrolled: false,
      mobileSidebarOpen: false
    });
  }
}
