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

  /* 图片点击 → 放大 / 复位 */
  @HostListener('click')
  toggleZoom(): void {
    this.zoomed ? this.reset() : this.zoomIn();
  }

  // ────────── helper methods ──────────

  private zoomIn(): void {
    const img  = this.el.nativeElement;
    const rect = img.getBoundingClientRect();

    /* 1️⃣ 锁定当前渲染宽高，防止 naturalWidth 失控 */
    this.rd.setStyle(img, 'width',  `${rect.width}px`);
    this.rd.setStyle(img, 'height', `${rect.height}px`);

    /* 2️⃣ 计算缩放比例，使放大后宽度 == 视口宽度 */
    const scale = window.innerWidth / rect.width;

    /* 3️⃣ 创建灰色遮罩并锁定滚动 */
    this.backdropEl = this.rd.createElement('div');
    this.rd.addClass(this.backdropEl, 'zoom-backdrop');
    this.rd.setStyle(this.backdropEl, 'pointer-events', 'auto');
    this.backdropEl?.addEventListener('click', () => this.reset(), { once: true });
    this.rd.appendChild(document.body, this.backdropEl);
    this.rd.setStyle(document.body, 'overflow', 'hidden');

    /* 4️⃣ 固定定位 + 居中 + 放大 */
    this.rd.setStyle(img, 'position', 'fixed');
    this.rd.setStyle(img, 'top', '50%');
    this.rd.setStyle(img, 'left', '50%');
    this.rd.setStyle(img, 'transform-origin', 'center center');
    this.rd.setStyle(img, 'transform', `translate(-50%, -50%) scale(${scale})`);
    this.rd.setStyle(img, 'z-index', '10');
    this.rd.setStyle(img, 'cursor', 'zoom-out');

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

    this.zoomed = false;
  }
}
