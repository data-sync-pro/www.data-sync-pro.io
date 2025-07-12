import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LightningIconComponent } from './components/lightning-icon/lightning-icon.component';

@NgModule({
  declarations: [
    LightningIconComponent
  ],
  imports: [
    CommonModule
  ],
  exports: [
    LightningIconComponent
  ]
})
export class SharedModule { }
