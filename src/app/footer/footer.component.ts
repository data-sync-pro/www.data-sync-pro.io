import { Component } from '@angular/core';

/*
  COMMENT (Software Engineer, 30 yrs exp): 
  The FooterComponent displays:
   - Company logo (again, as requested),
   - Social icons (excluding Instagram),
   - Three columns: Use cases, Explore, Resources.
*/

@Component({
  selector: 'app-footer',
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.scss']
})
export class FooterComponent {
  // COMMENT: If you need dynamic data for the columns, 
  // you can define them as arrays here and iterate in the template.
  // For now, it's static as per your request.
}
