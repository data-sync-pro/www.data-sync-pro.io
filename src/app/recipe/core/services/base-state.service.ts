import { BehaviorSubject, Observable } from 'rxjs';

/**
 * Options for localStorage integration in state services
 */
export interface StateStorageOptions {
  /** Enable localStorage persistence */
  enabled: boolean;
  /** Storage key for localStorage */
  key?: string;
  /** Fields to persist (if not specified, all fields are persisted) */
  persistFields?: string[];
  /** Fields to exclude from persistence */
  excludeFields?: string[];
}

/**
 * Abstract base class for state management services
 * Provides common patterns for managing application state with RxJS BehaviorSubject
 *
 * Features:
 * - Type-safe state management
 * - Partial state updates
 * - Observable state stream
 * - Optional localStorage persistence
 * - State reset capability
 *
 * @example
 * ```typescript
 * interface MyState {
 *   isLoading: boolean;
 *   data: string[];
 * }
 *
 * @Injectable({ providedIn: 'root' })
 * export class MyStateService extends BaseStateService<MyState> {
 *   protected initialState: MyState = {
 *     isLoading: false,
 *     data: []
 *   };
 *
 *   protected storageOptions: StateStorageOptions = {
 *     enabled: true,
 *     key: 'my-state',
 *     excludeFields: ['isLoading'] // Don't persist loading state
 *   };
 * }
 * ```
 */
export abstract class BaseStateService<T extends Record<string, any>> {
  /**
   * Initial state - must be defined by subclasses
   */
  protected abstract initialState: T;

  /**
   * Optional localStorage configuration
   * Override in subclass to enable persistence
   */
  protected storageOptions: StateStorageOptions = {
    enabled: false
  };

  /**
   * Internal BehaviorSubject holding the current state
   * Note: Initialized by initializeState() which must be called from subclass constructor
   */
  protected state$!: BehaviorSubject<T>;

  /**
   * Initialize the state service
   * Must be called from subclass constructor after initialState is set
   *
   * @protected
   */
  protected initializeState(): void {
    this.state$ = new BehaviorSubject<T>(this.initialState);

    if (this.storageOptions.enabled && this.storageOptions.key) {
      this.loadStateFromStorage();
    }
  }

  /**
   * Get the current state synchronously
   * @returns Current state value
   */
  getCurrentState(): T {
    return this.state$.value;
  }

  /**
   * Get the state as an Observable stream
   * @returns Observable of state changes
   */
  getState(): Observable<T> {
    return this.state$.asObservable();
  }

  /**
   * Update the state with partial changes
   * Merges the updates with the current state
   *
   * @param updates - Partial state object with fields to update
   *
   * @example
   * ```typescript
   * this.updateState({ isLoading: true });
   * ```
   */
  updateState(updates: Partial<T>): void {
    const currentState = this.getCurrentState();
    const newState = { ...currentState, ...updates };
    this.state$.next(newState);

    if (this.storageOptions.enabled && this.storageOptions.key) {
      this.saveStateToStorage(newState);
    }
  }

  /**
   * Reset state to initial values
   * Also clears persisted state from localStorage if enabled
   */
  resetState(): void {
    this.state$.next({ ...this.initialState });

    if (this.storageOptions.enabled && this.storageOptions.key) {
      this.clearStorage();
    }
  }

  /**
   * Load state from localStorage
   * Merges persisted fields with initial state
   *
   * @protected
   */
  protected loadStateFromStorage(): void {
    if (typeof localStorage === 'undefined' || !this.storageOptions.key) {
      return;
    }

    try {
      const stored = localStorage.getItem(this.storageOptions.key);
      if (!stored) {
        return;
      }

      const parsedState = JSON.parse(stored) as Partial<T>;
      const filteredState = this.filterStateForStorage(parsedState);

      // Merge with initial state to ensure all fields exist
      const mergedState = { ...this.initialState, ...filteredState };
      this.state$.next(mergedState);
    } catch (error) {
      console.error(`[BaseStateService] Error loading state from localStorage:`, error);
      // If loading fails, continue with initial state
    }
  }

  /**
   * Save state to localStorage
   * Only persists specified fields if configured
   *
   * @protected
   * @param state - State to persist
   */
  protected saveStateToStorage(state: T): void {
    if (typeof localStorage === 'undefined' || !this.storageOptions.key) {
      return;
    }

    try {
      const stateToSave = this.filterStateForStorage(state);
      localStorage.setItem(this.storageOptions.key, JSON.stringify(stateToSave));
    } catch (error) {
      console.error(`[BaseStateService] Error saving state to localStorage:`, error);
    }
  }

  /**
   * Clear persisted state from localStorage
   *
   * @protected
   */
  protected clearStorage(): void {
    if (typeof localStorage === 'undefined' || !this.storageOptions.key) {
      return;
    }

    try {
      localStorage.removeItem(this.storageOptions.key);
    } catch (error) {
      console.error(`[BaseStateService] Error clearing localStorage:`, error);
    }
  }

  /**
   * Filter state fields based on persistence configuration
   * Respects persistFields and excludeFields options
   *
   * @private
   * @param state - State to filter
   * @returns Filtered state object
   */
  private filterStateForStorage(state: Partial<T>): Partial<T> {
    const { persistFields, excludeFields } = this.storageOptions;

    // If persistFields is specified, only include those fields
    if (persistFields && persistFields.length > 0) {
      const filtered: Partial<T> = {};
      persistFields.forEach(field => {
        if (field in state) {
          filtered[field as keyof T] = state[field as keyof T];
        }
      });
      return filtered;
    }

    // If excludeFields is specified, exclude those fields
    if (excludeFields && excludeFields.length > 0) {
      const filtered = { ...state };
      excludeFields.forEach(field => {
        delete filtered[field as keyof T];
      });
      return filtered;
    }

    // Otherwise, persist all fields
    return state;
  }
}
