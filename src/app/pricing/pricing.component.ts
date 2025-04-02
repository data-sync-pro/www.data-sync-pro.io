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
    simple: boolean | string;        
    plus: boolean | string;
    premium: boolean | string;
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
      name: 'Starter',
      currentPrice: '$50/mo',
      features: [
        'Full-service single-state payroll including W-2s and 1099s',
        'Basic support',
        'Employee profiles and self-service',
        'Basic hiring and onboarding tools',
      ]
    },
    {
      name: 'Addons',
      addOns: [
        'Time & Attendance Plus: $6/mo per person',
        'Next-Day Direct Deposit: $15/mo + $3/mo per person'
      ]
    },
  
  ];

  categories: FeatureCategory[] = [
    {
      title: 'Batch Engine',
      features: [
        { name: 'Health insurance administration', simple: true, plus: true, premium: true },
        { name: 'Workers’ compensation', simple: 'Add-on', plus: 'Add-on', premium: 'Add-on' },
        // ...
      ]
    },
    {
      title: 'Trigger Engine',
      features: [
        { name: 'Advanced hiring tools', simple: false, plus: true, premium: true },
        { name: 'Applicant tracking system', simple: false, plus: true, premium: true },
        // ...
      ]
    },
    {
      title: 'Data List Engine',
      features: [
        { name: 'Health insurance broker integration', simple: false, plus: 'Add-on', premium: true },
        { name: 'HSAs and FSAs', simple: 'Add-on', plus: 'Add-on', premium: 'Add-on' },
        // ...
      ]
    },
    {
      title: 'Data Loader Engine',
      features: [
        { name: 'Health insurance broker integration', simple: false, plus: 'Add-on', premium: true },
        { name: 'HSAs and FSAs', simple: 'Add-on', plus: 'Add-on', premium: 'Add-on' },
        // ...
      ]
    },
    {
      title: 'Record Action Engine',
      features: [
        { name: 'Health insurance broker integration', simple: false, plus: 'Add-on', premium: true },
        { name: 'HSAs and FSAs', simple: 'Add-on', plus: 'Add-on', premium: 'Add-on' },
        // ...
      ]
    },
    
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
