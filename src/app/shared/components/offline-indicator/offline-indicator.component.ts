import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { OfflineService } from '../../services/offline.service';

@Component({
  selector: 'app-offline-indicator',
  template: `
    <div 
      class="offline-indicator" 
      [class.online]="isOnline"
      [class.offline]="!isOnline"
      [class.visible]="!isOnline"
    >
      <div class="indicator-content">
        <span class="status-icon">📡</span>
        <span class="status-text">You're offline</span>
        <span class="status-description">Some features may be limited</span>
      </div>
    </div>
  `,
  styles: [`
    .offline-indicator {
      position: fixed;
      top: 60px;
      left: 50%;
      transform: translateX(-50%);
      background: #ff9800;
      color: white;
      padding: 8px 16px;
      border-radius: 20px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 1000;
      opacity: 0;
      visibility: hidden;
      transition: all 0.3s ease;
      font-size: 0.875rem;
    }

    .offline-indicator.visible {
      opacity: 1;
      visibility: visible;
    }

    .indicator-content {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .status-icon {
      font-size: 1rem;
    }

    .status-text {
      font-weight: 500;
    }

    .status-description {
      font-size: 0.75rem;
      opacity: 0.9;
    }

    @media (max-width: 768px) {
      .offline-indicator {
        top: 50px;
        left: 16px;
        right: 16px;
        transform: none;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OfflineIndicatorComponent implements OnInit, OnDestroy {
  isOnline = true;
  private destroy$ = new Subject<void>();

  constructor(
    private offlineService: OfflineService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.offlineService.isOnline$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(isOnline => {
      this.isOnline = isOnline;
      this.cdr.markForCheck();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}