import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { SourceRecipeRecord, RecipeItem } from '../../core/models/recipe.model';
import { RecipeLoggerService } from '../../core/services/logger.service';
import { ExportProgress } from '../../core/services/export.service';

/**
 * Recipe Tab Interface
 * Represents a single editor tab with recipe data and state
 */
export interface RecipeTab {
  id: string;
  title: string;
  recipe: SourceRecipeRecord;
  hasChanges: boolean;
  isActive: boolean;
}

/**
 * Editor State Interface
 * Centralized state for the entire recipe editor
 */
export interface EditorState {
  tabs: RecipeTab[];
  activeTabId: string | null;
  isLoading: boolean;
  isSaving: boolean;
  lastSaved: Date | null;
  isImporting: boolean;
  importProgress: ExportProgress | null;
}

/**
 * Recipe Editor State Service
 *
 * Centralized state management for the Recipe Editor.
 * Handles:
 * - Tab management (create, select, close)
 * - Editor state (loading, saving, importing)
 * - Active recipe tracking
 * - Unsaved changes detection
 *
 * Uses RxJS BehaviorSubjects for reactive state updates.
 */
@Injectable({
  providedIn: 'root'
})
export class RecipeEditorStateService {
  private readonly initialState: EditorState = {
    tabs: [],
    activeTabId: null,
    isLoading: false,
    isSaving: false,
    lastSaved: null,
    isImporting: false,
    importProgress: null
  };

  // State subjects
  private stateSubject = new BehaviorSubject<EditorState>(this.initialState);
  private tabsSubject = new BehaviorSubject<RecipeTab[]>([]);
  private activeTabIdSubject = new BehaviorSubject<string | null>(null);
  private currentRecipeSubject = new BehaviorSubject<SourceRecipeRecord | null>(null);

  // Observable streams
  public state$ = this.stateSubject.asObservable();
  public tabs$ = this.tabsSubject.asObservable();
  public activeTabId$ = this.activeTabIdSubject.asObservable();
  public currentRecipe$ = this.currentRecipeSubject.asObservable();

  constructor(private logger: RecipeLoggerService) {
    this.logger.debug('RecipeEditorStateService initialized');
  }

  // ==================== State Getters ====================

  /**
   * Get current editor state
   */
  getState(): EditorState {
    return this.stateSubject.value;
  }

  /**
   * Get all tabs
   */
  getTabs(): RecipeTab[] {
    return this.tabsSubject.value;
  }

  /**
   * Get active tab ID
   */
  getActiveTabId(): string | null {
    return this.activeTabIdSubject.value;
  }

  /**
   * Get currently active tab
   */
  getCurrentTab(): RecipeTab | undefined {
    const tabs = this.getTabs();
    const activeTabId = this.getActiveTabId();
    return tabs.find(t => t.id === activeTabId);
  }

  /**
   * Get current recipe being edited
   */
  getCurrentRecipe(): SourceRecipeRecord | null {
    return this.currentRecipeSubject.value;
  }

  /**
   * Find tab by ID
   */
  getTabById(tabId: string): RecipeTab | undefined {
    return this.getTabs().find(t => t.id === tabId);
  }


  // ==================== State Setters ====================

  /**
   * Update entire state
   */
  setState(newState: Partial<EditorState>): void {
    const currentState = this.getState();
    const updatedState = { ...currentState, ...newState };
    this.stateSubject.next(updatedState);

    // Update individual subjects if changed
    if (newState.tabs !== undefined) {
      this.tabsSubject.next(newState.tabs);
    }
    if (newState.activeTabId !== undefined) {
      this.activeTabIdSubject.next(newState.activeTabId);
    }
  }

  /**
   * Set tabs array
   */
  setTabs(tabs: RecipeTab[]): void {
    const state = this.getState();
    state.tabs = tabs;
    this.stateSubject.next(state);
    this.tabsSubject.next(tabs);
  }

