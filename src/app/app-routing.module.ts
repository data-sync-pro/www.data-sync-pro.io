import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { PricingComponent } from './pricing/pricing.component';
import { RulesEnginesComponent } from './rules-engines/rules-engines.component';
import { SolutionsComponent } from './solutions/solutions.component';
import { SupportComponent } from './support/support.component';
import { FaqComponent } from './faq/faq.component';
import { DesignerGuideComponent } from './designer-guide/designer-guide.component';
import { DesignerGuideItemComponent } from './designer-guide/designer-guide-item.component';
const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'rules-engines', component: RulesEnginesComponent },
  { path: 'solutions', component: SolutionsComponent },
  { path: 'support', component: SupportComponent },
  { path: 'pricing', component: PricingComponent },
  { path: 'faq', component: FaqComponent },
  { path: 'faq/:cat', component: FaqComponent },
  { path: 'faq/:cat/:subCat', component: FaqComponent },
  {
    path: 'designer-guide',
    component: DesignerGuideComponent,
    children: [
      { path: ':parent/:sub/:slug', component: DesignerGuideItemComponent },
      { path: ':parent/:slug', component: DesignerGuideItemComponent },
    ],
  },
  { path: '**', redirectTo: '' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes, {
    // 配置滚动行为
    scrollPositionRestoration: 'disabled', // 禁用自动滚动，由组件自己处理
    anchorScrolling: 'disabled', // 禁用自动锚点滚动，避免冲突
    scrollOffset: [0, 80] // 滚动偏移量，为固定header留出空间
  })],
  exports: [RouterModule]
})
export class AppRoutingModule {}
