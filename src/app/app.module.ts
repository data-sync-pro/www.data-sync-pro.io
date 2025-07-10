import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { MatExpansionModule } from '@angular/material/expansion';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { MatButtonModule } from '@angular/material/button';
import { FaqModule } from './faq/faq.module'; //

import { CookieConsentComponent } from './cookie-consent/cookie-consent.component';
import { HomeComponent } from './home/home.component';
import { HeaderComponent } from './header/header.component';
import { PricingComponent } from './pricing/pricing.component';
import { FooterComponent } from './footer/footer.component';
import { SupportComponent } from './support/support.component';
import { SolutionsComponent } from './solutions/solutions.component';
import { RulesEnginesComponent } from './rules-engines/rules-engines.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { ScrollToTopComponent } from './scroll-to-top/scroll-to-top.component';

@NgModule({
  declarations: [
    AppComponent,
    HomeComponent,
    HeaderComponent,
    PricingComponent,
    FooterComponent,
    SupportComponent,
    SolutionsComponent,
    RulesEnginesComponent,
    CookieConsentComponent,
    ScrollToTopComponent,
  ],
  imports: [
    BrowserModule,
    HttpClientModule,
    AppRoutingModule,
    MatButtonModule,
    MatExpansionModule,
    FormsModule,
    BrowserAnimationsModule,
    FaqModule,
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
