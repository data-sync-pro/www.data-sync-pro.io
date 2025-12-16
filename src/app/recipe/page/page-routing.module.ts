import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { RecipesComponent } from './page.component';
import { RecipeDetailPageComponent } from './detail-page/detail-page.component';

const routes: Routes = [
  {
    path: '',
    component: RecipesComponent,
    data: { title: 'Recipes - Data Sync Pro' }
  },
  {
    path: ':category/:recipeName',
    component: RecipeDetailPageComponent,
    data: { title: 'Recipe Details - Data Sync Pro' }
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class RecipePageRoutingModule { }