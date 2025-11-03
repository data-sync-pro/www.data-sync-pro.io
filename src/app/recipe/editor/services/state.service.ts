import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { SourceRecipeRecord, RecipeItem } from '../../core/models/recipe.model';
import { RecipeLoggerService } from '../../core/services/logger.service';
import { ExportProgress } from '../../core/services/export.service';
import { BaseStateService } from '../../core/services/base-state.service';

/**
 * Editor Tab Interface
 * Represents a single editor tab with recipe data and state
 */
export interface EditorTab {
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
  tabs: EditorTab[];
  activeTabId: string | null;
  isLoading: boolean;
  isSaving: boolean;
  lastSaved: Date | null;
  isImporting: boolean;
  importProgress: ExportProgress | null;
}

/**
 * Recipe Editor State Service
 * Extends BaseStateService for common state management patterns
 *
 * Centralized state management for the Recipe Editor.
 * Handles:
 * - Tab management (create, select, close)
 * - Editor state (loading, saving, importing)
 * - Active recipe tracking
 * - Unsaved changes detection
 *
 * Uses multiple BehaviorSubjects for performance optimization:
 * - Main state for complete editor state
 * - Dedicated subjects for frequently accessed properties (tabs, activeTabId, currentRecipe)
 */
@Injectable({
  providedIn: 'root'
})
export class RecipeEditorStateService extends BaseStateService<EditorState> {
  protected initialState: EditorState = {
    tabs: [],
    activeTabId: null,
    isLoading: false,
    isSaving: false,
    lastSaved: null,
    isImporting: false,
    importProgress: null
  };

  // localStorage disabled - state is managed by RecipeStorageService
  protected override storageOptions = {
    enabled: false
  };

  // Additional subjects for performance optimization
  private tabsSubject = new BehaviorSubject<EditorTab[]>([]);
  private activeTabIdSubject = new BehaviorSubject<string | null>(null);
  private currentRecipeSubject = new BehaviorSubject<SourceRecipeRecord | null>(null);

  // Observable streams
  public tabs$ = this.tabsSubject.asObservable();
  public activeTabId$ = this.activeTabIdSubject.asObservable();
  public currentRecipe$ = this.currentRecipeSubject.asObservable();

  constructor(private logger: RecipeLoggerService) {
    super();
    this.initializeState();
    this.logger.debug('RecipeEditorStateService initialized');
  }

  /**
   * Get all tabs
   */
  getTabs(): EditorTab[] {
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
  getCurrentTab(): EditorTab | undefined {
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
  getTabById(tabId: string): EditorTab | undefined {
    return this.getTabs().find(t => t.id === tabId);
  }


  // ==================== State Setters ====================

  /**
   * Update entire state
   * Overrides base class method to sync additional subjects
   */
  override updateState(newState: Partial<EditorState>): void {
    // Call base class implementation
    super.updateState(newState);

    // Sync individual subjects if changed
    if (newState.tabs !== undefined) {
      this.tabsSubject.next(newState.tabs);
    }
    if (newState.activeTabId !== undefined) {
      this.activeTabIdSubject.next(newState.activeTabId);
    }
  }

  /**
   * Update entire state (alias for updateState)
   * @deprecated Use updateState() instead
   */
  setState(newState: Partial<EditorState>): void {
    this.updateState(newState);
  }

  /**
   * Set tabs array
   */
  setTabs(tabs: EditorTab[]): void {
    this.updateState({ tabs });
  }

  /**
   * Set active tab ID
   */
  setActiveTabId(tabId: string | null): void {
    this.updateState({ activeTabId: tabId });
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
  addTab(tab: EditorTab): void {
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
  updateTab(tabId: string, updates: Partial<EditorTab>): void {
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
