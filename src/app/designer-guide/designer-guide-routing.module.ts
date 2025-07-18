import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DesignerGuideComponent } from './designer-guide.component';
import { DesignerGuideItemComponent } from './designer-guide-item.component';

const routes: Routes = [
  {
    path: '',
    component: DesignerGuideComponent,
    children: [
      { path: ':parent/:sub/:slug', component: DesignerGuideItemComponent },
      { path: ':parent/:slug', component: DesignerGuideItemComponent },
    ],
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class DesignerGuideRoutingModule { }