import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { RecipeCategory, RecipeNavigationState } from '../../shared/models/recipe.model';
import { RecipeUIState } from '../services/recipe-ui-state.service';

/**
 * Recipe Sidebar Component
 * Displays navigation sidebar with categories and search
 */
@Component({
  selector: 'app-recipe-sidebar',
  templateUrl: './recipe-sidebar.component.html',
  styleUrls: ['./recipe-sidebar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'class': 'recipe-sidebar',
    '[class.collapsed]': 'uiState.sidebarCollapsed',
    '[class.mobile-open]': 'uiState.mobileSidebarOpen'
  }
})
export class RecipeSidebarComponent {

  // ==================== Inputs ====================

  /**
   * UI state from parent
   */
  @Input() uiState!: RecipeUIState;

  /**
   * List of recipe categories
   */
  @Input() categories: RecipeCategory[] = [];

  /**
   * Current navigation state
   */
  @Input() navigation!: RecipeNavigationState;

  /**
   * Total recipe count
   */
  @Input() recipeCount: number = 0;

  /**
   * Current search query
   */
  @Input() searchQuery: string = '';

  // ==================== Outputs ====================

  /**
   * Emitted when user wants to toggle desktop sidebar
   */
  @Output() sidebarToggle = new EventEmitter<void>();

  /**
   * Emitted when user wants to toggle mobile sidebar
   */
  @Output() mobileSidebarToggle = new EventEmitter<void>();

  /**
   * Emitted when user wants to close mobile sidebar
   */
  @Output() mobileSidebarClose = new EventEmitter<void>();

  /**
   * Emitted when user clicks "Home" / "All Recipes"
   */
  @Output() homeClick = new EventEmitter<void>();

  /**
   * Emitted when user clicks a category
   */
  @Output() categoryClick = new EventEmitter<string>();

  /**
   * Emitted when user wants to open search overlay
   */
  @Output() searchClick = new EventEmitter<string>();

  // ==================== Event Handlers ====================

  /**
   * Handle sidebar toggle button click
   */
  onToggleSidebar(): void {
    this.sidebarToggle.emit();
  }

  /**
   * Handle mobile sidebar toggle click
   */
  onToggleMobileSidebar(): void {
    this.mobileSidebarToggle.emit();
  }

  /**
   * Handle mobile overlay click
   */
  onCloseMobileSidebar(): void {
    this.mobileSidebarClose.emit();
  }

  /**
   * Handle home navigation click
   */
  onHomeClick(): void {
    this.homeClick.emit();
  }

  /**
   * Handle category click
   */
  onCategoryClick(categoryName: string): void {
    this.categoryClick.emit(categoryName);
  }

  /**
   * Handle search button click
   */
  onSearchClick(): void {
    this.searchClick.emit(this.searchQuery);
  }

  // ==================== TrackBy Functions ====================

  /**
   * TrackBy function for categories
   */
  trackByCategoryName(_: number, category: RecipeCategory): string {
    return category.name;
  }
}
