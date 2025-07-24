import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { RecipeCategory } from '../../shared/models/recipe.model';

@Component({
  selector: 'app-recipe-category',
  template: `
    <mat-card class="category-card" (click)="onCategoryClick()">
      <mat-card-header>
        <div mat-card-avatar class="category-avatar">
          <mat-icon>{{ getCategoryIcon() }}</mat-icon>
        </div>
        <mat-card-title>{{ category.displayName }}</mat-card-title>
        <mat-card-subtitle>{{ category.count }} recipes</mat-card-subtitle>
      </mat-card-header>
      
      <mat-card-content>
        <p>{{ category.description }}</p>
      </mat-card-content>
      
      <mat-card-actions align="end">
        <button mat-button color="primary">
          View Recipes
          <mat-icon>arrow_forward</mat-icon>
        </button>
      </mat-card-actions>
    </mat-card>
  `,
  styles: [`
    .category-card {
      cursor: pointer;
      transition: transform 0.2s ease;
      height: 100%;
    }
    
    .category-card:hover {
      transform: translateY(-2px);
    }
    
    .category-avatar {
      background: var(--primary-color);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RecipeCategoryComponent {
  @Input() category!: RecipeCategory;
  
  @Output() categorySelect = new EventEmitter<string>();

  onCategoryClick(): void {
    this.categorySelect.emit(this.category.name);
  }

  getCategoryIcon(): string {
    switch (this.category.name) {
      case 'action-button': return 'smart_button';
      case 'batch': return 'layers';
      case 'data-list': return 'list_alt';
      case 'data-loader': return 'upload_file';
      case 'triggers': return 'bolt';
      default: return 'description';
    }
  }
}