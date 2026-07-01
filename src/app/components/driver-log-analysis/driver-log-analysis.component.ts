import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { filter, forkJoin, map, Observable, of, switchMap, tap } from 'rxjs';
import { DateTime } from 'luxon';

import { provideNativeDateAdapter } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';

import { AppService } from '../../@services/app.service';
import {
  AdvancedScanService,
  ITenantDriverSelection,
} from '../../@services/advanced-scan.service';
import { ProgressBarService } from '../../@services/progress-bar.service';
import { NotificationService } from '../../@services/notification.service';
import { TaskQueueService } from '../../@services/task-queue.service';
import { SelectAllDirective } from '../../directive/select-all.directive';
import { DialogConfirmComponent } from '../UI/dialog-confirm/dialog-confirm.component';
import { ITenant } from '../../interfaces';
import { IDriverItem } from '../../interfaces/drivers.interface';

/**
 * Driver Log Analysis card. In `scan` mode it exposes a tenant multi-select, a
 * date range and (for a single tenant) a driver picker, then fans out a
 * multi-day analysis across the selection. `monitor` mode (a locked single
 * driver, driven from the Monitor dialog) is wired in a later slice.
 */
@Component({
  selector: 'app-driver-log-analysis',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MatButtonModule,
    MatCheckboxModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatTooltipModule,
    SelectAllDirective,
  ],
  templateUrl: './driver-log-analysis.component.html',
  styleUrl: './driver-log-analysis.component.scss',
  providers: [provideNativeDateAdapter()],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DriverLogAnalysisComponent {
  private appService = inject(AppService);
  advancedScanService = inject(AdvancedScanService);
  private progressBarService = inject(ProgressBarService);
  private notification = inject(NotificationService);
  taskQueueService = inject(TaskQueueService);
  private dialog = inject(MatDialog);

  /** `scan` (tenant/driver pickers) or `monitor` (locked single driver). */
  mode = input<'scan' | 'monitor'>('scan');

  tenants = this.appService.tenantsSignal;

  selectedTenants = new FormControl<ITenant[]>([], { nonNullable: true });
  selectedDrivers = new FormControl<IDriverItem[]>([], { nonNullable: true });

  range = new FormGroup({
    start: new FormControl<Date>(DateTime.now().toJSDate()),
    end: new FormControl<Date>(DateTime.now().toJSDate()),
  });

  driverOptions = signal<IDriverItem[]>([]);
  resolvingDrivers = signal(false);
  resolvingSelection = signal(false);

  /** The driver picker only shows when exactly one tenant is selected. */
  singleTenant = computed(() => this.selectedTenants.value.length === 1);

  compareById = (a: { id: number } | null, b: { id: number } | null) =>
    a?.id === b?.id;

  constructor() {
    // Resolve the per-tenant driver picker whenever the selection narrows to a
    // single tenant; clear it otherwise.
    this.selectedTenants.valueChanges
      .pipe(
        takeUntilDestroyed(),
        tap((tenants) => {
          if (tenants.length !== 1) {
            this.driverOptions.set([]);
            this.selectedDrivers.setValue([]);
          }
        }),
        filter((tenants) => tenants.length === 1),
        tap(() => this.resolvingDrivers.set(true)),
        switchMap((tenants) =>
          this.advancedScanService.resolveTenantDrivers$(tenants[0]),
        ),
      )
      .subscribe((res) => {
        this.driverOptions.set(res.options);
        this.selectedDrivers.setValue(
          res.options.filter((o) => res.defaultSelectedIds.includes(o.id)),
        );
        this.resolvingDrivers.set(false);
      });

    // Default to all tenants once they load.
    effect(() => {
      const tenants = this.tenants();
      if (tenants.length && !this.selectedTenants.value.length) {
        this.selectedTenants.setValue(tenants);
      }
    });
  }

  /** Queue state of the advanced-scan task, driving the action button. */
  taskState = computed<{
    status: 'idle' | 'queued' | 'processing';
    position: number;
    taskId: number | null;
  }>(() => {
    const tasks = this.taskQueueService.scan.tasks();
    const task = tasks.find(
      (t) =>
        t.key === 'advanced' &&
        (t.status === 'pending' || t.status === 'processing'),
    );
    if (!task) return { status: 'idle', position: 0, taskId: null };
    if (task.status === 'processing')
      return { status: 'processing', position: 0, taskId: task.id };
    const position =
      tasks
        .filter((t) => t.status === 'pending')
        .findIndex((t) => t.id === task.id) + 1;
    return { status: 'queued', position, taskId: task.id };
  });

  cancel(taskId: number | null) {
    taskId !== null && this.taskQueueService.scan.cancel(taskId);
  }

  /**
   * Resolve the tenant/driver selection into concrete drivers. Single-tenant
   * with a resolved picker uses the picked drivers; every other case pulls the
   * recently-active drivers per tenant (getLogs).
   */
  private resolveSelections$(): Observable<ITenantDriverSelection[]> {
    const tenants = this.selectedTenants.value;
    if (!tenants.length) return of([]);

    if (tenants.length === 1 && this.driverOptions().length) {
      const drivers = this.selectedDrivers.value.map((d) => ({
        id: d.id,
        name: d.driverDisplayName,
      }));
      return of([{ tenant: tenants[0], drivers }]);
    }

    return forkJoin(
      tenants.map((tenant) =>
        this.advancedScanService
          .resolveActiveDrivers$(tenant)
          .pipe(map((drivers) => ({ tenant, drivers }))),
      ),
    );
  }

  analyse = () => {
    const start = this.range.value.start;
    const end = this.range.value.end;
    if (!start || !end) {
      this.notification.warning('Select a valid date range.');
      return;
    }

    const dates = this.advancedScanService.buildDateRange(start, end);
    this.resolvingSelection.set(true);

    this.resolveSelections$().subscribe((selections) => {
      this.resolvingSelection.set(false);

      const totalDrivers = selections.reduce(
        (sum, sel) => sum + sel.drivers.length,
        0,
      );
      if (!totalDrivers) {
        this.notification.warning('No drivers to analyse.');
        return;
      }

      // Volume gate: estimate total daily-log calls before firing them.
      const estimate = totalDrivers * dates.length * 1.5;
      if (estimate > 1000) {
        this.dialog
          .open(DialogConfirmComponent, {
            data: {
              title: 'Large analysis',
              message: `This will analyse about ${totalDrivers} driver(s) over ${dates.length} day(s).`,
              warning: 'This may take a while and make many requests.',
            },
          })
          .afterClosed()
          .subscribe((proceed) => proceed && this.enqueue(selections, dates));
      } else {
        this.enqueue(selections, dates);
      }
    });
  };

  private enqueue(selections: ITenantDriverSelection[], dates: string[]) {
    const id = this.taskQueueService.scan.enqueue(
      'Driver Log Analysis',
      () => this.advancedScanService.runScanAnalysis$(selections, dates),
      { complete: () => this.progressBarService.initializeProgressBar() },
      { key: 'advanced', dedupe: true },
    );
    if (id === null)
      this.notification.warning('Driver Log Analysis is already in progress.');
  }
}
