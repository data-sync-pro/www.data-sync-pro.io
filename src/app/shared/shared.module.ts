import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LightningIconComponent } from './components/lightning-icon/lightning-icon.component';
import { OfflineIndicatorComponent } from './components/offline-indicator/offline-indicator.component';
import { FaqSkeletonComponent } from './components/skeleton/faq-skeleton.component';
import { LoadingComponent } from './components/loading/loading.component';
import { SimpleZoomableDirective } from '../simple-zoomable.directive';
import { AutoLinkDirective } from './directives/auto-link.directive';
import { AutoLinkPipe } from './pipes/auto-link.pipe';

@NgModule({
  declarations: [
    LightningIconComponent,
    OfflineIndicatorComponent,
    FaqSkeletonComponent,
    LoadingComponent,
    SimpleZoomableDirective,
    AutoLinkDirective,
    AutoLinkPipe
  ],
  imports: [
    CommonModule
  ],
  exports: [
    LightningIconComponent,
    OfflineIndicatorComponent,
    FaqSkeletonComponent,
    LoadingComponent,
    SimpleZoomableDirective,
    AutoLinkDirective,
    AutoLinkPipe
  ]
})
export class SharedModule { }
