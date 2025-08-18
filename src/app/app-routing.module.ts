import { NgModule } from '@angular/core';
import { RouterModule, Routes, PreloadAllModules } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { PricingComponent } from './pricing/pricing.component';
import { RulesEnginesComponent } from './rules-engines/rules-engines.component';
import { SolutionsComponent } from './solutions/solutions.component';
import { SupportComponent } from './support/support.component';
import { FaqEditorComponent } from './faq-editor/faq-editor.component';

const routes: Routes = [
  {
    path: 'recipes',loadChildren: () => import('./recipes/recipes.module').then(m => m.RecipesModule)
  },
  { path: 'faq-editor', component: FaqEditorComponent },
  { 
    path: 'recipe-editor', 
    loadChildren: () => import('./recipe-editor/recipe-editor.module').then(m => m.RecipeEditorModule)
  },
  //{ path: 'pricing', component: PricingComponent },
  //{ path: 'home', component: HomeComponent },
  //{ path: 'rules-engines', component: RulesEnginesComponent },
  //{ path: 'solutions', component: SolutionsComponent },
  //{ path: 'support', component: SupportComponent },
  //{
  //  path: 'designer-guide',
  //  loadChildren: () => import('./designer-guide/designer-guide.module').then(m => m.DesignerGuideModule)
  //},
  { 
    path: '', 
    loadChildren: () => import('./faq/faq.module').then(m => m.FaqModule)
  },
  // Exclude assets from Angular routing - let the browser handle them directly
  {
    path: 'assets',
    children: [] // Empty children means Angular won't handle routes starting with 'assets'
  },
  { path: '**', redirectTo: '' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes, {
    // 配置滚动行为
    scrollPositionRestoration: 'disabled', // 禁用自动滚动，由组件自己处理
    anchorScrolling: 'disabled', // 禁用自动锚点滚动，避免冲突
    scrollOffset: [0, 80], // 滚动偏移量，为固定header留出空间
    // 启用预加载策略，提升用户体验
    preloadingStrategy: PreloadAllModules, // 预加载所有懒加载模块
    // enableTracing: true // 开发时可启用路由跟踪（生产环境应关闭）
  })],
  exports: [RouterModule]
})
export class AppRoutingModule {}
