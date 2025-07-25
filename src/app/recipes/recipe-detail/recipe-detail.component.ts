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
        <!-- Overview Content -->
        <div class="tab-content" *ngIf="activeTab === 'overview'">
          <section id="recipe-use-case" class="recipe-section">
            <h3>Use Case</h3>
            <div [innerHTML]="recipe.safeUseCase"></div>
          </section>
          
          <section id="recipe-building-permissions" class="recipe-section">
            <h4>Permission Sets for Building:</h4>
            <ul>
              <li *ngFor="let permission of recipe.prerequisites.permissionSetsForBuilding">
                {{ permission }}
              </li>
            </ul>
          </section>
          
          <section id="recipe-using-permissions" class="recipe-section">
            <h4>Permission Sets for Using:</h4>
            <ul>
              <li *ngFor="let permission of recipe.prerequisites.permissionSetsForUsing">
                {{ permission }}
              </li>
            </ul>
          </section>
          
          <section id="recipe-setup-instructions" class="recipe-section">
            <h4>Setup Instructions:</h4>
            <div [innerHTML]="recipe.prerequisites.safeDirections"></div>
          </section>
          
          <!-- Download section (moved from download tab) -->
          <section id="recipe-download-executable" class="recipe-section" *ngIf="recipe.downloadableExecutable">
            <h4>Download Executable:</h4>
            <app-recipe-download 
              [executable]="recipe.downloadableExecutable">
            </app-recipe-download>
          </section>
          
          <section id="recipe-installation-guide" class="recipe-section" *ngIf="recipe.downloadableExecutable">
            <h4>Installation Guide</h4>
            <p>Instructions for installing and configuring the downloaded executable.</p>
          </section>
          
          <section id="recipe-version-info" class="recipe-section" *ngIf="recipe.downloadableExecutable">
            <h4>Version Information</h4>
            <p>Version: {{ recipe.downloadableExecutable.version }}</p>
            <p>{{ recipe.downloadableExecutable.description }}</p>
          </section>
        </div>
        
        <!-- Walkthrough Content -->
        <div class="tab-content" *ngIf="activeTab === 'walkthrough'">
          <mat-stepper orientation="vertical" #stepper>
            <mat-step label="Create Executable" id="recipe-create-executable">
              <app-recipe-step 
                [stepData]="recipe.walkthrough.createExecutable"
                stepType="createExecutable"
                (stepComplete)="onStepComplete(0)">
              </app-recipe-step>
            </mat-step>
            
            <mat-step label="Retrieve Data" id="recipe-retrieve-data">
              <app-recipe-step 
                [stepData]="recipe.walkthrough.retrieve"
                stepType="retrieve"
                (stepComplete)="onStepComplete(1)">
              </app-recipe-step>
            </mat-step>
            
            <!-- Additional walkthrough steps would be added here with proper IDs -->
            <!-- e.g., recipe-scoping, recipe-match, recipe-mapping, etc. -->
            
          </mat-stepper>
        </div>
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
    
    .recipe-section {
      padding: 1rem 0;
      border-bottom: 1px solid #f0f0f0;
      scroll-margin-top: 100px; /* Account for fixed header */
    }
    
    .recipe-section:last-child {
      border-bottom: none;
    }
    
    .recipe-section h3,
    .recipe-section h4 {
      margin-top: 0;
      color: var(--primary-color);
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RecipeDetailComponent {
  @Input() recipe!: RecipeItem;
  @Input() activeTab: string = 'overview';
  
  @Output() stepComplete = new EventEmitter<number>();
  @Output() backToCategory = new EventEmitter<void>();

  goBack(): void {
    this.backToCategory.emit();
  }

  onStepComplete(stepNumber: number): void {
    this.stepComplete.emit(stepNumber);
  }

}