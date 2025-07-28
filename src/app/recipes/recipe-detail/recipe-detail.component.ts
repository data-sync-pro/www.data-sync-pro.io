import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { RecipeItem, RecipeWalkthroughStep, LegacyRecipeWalkthrough } from '../../shared/models/recipe.model';

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
          <!-- Use Case Section -->
          <section id="recipe-use-case" class="recipe-section">
            <h3>Use Case</h3>
            <div [innerHTML]="recipe.safeUsecase || recipe.safeUseCase"></div>
          </section>
          
          <!-- DSP Versions -->
          <section id="recipe-dsp-versions" class="recipe-section" *ngIf="recipe.DSPVersions?.length">
            <h4>Supported DSP Versions:</h4>
            <div class="version-tags">
              <span class="version-tag" *ngFor="let version of recipe.DSPVersions">{{ version }}</span>
            </div>
          </section>
          
          <!-- Connection Type -->
          <section id="recipe-connection" class="recipe-section" *ngIf="recipe.connection">
            <h4>Connection Type:</h4>
            <p>{{ recipe.connection }}</p>
          </section>
          
          <!-- Direction -->
          <section id="recipe-direction" class="recipe-section" *ngIf="recipe.direction">
            <h4>Direction:</h4>
            <div [innerHTML]="recipe.safeDirection || recipe.direction"></div>
          </section>
          
          <!-- Prerequisites -->
          <section id="recipe-prerequisites" class="recipe-section" *ngIf="recipe.prerequisites?.length">
            <h4>Prerequisites:</h4>
            <div class="prerequisites-list">
              <div class="prerequisite-item" *ngFor="let prereq of recipe.prerequisites">
                <p>{{ prereq.description }}</p>
                <div class="quick-links" *ngIf="prereq.quickLinks?.length">
                  <h5>Quick Links:</h5>
                  <ul>
                    <li *ngFor="let link of prereq.quickLinks">
                      <a [href]="link.url" target="_blank">{{ link.title }}</a>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </section>
          
          <!-- Legacy Prerequisites Support -->
          <ng-container *ngIf="recipe.prerequisites?.permissionSetsForBuilding">
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
          </ng-container>
          
          <!-- Download section -->
          <section id="recipe-download-executables" class="recipe-section" *ngIf="recipe.downloadableExecutables?.length">
            <h4>Download Executable Files:</h4>
            <div class="download-list">
              <div class="download-item" *ngFor="let executable of recipe.downloadableExecutables">
                <a [href]="executable.url" target="_blank" class="download-link">
                  <mat-icon>download</mat-icon>
                  {{ executable.title }}
                </a>
              </div>
            </div>
          </section>
          
          <!-- Legacy Download Support -->
          <section id="recipe-download-executable" class="recipe-section" *ngIf="recipe.downloadableExecutable">
            <h4>Download Executable:</h4>
            <app-recipe-download 
              [executable]="recipe.downloadableExecutable">
            </app-recipe-download>
          </section>
          
          <!-- Related Recipes -->
          <section id="recipe-related" class="recipe-section" *ngIf="recipe.relatedRecipes?.length">
            <h4>Related Recipes:</h4>
            <div class="related-recipes">
              <a *ngFor="let related of recipe.relatedRecipes" 
                 [href]="related.url" 
                 class="related-recipe-link">
                {{ related.title }}
              </a>
            </div>
          </section>
          
          <!-- Keywords -->
          <section id="recipe-keywords" class="recipe-section" *ngIf="recipe.keywords?.length">
            <h4>Keywords:</h4>
            <div class="keyword-tags">
              <span class="keyword-tag" *ngFor="let keyword of recipe.keywords">{{ keyword }}</span>
            </div>
          </section>
        </div>
        
        <!-- Walkthrough Content -->
        <div class="tab-content" *ngIf="activeTab === 'walkthrough'">
          <!-- New Array-based Walkthrough -->
          <mat-stepper orientation="vertical" #stepper *ngIf="isArrayWalkthrough()">
            <mat-step 
              *ngFor="let step of getWalkthroughSteps(); let i = index" 
              [label]="step.step" 
              [id]="'recipe-step-' + i">
              <app-recipe-step 
                [stepData]="step"
                stepType="custom"
                (stepComplete)="onStepComplete(i)">
              </app-recipe-step>
            </mat-step>
          </mat-stepper>
          
          <!-- Legacy Object-based Walkthrough -->
          <mat-stepper orientation="vertical" #stepper *ngIf="!isArrayWalkthrough()">
            <mat-step label="Create Executable" id="recipe-create-executable">
              <app-recipe-step 
                [stepData]="getLegacyWalkthrough().createExecutable"
                stepType="createExecutable"
                (stepComplete)="onStepComplete(0)">
              </app-recipe-step>
            </mat-step>
            
            <mat-step label="Retrieve Data" id="recipe-retrieve-data">
              <app-recipe-step 
                [stepData]="getLegacyWalkthrough().retrieve"
                stepType="retrieve"
                (stepComplete)="onStepComplete(1)">
              </app-recipe-step>
            </mat-step>
            
            <mat-step label="Scoping" id="recipe-scoping" *ngIf="getLegacyWalkthrough().scoping">
              <app-recipe-step 
                [stepData]="getLegacyWalkthrough().scoping"
                stepType="scoping"
                (stepComplete)="onStepComplete(2)">
              </app-recipe-step>
            </mat-step>
            
            <mat-step label="Match" id="recipe-match" *ngIf="getLegacyWalkthrough().match">
              <app-recipe-step 
                [stepData]="getLegacyWalkthrough().match"
                stepType="match"
                (stepComplete)="onStepComplete(3)">
              </app-recipe-step>
            </mat-step>
            
            <mat-step label="Mapping" id="recipe-mapping" *ngIf="getLegacyWalkthrough().mapping">
              <app-recipe-step 
                [stepData]="getLegacyWalkthrough().mapping"
                stepType="mapping"
                (stepComplete)="onStepComplete(4)">
              </app-recipe-step>
            </mat-step>
            
            <mat-step label="Action" id="recipe-action" *ngIf="getLegacyWalkthrough().action">
              <app-recipe-step 
                [stepData]="getLegacyWalkthrough().action"
                stepType="action"
                (stepComplete)="onStepComplete(5)">
              </app-recipe-step>
            </mat-step>
            
            <mat-step label="Verify" id="recipe-verify" *ngIf="getLegacyWalkthrough().verify">
              <app-recipe-step 
                [stepData]="getLegacyWalkthrough().verify"
                stepType="verify"
                (stepComplete)="onStepComplete(6)">
              </app-recipe-step>
            </mat-step>
            
            <mat-step label="Preview Transformed" id="recipe-preview-transformed" *ngIf="getLegacyWalkthrough().previewTransformed">
              <app-recipe-step 
                [stepData]="getLegacyWalkthrough().previewTransformed"
                stepType="previewTransformed"
                (stepComplete)="onStepComplete(7)">
              </app-recipe-step>
            </mat-step>
            
            <mat-step label="Add Schedule" id="recipe-add-schedule" *ngIf="getLegacyWalkthrough().addSchedule">
              <app-recipe-step 
                [stepData]="getLegacyWalkthrough().addSchedule"
                stepType="addSchedule"
                (stepComplete)="onStepComplete(8)">
              </app-recipe-step>
            </mat-step>
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
    
    .version-tags, .keyword-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin-top: 0.5rem;
    }
    
    .version-tag, .keyword-tag {
      background: #e3f2fd;
      color: #1976d2;
      padding: 0.25rem 0.75rem;
      border-radius: 1rem;
      font-size: 0.875rem;
      font-weight: 500;
    }
    
    .prerequisites-list {
      margin-top: 1rem;
    }
    
    .prerequisite-item {
      margin-bottom: 1.5rem;
      padding: 1rem;
      background: #f8f9fa;
      border-radius: 8px;
      border-left: 4px solid var(--primary-color);
    }
    
    .prerequisite-item p {
      margin: 0 0 1rem 0;
    }
    
    .quick-links h5 {
      margin: 0 0 0.5rem 0;
      font-size: 0.875rem;
      color: var(--primary-color);
    }
    
    .quick-links ul {
      margin: 0;
      padding-left: 1.5rem;
    }
    
    .quick-links a {
      color: var(--primary-color);
      text-decoration: none;
    }
    
    .quick-links a:hover {
      text-decoration: underline;
    }
    
    .download-list {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      margin-top: 1rem;
    }
    
    .download-item {
      background: #f5f5f5;
      border-radius: 8px;
      padding: 0.75rem;
    }
    
    .download-link {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      color: var(--primary-color);
      text-decoration: none;
      font-weight: 500;
    }
    
    .download-link:hover {
      text-decoration: underline;
    }
    
    .related-recipes {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      margin-top: 1rem;
    }
    
    .related-recipe-link {
      color: var(--primary-color);
      text-decoration: none;
      padding: 0.5rem 0;
      border-bottom: 1px solid #e0e0e0;
    }
    
    .related-recipe-link:hover {
      text-decoration: underline;
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

  isArrayWalkthrough(): boolean {
    return Array.isArray(this.recipe.walkthrough);
  }

  getWalkthroughSteps(): any[] {
    if (Array.isArray(this.recipe.walkthrough)) {
      return this.recipe.walkthrough;
    }
    return [];
  }

  getLegacyWalkthrough(): any {
    if (!Array.isArray(this.recipe.walkthrough)) {
      return this.recipe.walkthrough;
    }
    return this.recipe.legacyWalkthrough || {};
  }

}