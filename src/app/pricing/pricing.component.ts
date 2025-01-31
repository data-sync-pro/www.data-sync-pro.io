import { Component } from '@angular/core';

/** Each top plan card. */
interface Plan {
  name?: string;
  oldPrice?: string;      // optional strikethrough
  currentPrice?: string;
  perPerson?: string;
  buttonLabel?: string;
  badge?: string;         // e.g., "BEST VALUE"
  subtitle?: string;       // short plan description
  features?: string[];     // bullet list inside the plan card
  addOns?: string[];      // optional bullet list of add-ons
}

/** For the accordion: each category has a title and multiple feature rows. */
interface FeatureCategory {
  title: string; 
  features: {
    name: string;                     // "Health insurance administration", etc.
    simple: boolean | string;         // true => checkmark, false => blank, "Add-on" => label
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
  
  // ====== TOP 3 CARDS ======
  plans: Plan[] = [
    {
      name: 'Starter',
      currentPrice: '$50/mo',
      features: [
        'Full-service single-state payroll including W-2s and 1099s',
        'Basic support',
        'Employee profiles and self-service',
        'Basic hiring and onboarding tools',
        // ...other bullet points...
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

  // ====== ACCORDION FEATURE CATEGORIES ======
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
    // Add more categories as needed...
  ];

  // Track which accordion panel is currently open. Null => all closed.
  openIndex: number | null = null;

  // Toggle open/close for a given category index
  toggleCategory(index: number) {
    this.openIndex = this.openIndex === index ? null : index;
  }

  // Helper function to interpret boolean/string values in the table
  getDisplay(val: boolean | string): string {
    if (val === true) return '✔';   // included
    if (val === false) return '';   // blank if not included
    return val;                     // e.g. "Add-on"
  }
}
