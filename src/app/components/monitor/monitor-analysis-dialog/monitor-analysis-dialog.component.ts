import {
  ChangeDetectionStrategy,
  Component,
  Inject,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { concatMap, from, Observable, tap } from 'rxjs';
import { DateTime } from 'luxon';

import { provideNativeDateAdapter } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDatepickerModule } from '@angular/material/datepicker';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';

import { AdvancedScanService } from '../../../@services/advanced-scan.service';
import { SmartFixService } from '../../../@services/smart-fix.service';
import { TaskQueueService } from '../../../@services/task-queue.service';
import { NotificationService } from '../../../@services/notification.service';
import { ProgressBarService } from '../../../@services/progress-bar.service';
import { ExtensionTabNavigationService } from '../../../@services/extension-tab-navigation.service';
import { ITenant } from '../../../interfaces';
import { ISmartFixResponse } from '../../../interfaces/api.interface';

export interface IMonitorAnalysisDialogData {
  driver: { id: number; name: string };
  tenant: ITenant;
  homeTerminalTimeZone?: string;
}

interface IPipelinePhase {
  label: string;
  run: () => Observable<unknown>;
}

/**
 * Monitor-mode Driver Log Analysis dialog. Locked to the driver in view, it runs
 * an optional 3-phase pipeline over a date range (default 8 days):
 * remove-engines → smart fix → analysis. The denominator adapts to the phases
 * actually selected; smart fix aborts the run (no analysis) on any error.
 */
@Component({
  selector: 'app-monitor-analysis-dialog',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MatButtonModule,
    MatCheckboxModule,
    MatDatepickerModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
  ],
  templateUrl: './monitor-analysis-dialog.component.html',
  styleUrl: './monitor-analysis-dialog.component.scss',
  providers: [provideNativeDateAdapter()],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MonitorAnalysisDialogComponent {
  private advancedScanService = inject(AdvancedScanService);
  private smartFixService = inject(SmartFixService);
  private taskQueueService = inject(TaskQueueService);
  private notification = inject(NotificationService);
  private progressBarService = inject(ProgressBarService);
  private extTabNav = inject(ExtensionTabNavigationService);

  // Default range: 8 days (today + 7 prior).
  range = new FormGroup({
    start: new FormControl<Date>(DateTime.now().minus({ days: 7 }).toJSDate()),
    end: new FormControl<Date>(DateTime.now().toJSDate()),
  });

  removeEngines = signal(true);
  smartFix = signal(true);

  constructor(
    public dialogRef: MatDialogRef<MonitorAnalysisDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: IMonitorAnalysisDialogData,
  ) {}

  run() {
    const start = this.range.value.start;
    const end = this.range.value.end;
    if (!start || !end) {
      this.notification.warning('Select a valid date range.');
      return;
    }

    const dates = this.advancedScanService.buildDateRange(start, end);
    const { driver, tenant } = this.data;
    const rangeStartISO = DateTime.fromJSDate(start)
      .startOf('day')
      .toUTC()
      .toISO()!;
    const rangeEndISO = DateTime.fromJSDate(end).toUTC().toISO()!;

    const phases: IPipelinePhase[] = [];

    if (this.removeEngines()) {
      phases.push({
        label: 'removing engine events during driving',
        run: () =>
          this.advancedScanService.removeEnginesOverRange$(
            driver.id,
            driver.name,
            tenant,
            dates,
          ),
      });
    }

    if (this.smartFix()) {
      phases.push({
        label: 'smart fix',
        run: () =>
          this.smartFixService
            .smartFixOverRange(tenant.id, driver.id, rangeStartISO, rangeEndISO)
            .pipe(
              tap((res: ISmartFixResponse[]) => {
                // Abort before analysis if any returned item carries an error.
                const failing = (res ?? []).filter((item) => item?.errorMessage);
                if (failing.length) {
                  const details = failing
                    .map(
                      (f) => `${f.eventName} @ ${f.eventTime}: ${f.errorMessage}`,
                    )
                    .join('; ');
                  throw new Error(details);
                }
              }),
            ),
      });
    }

    phases.push({
      label: `(${dates.length} days) driver log analysis`,
      run: () => {
        // Engines already removed in phase 1 (if selected); don't re-delete.
        this.advancedScanService.removeEngineDuringDriving.set(false);
        return this.advancedScanService.runMonitorAnalysis$(
          driver.id,
          driver.name,
          tenant,
          dates,
        );
      },
    });

    const total = phases.length;
    let taskId: number | null = null;

    const work = () =>
      from(phases).pipe(
        concatMap((phase, index) => {
          taskId !== null &&
            this.taskQueueService.monitor.update(taskId, {
              phase: `${index + 1}/${total} ${phase.label}`,
            });
          return phase.run();
        }),
      );

    taskId = this.taskQueueService.monitor.enqueue(
      'Driver Log Analysis',
      work,
      {
        error: (err: unknown) =>
          this.notification.error(
            `Smart Fix aborted the analysis: ${
              err instanceof Error ? err.message : String(err)
            }`,
            { duration: 6000 },
          ),
        complete: () => {
          this.progressBarService.initializeProgressBar();
          this.extTabNav.selectedTabIndex.set(1);
        },
      },
      { key: 'monitorAnalysis', dedupe: true },
    );

    if (taskId === null)
      this.notification.warning('Driver Log Analysis is already in progress.');

    this.dialogRef.close();
  }
}
