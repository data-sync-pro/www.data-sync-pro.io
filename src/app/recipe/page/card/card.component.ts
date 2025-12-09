import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy
} from '@angular/core';
import { Recipe } from '../../core/models/recipe.model';
import { Category } from '../../core/models/recipe.model';


@Component({
  selector: 'app-recipe-card',
  templateUrl: './card.component.html',
  styleUrls: ['./card.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RecipeCardComponent {
  @Input() recipe!: Recipe;
  @Input() categories: Category[] = [];
  
  @Output() recipeSelect = new EventEmitter<Recipe>();

   categoryIcons: { [key: string]: string } = {
    'Batch': 'assets/icons/recipe/batch.svg',
    'Action Button': 'assets/icons/recipe/action-button.svg',
    'Trigger': 'assets/icons/recipe/trigger.svg',
    'Data List': 'assets/icons/recipe/data-list.svg',
    'Data Loader': 'assets/icons/recipe/data-loader.svg',
    'Transformation': 'assets/icons/recipe/transformation.svg'
  };

  /**
   * Handle recipe card click
   */
  onRecipeClick(): void {
    this.recipeSelect.emit(this.recipe);
  }

  getCategoryIcon(categoryName: string): string {
    return this.categoryIcons[categoryName] || '';
  }

  /**
   * Get the icon for the current recipe's category
   */
  get recipeIcon(): string {
    return this.categoryIcons[this.recipe?.category] || '';
  }

  /**
   * Get the display name for the current recipe's category
   */
  get recipeCategoryDisplayName(): string {
    const category = this.categories.find(cat => cat.name === this.recipe?.category);
    return category?.displayName || this.recipe?.category || '';
  }
}