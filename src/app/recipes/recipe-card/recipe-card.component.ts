import { 
  Component, 
  Input, 
  Output, 
  EventEmitter, 
  ChangeDetectionStrategy 
} from '@angular/core';
import { RecipeItem } from '../../shared/models/recipe.model';

@Component({
  selector: 'app-recipe-card',
  templateUrl: './recipe-card.component.html',
  styleUrls: ['./recipe-card.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RecipeCardComponent {
  @Input() recipe!: RecipeItem;
  
  @Output() recipeSelect = new EventEmitter<RecipeItem>();

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
    if (this.recipe.downloadableExecutable) {
      // TODO: Implement download logic
      console.log('Downloading executable for:', this.recipe.title);
    }
  }
}