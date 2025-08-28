import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { MatButtonModule } from '@angular/material/button';
import { MatExpansionModule } from '@angular/material/expansion';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { ScrollingModule } from '@angular/cdk/scrolling';

import { FaqRoutingModule } from './faq-routing.module';
import { FaqComponent } from './faq.component';
import { SearchOverlayComponent } from '../search-overlay/search-overlay.component';
import { SharedModule } from '../shared/shared.module';
@NgModule({
  declarations: [
    FaqComponent,
    SearchOverlayComponent
  ],
  imports: [
    CommonModule,
    FaqRoutingModule,
    HttpClientModule,
    FormsModule,
    MatExpansionModule,
    MatButtonModule,
    ScrollingModule,
    SharedModule,
  ],
  exports: [
    FaqComponent
  ]
})
export class FaqModule {}
