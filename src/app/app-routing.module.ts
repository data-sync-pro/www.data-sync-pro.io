import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { PricingComponent } from './pricing/pricing.component';
import { RulesEnginesComponent } from './rules-engines/rules-engines.component';
import { SolutionsComponent } from './solutions/solutions.component';
import { SupportComponent } from './support/support.component';
import { FaqComponent } from './faq/faq.component';
import { AppComponent } from './app.component';
import {DesignerGuideComponent} from './designer-guide/designer-guide.component';
import { DesignerGuideItemComponent } from './designer-guide/designer-guide-item.component'
const routes: Routes = [
  { path: '', component: HomeComponent },       // Home page
  { path: 'rules-engines', component: RulesEnginesComponent },
  { path: 'solutions', component: SolutionsComponent },
  { path: 'faq', component: FaqComponent },
  { path: 'support', component: SupportComponent },
  { path: 'pricing', component: PricingComponent },
  {
    path: 'designer-guide',
    component: DesignerGuideComponent,
    children: [
      { path: ':parent/:sub/:slug', component: DesignerGuideItemComponent },
      { path: ':parent/:slug',     component: DesignerGuideItemComponent }
    ]
  },
  { path: '**', redirectTo: '' }
];


@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {}
