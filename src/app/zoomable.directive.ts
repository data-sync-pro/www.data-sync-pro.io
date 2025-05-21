import { Directive, ElementRef, Renderer2, HostListener } from '@angular/core';

@Directive({
  selector: 'img\\:not(\\[noZoom])'
})
export class ZoomableDirective {
  private backdropEl?: HTMLElement;
  private zoomed = false;

  constructor(
    private el: ElementRef<HTMLImageElement>,
    private rd: Renderer2
  ) {}

  @HostListener('click')
  toggleZoom(): void {
    this.zoomed ? this.reset() : this.zoomIn();
  }

  private zoomIn(): void {
    const img  = this.el.nativeElement;
    const rect = img.getBoundingClientRect();
    this.rd.setStyle(img, 'width',  `${rect.width}px`);
    this.rd.setStyle(img, 'height', `${rect.height}px`);

    const scale = window.innerWidth / rect.width;

    this.backdropEl = this.rd.createElement('div');
    this.rd.addClass(this.backdropEl, 'zoom-backdrop');
    this.rd.setStyle(this.backdropEl, 'pointer-events', 'auto');
    this.backdropEl?.addEventListener('click', () => this.reset(), { once: true });
    this.rd.appendChild(document.body, this.backdropEl);
    this.rd.setStyle(document.body, 'overflow', 'hidden');

    this.rd.setStyle(img, 'position', 'fixed');
    this.rd.setStyle(img, 'top', '50%');
    this.rd.setStyle(img, 'left', '50%');
    this.rd.setStyle(img, 'transform-origin', 'center center');
    this.rd.setStyle(img, 'transform', `translate(-50%, -50%) scale(${scale})`);
    this.rd.setStyle(img, 'z-index', '10');
    this.rd.setStyle(img, 'cursor', 'zoom-out');
    window.dispatchEvent(new Event('zoomStart')); 
    this.zoomed = true;
  }

  private reset(): void {
    const img = this.el.nativeElement;

    [
      'position', 'top', 'left', 'width', 'height',
      'transform', 'transition', 'z-index', 'cursor'
    ].forEach(s => this.rd.removeStyle(img, s));

    if (this.backdropEl) {
      this.rd.removeChild(document.body, this.backdropEl);
      this.backdropEl = undefined;
    }
    this.rd.removeStyle(document.body, 'overflow');
    window.dispatchEvent(new Event('zoomEnd'));
    this.zoomed = false;
  }
}
