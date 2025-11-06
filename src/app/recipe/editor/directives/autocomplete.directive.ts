import {
  Directive,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  OnDestroy,
  Output,
  Renderer2,
  NgZone
} from '@angular/core';
import { EDITOR_CONSTANTS } from '../editor.constants';

@Directive({
  selector: '[appAutocomplete]'
})
export class AutocompleteDirective implements OnDestroy {
  @Input() appAutocomplete: string[] = [];
  @Output() valueSelected = new EventEmitter<string>();

  private dropdown: HTMLElement | null = null;
  private debounceTimeout: any;
  private closeTimeout: any;
  private listenerCleanupFns: (() => void)[] = [];

  constructor(
    private el: ElementRef<HTMLInputElement>,
    private renderer: Renderer2,
    private ngZone: NgZone
  ) {}

  @HostListener('input', ['$event'])
  onInput(event: Event): void {
    const input = this.el.nativeElement;

    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout);
    }

    if (this.closeTimeout) {
      clearTimeout(this.closeTimeout);
      this.closeTimeout = null;
    }

    this.debounceTimeout = setTimeout(() => {
      this.ngZone.run(() => {
        const query = input.value.toLowerCase();

        if (this.appAutocomplete.length === 0) {
          this.closeDropdown();
          return;
        }

        const matches = this.appAutocomplete.filter(field =>
          field.toLowerCase().includes(query) || query.length === 0
        );

        if (matches.length > 0) {
          this.showDropdown(matches);
        } else {
          this.closeDropdown();
        }
      });
    }, EDITOR_CONSTANTS.AUTOCOMPLETE_DEBOUNCE_MS);
  }

  @HostListener('blur', ['$event'])
  onBlur(event: Event): void {
    this.closeTimeout = setTimeout(() => {
      this.ngZone.run(() => {
        this.closeDropdown();
      });
    }, EDITOR_CONSTANTS.AUTOCOMPLETE_CLOSE_DELAY_MS);
  }

  @HostListener('keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    if (!this.dropdown) return;

    this.ngZone.run(() => {
      const items = this.dropdown!.querySelectorAll('.autocomplete-item');
      const selectedItem = this.dropdown!.querySelector('.autocomplete-item.selected');
      let selectedIndex = Array.from(items).indexOf(selectedItem as Element);

      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          if (selectedItem) this.renderer.removeClass(selectedItem, 'selected');
          selectedIndex = (selectedIndex + 1) % items.length;
          this.renderer.addClass(items[selectedIndex], 'selected');
          break;

        case 'ArrowUp':
          event.preventDefault();
          if (selectedItem) this.renderer.removeClass(selectedItem, 'selected');
          selectedIndex = selectedIndex <= 0 ? items.length - 1 : selectedIndex - 1;
          this.renderer.addClass(items[selectedIndex], 'selected');
          break;

        case 'Enter':
          event.preventDefault();
          if (selectedItem) {
            const selectedValue = selectedItem.textContent || '';
            this.valueSelected.emit(selectedValue);
            this.closeDropdown();
          }
          break;

        case 'Escape':
          this.closeDropdown();
          break;
      }
    });
  }

  private showDropdown(matches: string[]): void {
    this.closeDropdown();

    const input = this.el.nativeElement;
    const wrapper = input.closest('.autocomplete-wrapper');
    if (!wrapper) return;

    const dropdown = this.renderer.createElement('div');
    this.renderer.addClass(dropdown, 'autocomplete-dropdown');

    matches.forEach((match, index) => {
      const item = this.renderer.createElement('div');
      this.renderer.addClass(item, 'autocomplete-item');
      if (index === 0) this.renderer.addClass(item, 'selected');
      this.renderer.setProperty(item, 'textContent', match);

      const cleanup = this.renderer.listen(item, 'mousedown', (event) => {
        event.preventDefault();
        this.ngZone.run(() => {
          this.valueSelected.emit(match);
          this.closeDropdown();
        });
      });
      this.listenerCleanupFns.push(cleanup);

      this.renderer.appendChild(dropdown, item);
    });

    this.renderer.appendChild(wrapper, dropdown);
    this.dropdown = dropdown;
  }

  private closeDropdown(): void {
    const input = this.el.nativeElement;
    const wrapper = input.closest('.autocomplete-wrapper');

    if (wrapper && this.dropdown) {
      this.renderer.removeChild(wrapper, this.dropdown);
      this.dropdown = null;
    }

    this.listenerCleanupFns.forEach(cleanup => cleanup());
    this.listenerCleanupFns = [];

    if (this.closeTimeout) {
      clearTimeout(this.closeTimeout);
      this.closeTimeout = null;
    }
  }

  ngOnDestroy(): void {
    this.closeDropdown();
    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout);
    }
  }
}
