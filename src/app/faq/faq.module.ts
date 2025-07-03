import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { MatButtonModule } from '@angular/material/button';
import { MatExpansionModule } from '@angular/material/expansion';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';

import { FaqComponent } from './faq.component';
import { SearchOverlayComponent } from '../search-overlay/search-overlay.component';
import { FaqHomeComponent } from './faq-home/faq-home.component';
import { ZoomableDirective } from 'src/app/zoomable.directive';
@NgModule({
  declarations: [
    FaqComponent,
    SearchOverlayComponent,
    FaqHomeComponent,
    ZoomableDirective
  ],
  imports: [
    CommonModule,
    HttpClientModule,
    FormsModule,
    MatExpansionModule,
    MatButtonModule,
  ],
  exports: [
    FaqComponent,
    ZoomableDirective
  ]
})
export class FaqModule {}
