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

  /** Identifiers (`<mode>:<index>`) of the currently expanded error rows. */
  private expanded = signal<Set<string>>(new Set());

  rowId(mode: TScanMode, index: number) {
    return `${mode}:${index}`;
  }

  isExpanded(mode: TScanMode, index: number) {
    return this.expanded().has(this.rowId(mode, index));
  }

  toggle(mode: TScanMode, index: number) {
    const id = this.rowId(mode, index);
    this.expanded.update((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  canRetry(mode: TScanMode) {
    return this.scanService.canRetry(mode);
  }

  retry(mode: TScanMode) {
    this.scanService.retryFailed(mode);
  }

  clear(group: IErrorGroup) {
    group.errors.set([]);
  }
}
