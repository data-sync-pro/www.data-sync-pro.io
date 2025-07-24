import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';

import { DesignerGuideRoutingModule } from './designer-guide-routing.module';
import { DesignerGuideComponent } from './designer-guide.component';
import { DesignerGuideItemComponent } from './designer-guide-item.component';
import { SharedModule } from '../shared/shared.module';

@NgModule({
  imports: [
    CommonModule,
    DesignerGuideRoutingModule,
    MatButtonModule,
    SharedModule,
    DesignerGuideComponent,
    DesignerGuideItemComponent
  ]
})
export class DesignerGuideModule { }