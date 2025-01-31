import { Component } from '@angular/core';

// COMMENT (Software Engineer, 30 yrs exp): This component represents the top header of our site.
// It will house the company logo, name, and later we can add navigation or sign-in buttons if needed.

@Component({
  selector: 'app-header',              // COMMENT: The tag we will use in our templates to include this header
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
})
export class HeaderComponent {
  // COMMENT: You could add any properties or methods here if the header needs dynamic behavior.
  // Right now, it's purely presentational.
}
