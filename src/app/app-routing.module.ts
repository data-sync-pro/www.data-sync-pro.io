import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { PricingComponent } from './pricing/pricing.component';
import { RulesEnginesComponent } from './rules-engines/rules-engines.component';
import { SolutionsComponent } from './solutions/solutions.component';
import { SupportComponent } from './support/support.component';
import { FaqComponent } from './faq/faq.component';
import { AppComponent } from './app.component';

const routes: Routes = [
  { path: '', component: HomeComponent },       // Home page
  { path: 'rules-engines', component: RulesEnginesComponent },
  { path: 'solutions', component: SolutionsComponent },
  { path: 'faq', component: FaqComponent },
  { path: 'support', component: SupportComponent },
  { path: 'pricing', component: PricingComponent },
  { path: '**', redirectTo: '' },               // Fallback to Home if unknown route
];


@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {}
