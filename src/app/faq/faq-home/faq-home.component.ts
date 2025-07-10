import { Component, EventEmitter, Output } from '@angular/core';
import faqs from '../../../assets/data/faqs.json';

interface FaqItem {
  Id: string;
  Question__c: string;
  Answer__c: string;
  Category__c: string;
  SubCategory__c: string | null;
}

@Component({
  selector: 'app-faq-home',
  templateUrl: './faq-home.component.html',
  styleUrls: ['./faq-home.component.scss'],
})
export class FaqHomeComponent {
  trendingIds: string[] = [
    'a0oEc000005JohNIAS',
    'a0oEc000005JohOIAS',
    'a0oEc000005JohSIAS',
    'a0oEc000005JohTIAS',
    'a0oEc000005JohUIAS',
    'a0oEc000005JohVIAS',
    'a0oEc000005JohWIAS',
    'a0oEc000005JohXIAS',
    'a0oEc000005JohYIAS',
  ];

  questions: FaqItem[] = [];

  private faqMap = new Map<string, FaqItem>();

  ngOnInit(): void {
    (faqs as FaqItem[]).forEach(f => this.faqMap.set(f.Id, f));

    this.questions = this.trendingIds.map(id => this.faqMap.get(id)).filter(Boolean) as FaqItem[];
  }

  @Output() selectedTrending = new EventEmitter<{
    question: string;
    category: string;
    subCategory: string | null;
  }>();

  selectQuestion(item: FaqItem) {
    this.selectedTrending.emit({
      question: item.Question__c,
      category: item.Category__c,
      subCategory: item.SubCategory__c,
    });
  }
}
