import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  signal,
  WritableSignal,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { ProgressBarService } from '../../@services/progress-bar.service';
import { ScanService } from '../../@services/scan.service';
import { IScanErrors } from '../../interfaces';
import { TScanMode } from '../../types';

interface IErrorGroup {
  title: string;
  mode: TScanMode;
  errors: WritableSignal<IScanErrors[]>;
}

/**
 * Shared formatted scan-error list. Groups errors by scan type (each group has
 * a title + Clear button, and a Retry button when the mode supports replaying
 * only the failed requests). Individual rows expand/collapse to reveal the full
 * error message. Used both on the Scan progress view (`scrollable`) and the
 * Scan Results page (not scrollable).
 */
@Component({
  selector: 'app-scan-error-list',
  imports: [MatButtonModule, MatIconModule],
  templateUrl: './scan-error-list.component.html',
  styleUrl: './scan-error-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ScanErrorListComponent {
  private progressBarService = inject(ProgressBarService);
  scanService = inject(ScanService);

  /** Wrap the groups in a max-height scroll container (Scan progress view). */
  scrollable = input(false);

  private readonly allGroups: IErrorGroup[] = [
    {
      title: 'Violations Scan',
      mode: 'violations',
      errors: this.progressBarService.vErrors,
    },
    {
      title: 'Pre-Violation Scan',
      mode: 'pre',
      errors: this.progressBarService.pErrors,
    },
    {
      title: 'DOT Inspections Scan',
      mode: 'dot',
      errors: this.progressBarService.dErrors,
    },
    {
      title: 'Driver Log Analysis',
      mode: 'advanced',
      errors: this.progressBarService.aErrors,
    },
    {
      title: 'Driver Certifications',
      mode: 'cert',
      errors: this.progressBarService.cErrors,
    },
    {
      title: 'Unidentified Events',
      mode: 'deleteUE',
      errors: this.progressBarService.unEvErrors,
    },
    {
      title: 'Admin Portal',
      mode: 'admin',
      errors: this.progressBarService.adminErrors,
    },
  ];

  /** Only the groups that currently hold errors. */
  groups = computed(() => this.allGroups.filter((g) => g.errors().length > 0));

  /** Identifier (`<mode>:<index>`) of the single currently expanded row, if
   *  any. Only one row is open at a time across all groups. */
  private expandedRowId = signal<string | null>(null);

  rowId(mode: TScanMode, index: number) {
    return `${mode}:${index}`;
  }

  isExpanded(mode: TScanMode, index: number) {
    return this.expandedRowId() === this.rowId(mode, index);
  }

  toggle(mode: TScanMode, index: number) {
    const id = this.rowId(mode, index);
    this.expandedRowId.update((prev) => (prev === id ? null : id));
  }

  canRetry(mode: TScanMode) {
    return this.scanService.canRetry(mode);
  }

  /** Batch retry — re-run every failed request for the group. */
  retry(mode: TScanMode) {
    this.scanService.retryFailed(mode);
  }

  /** Single-row retry — re-run just this failed request. */
  retryOne(mode: TScanMode, err: IScanErrors, event: MouseEvent) {
    event.stopPropagation();
    this.scanService.retryOne(mode, err);
  }

  clear(group: IErrorGroup) {
    group.errors.set([]);
  }
}
