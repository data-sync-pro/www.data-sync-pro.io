import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { RecipeItem } from '../../shared/models/recipe.model';

@Component({
  selector: 'app-recipe-detail',
  template: `
    <div class="recipe-detail">
      <div class="recipe-header">
        <div class="header-content">
          <h1>{{ recipe.title }}</h1>
        </div>
      </div>

      <div class="recipe-content">
        <mat-tab-group>
          <mat-tab label="Overview">
            <div class="tab-content">
              <h3>Use Case</h3>
              <div [innerHTML]="recipe.safeUseCase"></div>
              
              <h3>Prerequisites</h3>
              <div class="prerequisites">
                <h4>Permission Sets for Building:</h4>
                <ul>
                  <li *ngFor="let permission of recipe.prerequisites.permissionSetsForBuilding">
                    {{ permission }}
                  </li>
                </ul>
                
                <h4>Permission Sets for Using:</h4>
                <ul>
                  <li *ngFor="let permission of recipe.prerequisites.permissionSetsForUsing">
                    {{ permission }}
                  </li>
                </ul>
                
                <h4>Setup Instructions:</h4>
                <div [innerHTML]="recipe.prerequisites.safeDirections"></div>
              </div>
            </div>
          </mat-tab>
          
          <mat-tab label="Walkthrough">
            <div class="tab-content">
              <mat-stepper orientation="vertical" #stepper>
                <mat-step label="Create Executable">
                  <app-recipe-step 
                    [stepData]="recipe.walkthrough.createExecutable"
                    stepType="createExecutable"
                    (stepComplete)="onStepComplete(0)">
                  </app-recipe-step>
                </mat-step>
                
                <mat-step label="Retrieve Data">
                  <app-recipe-step 
                    [stepData]="recipe.walkthrough.retrieve"
                    stepType="retrieve"
                    (stepComplete)="onStepComplete(1)">
                  </app-recipe-step>
                </mat-step>
                
                <!-- Add more steps as needed -->
              </mat-stepper>
            </div>
          </mat-tab>
          
          <mat-tab label="Download" *ngIf="recipe.downloadableExecutable">
            <div class="tab-content">
              <app-recipe-download 
                [executable]="recipe.downloadableExecutable">
              </app-recipe-download>
            </div>
          </mat-tab>
        </mat-tab-group>
      </div>
    </div>
  `,
  styles: [`
    .recipe-detail {
      max-width: 1200px;
      margin: 0 auto;
    }
    
    .recipe-header {
      display: flex;
      align-items: flex-start;
      gap: 1rem;
      margin-bottom: 2rem;
    }
    
    .header-content h1 {
      margin: 0 0 0.5rem 0;
      font-size: 2rem;
      font-weight: 600;
    }
    
    .recipe-meta {
      display: flex;
      align-items: center;
      gap: 1rem;
    }
    
    .time-estimate {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      color: var(--text-muted);
    }
    
    .tab-content {
      padding: 1.5rem 0;
    }
    
    .prerequisites h4 {
      margin: 1rem 0 0.5rem 0;
      color: var(--primary-color);
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RecipeDetailComponent {
  @Input() recipe!: RecipeItem;
  
  @Output() stepComplete = new EventEmitter<number>();
  @Output() backToCategory = new EventEmitter<void>();

  goBack(): void {
    this.backToCategory.emit();
  }

  onStepComplete(stepNumber: number): void {
    this.stepComplete.emit(stepNumber);
  }

}