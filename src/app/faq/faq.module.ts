import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { MatButtonModule } from '@angular/material/button';
import { MatExpansionModule } from '@angular/material/expansion';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { ScrollingModule } from '@angular/cdk/scrolling';

import { FaqComponent } from './faq.component';
import { SearchOverlayComponent } from '../search-overlay/search-overlay.component';
import { FaqHomeComponent } from './faq-home/faq-home.component';
import { PaginatedFAQComponent } from './paginated-faq.component';
import { VirtualScrollFAQComponent } from './virtual-scroll-faq.component';
import { ZoomableDirective } from 'src/app/zoomable.directive';
@NgModule({
  declarations: [
    FaqComponent,
    SearchOverlayComponent,
    FaqHomeComponent,
    PaginatedFAQComponent,
    VirtualScrollFAQComponent,
    ZoomableDirective
  ],
  imports: [
    CommonModule,
    HttpClientModule,
    FormsModule,
    MatExpansionModule,
    MatButtonModule,
    ScrollingModule,
  ],
  exports: [
    FaqComponent,
    ZoomableDirective
  ]
})
export class FaqModule {}
