import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { ScrollingModule } from '@angular/cdk/scrolling';

// Angular Material Modules
import { MatButtonModule } from '@angular/material/button';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatTabsModule } from '@angular/material/tabs';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatStepperModule } from '@angular/material/stepper';
import { MatBadgeModule } from '@angular/material/badge';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCheckboxModule } from '@angular/material/checkbox';

// Routing
import { RecipesRoutingModule } from './recipes-routing.module';

// Components
import { RecipesComponent } from './recipes.component';
import { RecipeCardComponent } from './recipe-card/recipe-card.component';
import { RecipeStepComponent } from './recipe-step/recipe-step.component';
import { RecipeSearchOverlayComponent } from './recipe-search-overlay/recipe-search-overlay.component';
import { RecipeSidebarComponent } from './recipe-sidebar/recipe-sidebar.component';
import { RecipeTocComponent } from './recipe-toc/recipe-toc.component';
import { RecipeOverviewSectionComponent } from './recipe-overview-section/recipe-overview-section.component';

// Shared Modules and Components
import { SharedModule } from '../shared/shared.module';

@NgModule({
  declarations: [
    RecipesComponent,
    RecipeCardComponent,
    RecipeStepComponent,
    RecipeSearchOverlayComponent,
    RecipeSidebarComponent,
    RecipeTocComponent,
    RecipeOverviewSectionComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    HttpClientModule,
    ScrollingModule,
    
    // Angular Material
    MatButtonModule,
    MatExpansionModule,
    MatIconModule,
    MatCardModule,
    MatTabsModule,
    MatChipsModule,
    MatProgressBarModule,
    MatStepperModule,
    MatBadgeModule,
    MatTooltipModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatCheckboxModule,
    
    // Routing
    RecipesRoutingModule,
    
    // Shared
    SharedModule
  ],
  exports: [
    RecipesComponent,
    RecipeCardComponent
  ]
})
export class RecipesModule { }