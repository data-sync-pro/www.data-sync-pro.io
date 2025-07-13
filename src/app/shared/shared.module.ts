import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LightningIconComponent } from './components/lightning-icon/lightning-icon.component';
import { OfflineIndicatorComponent } from './components/offline-indicator/offline-indicator.component';
import { FaqSkeletonComponent } from './components/skeleton/faq-skeleton.component';
import { LoadingComponent } from './components/loading/loading.component';

@NgModule({
  declarations: [
    LightningIconComponent,
    OfflineIndicatorComponent,
    FaqSkeletonComponent,
    LoadingComponent
  ],
  imports: [
    CommonModule
  ],
  exports: [
    LightningIconComponent,
    OfflineIndicatorComponent,
    FaqSkeletonComponent,
    LoadingComponent
  ]
})
export class SharedModule { }
