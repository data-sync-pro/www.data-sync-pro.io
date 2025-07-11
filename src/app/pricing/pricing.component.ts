import { Component, AfterViewInit } from '@angular/core';

@Component({
  selector: 'app-pricing',
  templateUrl: './pricing.component.html',
  styleUrls: ['./pricing.component.scss']
})
export class PricingComponent implements AfterViewInit {

  // Pricing calculator properties
  connections: number = 3;
  executables: number = 150;
  totalCost: number = 0;
  freeExecutables: number = 0;
  billableExecutables: number = 0;

  constructor() {
    this.calculateTotal();
  }

  ngAfterViewInit(): void {
    this.updateSliderBackgrounds();
  }

  calculateTotal(): void {
    // Calculate free executables (50 per connection)
    this.freeExecutables = this.connections * 50;

    // All executables are billable, but we show how many are included free
    this.billableExecutables = this.executables;

    // Calculate total cost - all executables are charged
    this.totalCost = (this.connections * 1000) + (this.executables * 10);

    // Update slider backgrounds
    this.updateSliderBackgrounds();
  }

  updateSliderBackgrounds(): void {
    setTimeout(() => {
      // Update connections slider
      const connectionsSlider = document.querySelector('.connections-slider') as HTMLInputElement;
      if (connectionsSlider) {
        const connectionsPercent = ((this.connections - 1) / (10 - 1)) * 100;
        connectionsSlider.style.background = `linear-gradient(to right, #48bb78 0%, #48bb78 ${connectionsPercent}%, #e2e8f0 ${connectionsPercent}%, #e2e8f0 100%)`;
      }

      // Update executables slider
      const executablesSlider = document.querySelector('.executables-slider') as HTMLInputElement;
      if (executablesSlider) {
        const executablesPercent = ((this.executables - 0) / (1000 - 0)) * 100;
        executablesSlider.style.background = `linear-gradient(to right, #ed8936 0%, #ed8936 ${executablesPercent}%, #e2e8f0 ${executablesPercent}%, #e2e8f0 100%)`;
      }
    }, 0);
  }

  setPreset(connections: number, executables: number): void {
    this.connections = connections;
    this.executables = executables;
    this.calculateTotal();
  }

  contactSales(): void {
    // You can customize this to open a contact form, email, or redirect to a contact page
    window.open('mailto:sales@data-sync-pro.io?subject=Enterprise Pricing Inquiry', '_blank');
  }

}
