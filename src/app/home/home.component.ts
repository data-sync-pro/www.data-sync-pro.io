import { Component } from '@angular/core';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
})
export class HomeComponent {
  tabs = [
    {
      name: 'Batch',
      secondHeroTitle: 'Batch Title',
      secondHeroSubtitle: 'Batch Subtitle: Lorem ipsum dolor sit amet.',
      cardOneTitle: 'Batch Card One',
      cardOneContent: 'Batch card one content goes here.',
      cardTwoTitle: 'Batch Card Two',
      cardTwoContent: 'Batch card two content goes here.',
    },
    {
      name: 'Trigger',
      secondHeroTitle: 'Trigger Title',
      secondHeroSubtitle: 'Trigger Subtitle: At vero eos et accusamus et iusto odio.',
      cardOneTitle: 'Trigger Card One',
      cardOneContent: 'Trigger card one content goes here.',
      cardTwoTitle: 'Trigger Card Two',
      cardTwoContent: 'Trigger card two content goes here.',
    },
    {
      name: 'Data List',
      secondHeroTitle: 'Data List Title',
      secondHeroSubtitle: 'Data List Subtitle: Quis autem vel eum iure reprehenderit.',
      cardOneTitle: 'Data List Card One',
      cardOneContent: 'Data List card one content goes here.',
      cardTwoTitle: 'Data List Card Two',
      cardTwoContent: 'Data List card two content goes here.',
    },
    {
      name: 'Data Loader',
      secondHeroTitle: 'Data Loader Title',
      secondHeroSubtitle: 'Data Loader Subtitle: Nemo enim ipsam voluptatem.',
      cardOneTitle: 'Data Loader Card One',
      cardOneContent: 'Data Loader card one content goes here.',
      cardTwoTitle: 'Data Loader Card Two',
      cardTwoContent: 'Data Loader card two content goes here.',
    },
    {
      name: 'Record Action',
      secondHeroTitle: 'Record Action Title',
      secondHeroSubtitle: 'Record Action Subtitle: Sed ut perspiciatis unde omnis iste.',
      cardOneTitle: 'Record Action Card One',
      cardOneContent: 'Record Action card one content goes here.',
      cardTwoTitle: 'Record Action Card Two',
      cardTwoContent: 'Record Action card two content goes here.',
    },
  ];

  selectedTab = this.tabs[0];

  selectTab(tab: any) {
    this.selectedTab = tab;
  }
}
