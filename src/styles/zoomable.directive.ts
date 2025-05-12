import { Directive, ElementRef, Renderer2, HostListener } from '@angular/core';

@Directive({
  selector: 'img\\:not(\\[noZoom])'
})
export class ZoomableDirective {
  private readonly scales = [1.8, 3];
  private backdropEl?: HTMLElement;
  private state = 0;
  private tx = 0;
  private ty = 0;
  private startX = 0;
  private startY = 0;
  private startTx = 0;
  private startTy = 0;
  private dragging = false;
  private unlockedParents: HTMLElement[] = [];

  constructor(
    private el: ElementRef<HTMLImageElement>,
    private rd: Renderer2
  ) {}

  @HostListener('contextmenu', ['$event'])
  onContextMenu(ev: MouseEvent) {
    ev.preventDefault();
    return false;
  }

  @HostListener('click', ['$event'])
  onLeftClick(ev: MouseEvent) {
    if (ev.button !== 0) return;
    if (this.state < this.scales.length) {
      this.zoomIn(ev, this.scales[this.state]);
      this.state++;
    } else {
      this.reset();
      this.state = 0;
    }
  }

  @HostListener('pointerdown', ['$event'])
  onPointerDown(ev: PointerEvent) {
    if (ev.button !== 2 || this.state === 0) return;
    this.dragging = true;
    this.startX = ev.clientX;
    this.startY = ev.clientY;
    this.startTx = this.tx;
    this.startTy = this.ty;
    this.el.nativeElement.setPointerCapture(ev.pointerId);
  }

  @HostListener('pointermove', ['$event'])
  onPointerMove(ev: PointerEvent) {
    if (!this.dragging) return;
    this.tx = this.startTx + (ev.clientX - this.startX);
    this.ty = this.startTy + (ev.clientY - this.startY);
    this.applyTransform();
  }

  @HostListener('pointerup', ['$event'])
  @HostListener('pointercancel', ['$event'])
  onPointerUp(ev: PointerEvent) {
    if (!this.dragging || ev.button !== 2) return;
    this.dragging = false;
    this.el.nativeElement.releasePointerCapture(ev.pointerId);
  }

  private zoomIn(ev: MouseEvent, scale: number) {
    let p: HTMLElement | null = this.el.nativeElement.parentElement;
    while (p && p !== document.body) {
      if (getComputedStyle(p).overflow !== 'visible') {
        this.unlockedParents.push(p);
        this.rd.setStyle(p, 'overflow', 'visible');
      }
      p = p.parentElement;
    }

    if (!this.backdropEl) {
      this.backdropEl = this.rd.createElement('div');
      this.rd.addClass(this.backdropEl, 'zoom-backdrop');
      this.rd.appendChild(document.body, this.backdropEl);
      this.rd.setStyle(document.body, 'overflow', 'hidden');
    }

    const img = this.el.nativeElement;
    const rect = img.getBoundingClientRect();
    const cxPct = ((ev.clientX - rect.left) / rect.width) * 100;
    const cyPct = ((ev.clientY - rect.top) / rect.height) * 100;

    this.tx = 0;
    this.ty = 0;
    this.rd.setStyle(img, 'transform-origin', `${cxPct}% ${cyPct}%`);
    this.rd.setStyle(img, 'transition', 'transform .3s ease');
    this.applyTransform(scale);
    this.rd.setStyle(img, 'box-shadow', '0 4px 20px rgba(0,0,0,.4)');
    this.rd.setStyle(img, 'position', 'relative');
    this.rd.setStyle(img, 'z-index', 10);
    const cursor =
      this.state < this.scales.length - 1 ? 'zoom-in' : 'zoom-out';
    this.rd.setStyle(img, 'cursor', cursor);
  }

  private reset() {
    this.unlockedParents.forEach(n => this.rd.removeStyle(n, 'overflow'));
    this.unlockedParents.length = 0;

    if (this.backdropEl) {
      this.rd.removeChild(document.body, this.backdropEl);
      this.backdropEl = undefined;
      this.rd.removeStyle(document.body, 'overflow');
    }

    const img = this.el.nativeElement;
    [
      'transform',
      'transform-origin',
      'box-shadow',
      'position',
      'z-index',
      'cursor',
      'transition'
    ].forEach(p => this.rd.removeStyle(img, p));

    this.tx = 0;
    this.ty = 0;
  }

  private applyTransform(scaleOverride?: number) {
    const scale = scaleOverride ?? this.scales[this.state - 1];
    this.rd.setStyle(
      this.el.nativeElement,
      'transform',
      `translate(${this.tx}px, ${this.ty}px) scale(${scale})`
    );
  }
}
