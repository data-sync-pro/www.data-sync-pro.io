import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { Category, NavigationState } from '../../core/models/recipe.model';
import { UIState } from '../../core/store/store.interface';

@Component({
  selector: 'app-recipe-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'class': 'recipe-sidebar',
    '[class.collapsed]': 'uiState.sidebarCollapsed',
    '[class.mobile-open]': 'uiState.mobileSidebarOpen'
  }
})
export class RecipeSidebarComponent {

  @Input() uiState!: UIState;

  @Input() categories: Category[] = [];

  @Input() navigation!: NavigationState;

  @Input() recipeCount: number = 0;

  @Input() searchQuery: string = '';

  @Output() sidebarToggle = new EventEmitter<void>();

  @Output() mobileSidebarToggle = new EventEmitter<void>();

  @Output() mobileSidebarClose = new EventEmitter<void>();

  @Output() homeClick = new EventEmitter<void>();

  @Output() categoryClick = new EventEmitter<string>();

  @Output() searchClick = new EventEmitter<string>();

  onToggleSidebar(): void {
    this.sidebarToggle.emit();
  }

  onToggleMobileSidebar(): void {
    this.mobileSidebarToggle.emit();
  }

  onCloseMobileSidebar(): void {
    this.mobileSidebarClose.emit();
  }

  onHomeClick(): void {
    this.homeClick.emit();
  }

  onCategoryClick(categoryName: string): void {
    this.categoryClick.emit(categoryName);
  }

  onSearchClick(): void {
    this.searchClick.emit(this.searchQuery);
  }

  trackByCategoryName(_: number, category: Category): string {
    return category.name;
  }
}