import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  Input,
  WritableSignal,
} from '@angular/core';
import { Subscription } from 'rxjs';

import { MatCardModule } from '@angular/material/card';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatButtonModule } from '@angular/material/button';

import { ProgressBarService } from '../../@services/progress-bar.service';
import { TScanMode } from '../../types';
import { IScanErrors } from '../../interfaces';

@Component({
  selector: 'app-progress-bar',
  imports: [MatCardModule, MatProgressBarModule, MatButtonModule],
  templateUrl: './progress-bar.component.html',
  styleUrl: './progress-bar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProgressBarComponent {
  @Input({ required: true }) scanSubscription!: Subscription;
  @Input({ required: true }) scanMode: TScanMode = 'violations';
  @Input() certifyLogs?: boolean;

  private progressBarService = inject(ProgressBarService);

  scanning = this.progressBarService.scanning;

  errors!: WritableSignal<IScanErrors[]>;

  value = this.progressBarService.progressValue;
  bufferValue = this.progressBarService.bufferValue;
  progressMode = this.progressBarService.progressMode;
  constant = this.progressBarService.constant;
  currentCompany = this.progressBarService.currentCompany;
  currentDriver = this.progressBarService.currentDriver;
  totalCount = computed(() =>
    this.progressBarService[
      this.scanMode === 'violations'
        ? 'totalVCount'
        : this.scanMode === 'dot'
          ? 'totalDCount'
          : 'preViolationsCount'
    ](),
  );
  preVCount = this.progressBarService.preViolationsCount;
  lowCCount = this.progressBarService.cycleHoursCount;

  activeDriversCount = this.progressBarService.activeDriversCount;
  adminPortalDisconnectedCount =
    this.progressBarService.adminPortalDisconnectedCount;
  adminPortalUnpluggedCount = this.progressBarService.adminPortalUnpluggedCount;

  constructor() {}

  ngOnInit() {
    switch (this.scanMode) {
      case 'violations':
        this.errors = this.progressBarService.vErrors;
        break;
      case 'pre':
        this.errors = this.progressBarService.pErrors;
        break;
      case 'dot':
        this.errors = this.progressBarService.dErrors;
        break;
      case 'advanced':
        this.errors = this.progressBarService.aErrors;
        break;
      case 'cert':
        this.errors = this.progressBarService.cErrors;
        break;
      case 'admin':
        this.errors = this.progressBarService.adminErrors;
        break;

      default:
        this.errors = this.progressBarService.aErrors;
        break;
    }
  }

  stopScan() {
    this.progressBarService.initializeProgressBar();
    this.scanSubscription.unsubscribe();
  }
}
