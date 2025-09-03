import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { FaqComponent } from './faq.component';

const routes: Routes = [
  { path: '', component: FaqComponent }
  // Temporarily removed parameter routes to prevent answerPath mismatch
  // { path: ':cat', component: FaqComponent },
  // { path: ':cat/:subCat', component: FaqComponent }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class FaqRoutingModule { }