  /**
   * Set active tab ID
   */
  setActiveTabId(tabId: string | null): void {
    const state = this.getState();
    state.activeTabId = tabId;
    this.stateSubject.next(state);
    this.activeTabIdSubject.next(tabId);
  }

  /**
   * Set current recipe
   */
  setCurrentRecipe(recipe: SourceRecipeRecord | null): void {
    this.currentRecipeSubject.next(recipe);
  }

  /**
   * Set loading state
   */
  setLoading(isLoading: boolean): void {
    this.setState({ isLoading });
  }

  /**
   * Set saving state
   */
  setSaving(isSaving: boolean): void {
    this.setState({ isSaving });
  }

  /**
   * Set importing state and progress
   */
  setImporting(isImporting: boolean, progress: ExportProgress | null = null): void {
    this.setState({ isImporting, importProgress: progress });
  }

  /**
   * Update last saved timestamp
   */
  setLastSaved(date: Date): void {
    this.setState({ lastSaved: date });
  }

  // ==================== Tab Management ====================

  /**
   * Add a new tab
   */
  addTab(tab: RecipeTab): void {
    const tabs = this.getTabs();

    // Deactivate all other tabs
    tabs.forEach(t => t.isActive = false);

    // Add new tab
    tabs.push(tab);
    this.setTabs(tabs);
    this.setActiveTabId(tab.id);
    this.setCurrentRecipe(tab.recipe);

    this.logger.debug('Tab added', { tabId: tab.id, title: tab.title });
  }

  /**
   * Remove a tab by ID
   * Returns the index of the removed tab, or -1 if not found
   */
  removeTab(tabId: string): number {
    const tabs = this.getTabs();
    const tabIndex = tabs.findIndex(t => t.id === tabId);

    if (tabIndex === -1) {
      this.logger.warn('Attempted to remove non-existent tab', { tabId });
      return -1;
    }

    const tab = tabs[tabIndex];
    tabs.splice(tabIndex, 1);
    this.setTabs(tabs);

    this.logger.debug('Tab removed', { tabId: tab.id, title: tab.title });

    return tabIndex;
  }

  /**
   * Update a tab
   */
  updateTab(tabId: string, updates: Partial<RecipeTab>): void {
    const tabs = this.getTabs();
    const tab = tabs.find(t => t.id === tabId);

    if (!tab) {
      this.logger.warn('Attempted to update non-existent tab', { tabId });
      return;
    }

    Object.assign(tab, updates);
    this.setTabs([...tabs]); // Create new array to trigger change detection

    // Update current recipe if this is the active tab
    if (tab.isActive && updates.recipe) {
      this.setCurrentRecipe(tab.recipe);
    }
  }

  /**
   * Mark tab as having changes
   */
  markTabAsChanged(tabId: string): void {
    this.updateTab(tabId, { hasChanges: true });
  }

  /**
   * Mark tab as saved (no changes)
   */
  markTabAsSaved(tabId: string): void {
    this.updateTab(tabId, { hasChanges: false });
  }

  /**
   * Switch to a different tab
   */
  selectTab(tabId: string): boolean {
    const tabs = this.getTabs();
    const tab = tabs.find(t => t.id === tabId);

    if (!tab) {
      this.logger.warn('Attempted to select non-existent tab', { tabId });
      return false;
    }

    // Deactivate all tabs
    tabs.forEach(t => t.isActive = false);

    // Activate selected tab
    tab.isActive = true;
    this.setTabs([...tabs]);
    this.setActiveTabId(tabId);
    this.setCurrentRecipe(tab.recipe);

    this.logger.debug('Tab selected', { tabId: tab.id, title: tab.title });

    return true;
  }

  // ==================== Query Methods ====================

  /**
   * Check if any tab has unsaved changes
   */
  hasUnsavedChanges(): boolean {
    return this.getTabs().some(t => t.hasChanges);
  }


  /**
   * Get count of tabs
   */
  getTabCount(): number {
    return this.getTabs().length;
  }

  // ==================== Reset ====================


}
