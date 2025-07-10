import { Component } from '@angular/core';

interface Plan {
  name?: string;
  oldPrice?: string;      
  currentPrice?: string;
  perPerson?: string;
  buttonLabel?: string;
  badge?: string;        
  subtitle?: string;      
  features?: string[];    
  addOns?: string[];     
}

interface FeatureCategory {
  title: string;
  features: {
    name: string;
    included: boolean | string;
  }[];
}

@Component({
  selector: 'app-pricing',
  templateUrl: './pricing.component.html',
  styleUrls: ['./pricing.component.scss']
})
export class PricingComponent {
  
  plans: Plan[] = [
    {
      name: 'Connections',
      subtitle: 'Define your Salesforce org environments',
      oldPrice: '$1,000/mo',
      currentPrice: '$800/mo',
      perPerson: 'per Connection',
      badge: '20% OFF',
      buttonLabel: 'Schedule Demo',
      features: [
        'Connect your production Salesforce org',
        'Connect multiple sandbox environments',
        'Secure data synchronization between orgs',
        'Real-time monitoring and alerts',
        'Enterprise-grade security and compliance'
      ]
    },
    {
      name: 'Executables',
      subtitle: 'Modular rules for your data management processes',
      currentPrice: '$10/mo',
      perPerson: 'per Executable (100+ required)',
      buttonLabel: 'Schedule Demo',
      features: [
        'ETL (Extract, Transform, Load) processes',
        'Batch Jobs - 10x faster than APEX batch jobs',
        'Automation rules with 80% less tech debt',
        'Data List management and processing',
        'Action Button configurations',
        'Data Loader operations'
      ]
    }
  ];

  categories: FeatureCategory[] = [
    {
      title: 'Batch Engine - 10x Faster Performance',
      features: [
        { name: 'High-volume data processing', included: true },
        { name: 'Parallel processing capabilities', included: true },
        { name: 'Advanced error handling and recovery', included: true },
        { name: 'Real-time progress monitoring', included: true },
        { name: 'Custom batch job scheduling', included: true },
        { name: 'Performance optimization tools', included: true },
        { name: 'Memory-efficient processing', included: true }
      ]
    },
    {
      title: 'Triggers Engine - 80% Less Tech Debt',
      features: [
        { name: 'Declarative automation rules', included: true },
        { name: 'Visual workflow designer', included: true },
        { name: 'Cross-object relationship handling', included: true },
        { name: 'Conditional logic and branching', included: true },
        { name: 'Audit trail and version control', included: true },
        { name: 'Code-free automation setup', included: true },
        { name: 'Maintenance-friendly architecture', included: true }
      ]
    },
    {
      title: 'ETL (Extract, Transform, Load)',
      features: [
        { name: 'Data extraction from multiple sources', included: true },
        { name: 'Advanced data transformation rules', included: true },
        { name: 'Data validation and cleansing', included: true },
        { name: 'Incremental data loading', included: true },
        { name: 'Data mapping and field transformation', included: true },
        { name: 'Real-time data synchronization', included: true },
        { name: 'Error handling and data recovery', included: true }
      ]
    },
    {
      title: 'Data List Engine',
      features: [
        { name: 'Dynamic list generation and management', included: true },
        { name: 'Advanced filtering and sorting', included: true },
        { name: 'Bulk operations on data lists', included: true },
        { name: 'Export and import capabilities', included: true },
        { name: 'Custom list views and dashboards', included: true },
        { name: 'Automated list maintenance', included: true },
        { name: 'Integration with Salesforce reports', included: true }
      ]
    },
    {
      title: 'Action Button & Data Loader',
      features: [
        { name: 'Custom action button configurations', included: true },
        { name: 'Bulk data loading and updates', included: true },
        { name: 'File-based data import/export', included: true },
        { name: 'Data validation before loading', included: true },
        { name: 'Rollback and recovery options', included: true },
        { name: 'Scheduled data operations', included: true },
        { name: 'Multi-format file support', included: true }
      ]
    }
  ];

 openIndex: number | null = null;

  toggleCategory(index: number) {
    this.openIndex = this.openIndex === index ? null : index;
  }

  getDisplay(val: boolean | string): string {
    if (val === true) return '✔';
    if (val === false) return '';
    return val;
  }
}
