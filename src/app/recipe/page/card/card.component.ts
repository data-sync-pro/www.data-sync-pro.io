import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy
} from '@angular/core';
import { Recipe } from '../../core/models/recipe.model';

@Component({
  selector: 'app-recipe-card',
  templateUrl: './card.component.html',
  styleUrls: ['./card.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RecipeCardComponent {
  @Input() recipe!: Recipe;
  
  @Output() recipeSelect = new EventEmitter<Recipe>();

  /**
   * Handle recipe card click
   */
  onRecipeClick(): void {
    this.recipeSelect.emit(this.recipe);
  }

  /**
   * Handle download button click
   */
  onDownload(event: Event): void {
    event.stopPropagation();
    if (this.recipe.downloadableExecutables && this.recipe.downloadableExecutables.length > 0) {
      // TODO: Implement download logic
   }
  }
}