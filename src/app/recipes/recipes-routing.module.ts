import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { RecipesComponent } from './recipes.component';

const routes: Routes = [
  { 
    path: '', 
    component: RecipesComponent,
    data: { title: 'Recipes - Data Sync Pro' }
  },
  { 
    path: ':category', 
    component: RecipesComponent,
    data: { title: 'Recipe Category - Data Sync Pro' }
  },
  { 
    path: ':category/:recipeName', 
    component: RecipesComponent,
    data: { title: 'Recipe Details - Data Sync Pro' }
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class RecipesRoutingModule { }