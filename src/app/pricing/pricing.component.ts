import { Component } from '@angular/core';

interface TierConfig {
  name: string;
  cost: number;
  connections: number;
  executables: number;
  batchCapacity: string;
}

@Component({
  selector: 'app-pricing',
  templateUrl: './pricing.component.html',
  styleUrls: ['./pricing.component.scss']
})
export class PricingComponent {

  selectedTier: string = 'standard';
  bundleTotal: number = 4000;
  showBundleOverlay: boolean = false;

  addons = {
    connections: 0,
    executables: 0,
    batchUpgrade: 'none'
  };

  private tierConfigs: { [key: string]: TierConfig } = {
    'starter': {
      name: 'Starter',
      cost: 1600,
      connections: 1,
      executables: 100,
      batchCapacity: '20k records/day'
    },
    'standard': {
      name: 'Standard',
      cost: 4000,
      connections: 5,
      executables: 100,
      batchCapacity: '20k records/day'
    },
    'batch-premium': {
      name: 'Batch Premium',
      cost: 6000,
      connections: 5,
      executables: 100,
      batchCapacity: '1M records/day'
    },
    'batch-unlimited': {
      name: 'Batch Unlimited',
      cost: 9000,
      connections: 5,
      executables: 100,
      batchCapacity: 'Unlimited records'
    }
  };

  constructor() {
    this.calculateTotal();
  }

  selectTier(tier: string): void {
    this.selectedTier = tier;
    this.calculateTotal();
  }

  updateAddon(type: 'connections' | 'executables', change: number): void {
    if (type === 'connections') {
      this.addons.connections = Math.max(0, this.addons.connections + change);
    } else if (type === 'executables') {
      this.addons.executables = Math.max(0, this.addons.executables + change);
    }
    this.calculateTotal();
  }

  calculateTotal(): void {
    const baseCost = this.getBaseTierCost();
    const connectionsCost = this.addons.connections * 600;
    const executablesCost = this.addons.executables * 10;
    const batchCost = this.getBatchUpgradeCost();
    
    this.bundleTotal = baseCost + connectionsCost + executablesCost + batchCost;
  }

  getSelectedTierName(): string {
    return this.tierConfigs[this.selectedTier]?.name || 'Standard';
  }

  getBaseTierCost(): number {
    return this.tierConfigs[this.selectedTier]?.cost || 4000;
  }

  getBatchUpgradeCost(): number {
    switch (this.addons.batchUpgrade) {
      case '1m': return 2000;
      case 'unlimited': return 5000;
      default: return 0;
    }
  }

  getBatchUpgradeName(): string {
    switch (this.addons.batchUpgrade) {
      case '1m': return '1M records/day';
      case 'unlimited': return 'Salesforce limit';
      default: return 'Included capacity';
    }
  }

  getTotalConnections(): number {
    const baseConnections = this.tierConfigs[this.selectedTier]?.connections || 5;
    return baseConnections + this.addons.connections;
  }

  getTotalExecutables(): number {
    const baseExecutables = this.tierConfigs[this.selectedTier]?.executables || 100;
    return baseExecutables + this.addons.executables;
  }

  getBatchCapacity(): string {
    if (this.addons.batchUpgrade !== 'none') {
      return this.getBatchUpgradeName();
    }
    return this.tierConfigs[this.selectedTier]?.batchCapacity || '20k records/day';
  }

  openBundleOverlay(tier: string): void {
    this.selectedTier = tier;
    this.resetBundleAddons();
    this.showBundleOverlay = true;
    document.body.style.overflow = 'hidden'; // Prevent background scrolling
  }

  closeBundleOverlay(): void {
    this.showBundleOverlay = false;
    document.body.style.overflow = 'auto'; // Restore scrolling
  }

  resetBundle(): void {
    this.resetBundleAddons();
  }

  resetBundleAddons(): void {
    this.addons = {
      connections: 0,
      executables: 0,
      batchUpgrade: 'none'
    };
    this.calculateTotal();
  }

  getBaseTierBaseIncludes(): string {
    const config = this.tierConfigs[this.selectedTier];
    if (!config) return '';
    
    return `${config.connections} connection${config.connections > 1 ? 's' : ''}, ${config.executables} executables, ${config.batchCapacity}`;
  }

  contactSales(): void {
    const bundleDetails = `
Bundle Configuration:
- Base Tier: ${this.getSelectedTierName()} ($${this.getBaseTierCost()}/month)
- Total Connections: ${this.getTotalConnections()}
- Total Executables: ${this.getTotalExecutables()}
- Batch Capacity: ${this.getBatchCapacity()}
- Total Monthly Cost: $${this.bundleTotal}

Additional Add-ons:
- Extra Connections: ${this.addons.connections} ($${this.addons.connections * 600}/month)
- Extra Executables: ${this.addons.executables} ($${this.addons.executables * 10}/month)
- Batch Upgrade: ${this.getBatchUpgradeName()} ($${this.getBatchUpgradeCost()}/month)
    `;
    
    const subject = `Custom Bundle Inquiry - $${this.bundleTotal}/month`;
    const body = encodeURIComponent(`Hi, I'm interested in the following custom bundle:${bundleDetails}`);
    
    window.open(`mailto:sales@data-sync-pro.io?subject=${encodeURIComponent(subject)}&body=${body}`, '_blank');
  }

}
