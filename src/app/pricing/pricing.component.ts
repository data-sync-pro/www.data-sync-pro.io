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

  addons = {
    connections: 0,
    executables: 0,
    batchUpgrade: 'none'
  };

  // Temporary values for user input
  tempConnections: number = 0;
  tempExecutables: number = 0;

  // FAQ states for accordion
  faqStates: boolean[] = [false, false, false, false, false, false];

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
      batchCapacity: 'No DSP limit(Salesforce limit applies)'
    }
  };

  constructor() {
    this.resetBundleAddons();
    this.tempConnections = this.addons.connections;
    this.tempExecutables = this.addons.executables;
  }

  selectTier(tier: string): void {
    this.selectedTier = tier;
    this.calculateTotal();
  }

  updateAddon(type: 'connections' | 'executables', change: number): void {
    if (type === 'connections') {
      this.addons.connections = Math.max(1, this.addons.connections + change);
      this.tempConnections = this.addons.connections;
    } else if (type === 'executables') {
      this.addons.executables = Math.max(50, this.addons.executables + change);
      this.tempExecutables = this.addons.executables;
    }
    this.calculateTotal();
  }

  calculateTotal(): void {
    // Calculate total costs based on actual usage
    const connectionsCost = this.addons.connections * 600;
    const executablesCost = this.addons.executables * 10;
    const batchCost = this.getBatchUpgradeCost();
    
    this.bundleTotal = connectionsCost + executablesCost + batchCost;
  }

  getSelectedTierName(): string {
    return this.tierConfigs[this.selectedTier]?.name || 'Standard';
  }

  getBaseTierCost(): number {
    return this.tierConfigs[this.selectedTier]?.cost || 4000;
  }

  getBatchUpgradeCost(): number {
    return this.getBatchOptionCost(this.addons.batchUpgrade);
  }

  getBatchOptionCost(option: string): number {
    const config = this.tierConfigs[this.selectedTier];
    let baseBatchCost = 0;
    
    // Determine base batch cost for current tier
    switch (this.selectedTier) {
      case 'starter':
      case 'standard':
        baseBatchCost = 0; // 20k is free
        break;
      case 'batch-premium':
        baseBatchCost = 2000; // 1M is included
        break;
      case 'batch-unlimited':
        baseBatchCost = 5000; // Unlimited is included
        break;
    }
    
    // Calculate cost difference
    let optionCost = 0;
    switch (option) {
      case '20k':
        optionCost = 0;
        break;
      case '1m':
        optionCost = 2000;
        break;
      case 'unlimited':
        optionCost = 5000;
        break;
    }
    
    return optionCost - baseBatchCost;
  }

  getBatchUpgradeName(): string {
    switch (this.addons.batchUpgrade) {
      case '20k': return '20k records/day';
      case '1m': return '1M records/day';
      case 'unlimited': return 'Salesforce limit';
      default: return 'Included capacity';
    }
  }

  shouldShowBatchOption(option: string): boolean {
    switch (this.selectedTier) {
      case 'starter':
      case 'standard':
        // Show all options for basic tiers
        return true;
      case 'batch-premium':
        // Hide 20k (downgrade), show 1m (included) and unlimited (upgrade)
        return option !== '20k';
      case 'batch-unlimited':
        // Only show unlimited (included), hide downgrades
        return option === 'unlimited';
      default:
        return true;
    }
  }

  getDefaultBatchOption(): string {
    switch (this.selectedTier) {
      case 'starter':
      case 'standard':
        return '20k';
      case 'batch-premium':
        return '1m';
      case 'batch-unlimited':
        return 'unlimited';
      default:
        return '20k';
    }
  }

  getTotalConnections(): number {
    return this.addons.connections;
  }

  getTotalExecutables(): number {
    return this.addons.executables;
  }


  getBatchCapacity(): string {
    if (this.addons.batchUpgrade !== 'none') {
      return this.getBatchUpgradeName();
    }
    return this.tierConfigs[this.selectedTier]?.batchCapacity || '20k records/day';
  }

  selectTierAndScroll(tier: string): void {
    this.selectedTier = tier;
    this.resetBundleAddons();
    
    // Scroll to configurator section
    setTimeout(() => {
      const element = document.querySelector('.bundle-configurator-section');
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  }

  resetBundle(): void {
    this.resetBundleAddons();
  }

  resetBundleAddons(): void {
    // Set default batch option based on tier
    let defaultBatchOption = '20k';
    switch (this.selectedTier) {
      case 'starter':
      case 'standard':
        defaultBatchOption = '20k';
        break;
      case 'batch-premium':
        defaultBatchOption = '1m';
        break;
      case 'batch-unlimited':
        defaultBatchOption = 'unlimited';
        break;
    }
    
    this.addons = {
      connections: 1,
      executables: 100,
      batchUpgrade: defaultBatchOption
    };
    this.tempConnections = this.addons.connections;
    this.tempExecutables = this.addons.executables;
    this.calculateTotal();
  }

  getBaseTierBaseIncludes(): string {
    const config = this.tierConfigs[this.selectedTier];
    if (!config) return '';
    
    return `${config.connections} connection${config.connections > 1 ? 's' : ''}, ${config.executables} executables, ${config.batchCapacity}`;
  }

  onConnectionsInput(event: any): void {
    // Just update the temp value, don't calculate
    this.tempConnections = event.target.value;
  }

  onConnectionsBlur(event: any): void {
    const value = parseInt(event.target.value);
    this.addons.connections = Math.max(1, Math.floor(value) || 1);
    this.tempConnections = this.addons.connections;
    this.calculateTotal();
  }

  onExecutablesInput(event: any): void {
    // Just update the temp value, don't calculate
    this.tempExecutables = event.target.value;
  }

  onExecutablesBlur(event: any): void {
    const value = parseInt(event.target.value);
    const rounded = Math.round((value || 50) / 50) * 50;
    this.addons.executables = Math.max(50, rounded);
    this.tempExecutables = this.addons.executables;
    this.calculateTotal();
  }

  toggleFaq(index: number): void {
    this.faqStates[index] = !this.faqStates[index];
  }

  contactSales(): void {
    const bundleDetails = `
Bundle Configuration:
- Connections: ${this.getTotalConnections()} ($${this.addons.connections * 600}/month)
- Executables: ${this.getTotalExecutables()} ($${this.addons.executables * 10}/month)
- Batch Capacity: ${this.getBatchCapacity()} ($${this.getBatchUpgradeCost()}/month)
- Total Monthly Cost: $${this.bundleTotal}
    `;
    
    const subject = `Custom Bundle Inquiry - $${this.bundleTotal}/month`;
    const body = encodeURIComponent(`Hi, I'm interested in the following custom bundle:${bundleDetails}`);
    
    window.open(`mailto:sales@data-sync-pro.io?subject=${encodeURIComponent(subject)}&body=${body}`, '_blank');
  }

}
