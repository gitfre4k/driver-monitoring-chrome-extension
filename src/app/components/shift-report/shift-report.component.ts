import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { BackendService } from '../../@services/backend.service';
import { DatePipe, KeyValuePipe } from '@angular/common';
import { ITenant } from '../../interfaces';
import { DateService } from '../../@services/date.service';
import { UrlService } from '../../@services/url.service';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog } from '@angular/material/dialog';
import { DialogAddNoteComponent } from '../UI/dialog-add-note/dialog-add-note.component';
import { AppService } from '../../@services/app.service';
import { formatTenantName } from '../../helpers/monitor.helpers';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import {
  MAT_EXPANSION_PANEL_DEFAULT_OPTIONS,
  MatAccordion,
  MatExpansionModule,
} from '@angular/material/expansion';
import {
  getNote,
  parseDOTInspection,
  parseMalf,
  sortArrayByPart,
} from '../../helpers/backend.helpers';
import { MatBadgeModule } from '@angular/material/badge';
import {
  IData,
  IDataDriver,
  IDataDriverNotes,
} from '../../interfaces/shift-report.interface';
import { DialogConfirmComponent } from '../UI/dialog-confirm/dialog-confirm.component';
import { DateAgoPipe } from '../../pipes/date-ago.pipe';

@Component({
  selector: 'app-shift-report',
  imports: [
    KeyValuePipe,
    MatIconModule,
    MatTooltipModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    KeyValuePipe,
    MatPaginatorModule,
    DatePipe,
    MatAccordion,
    MatExpansionModule,
    MatBadgeModule,
    DateAgoPipe,
  ],
  providers: [
    {
      provide: MAT_EXPANSION_PANEL_DEFAULT_OPTIONS,
      useValue: {
        collapsedHeight: '28px',
        expandedHeight: '36px',
      },
    },
  ],
  templateUrl: './shift-report.component.html',
  styleUrl: './shift-report.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShiftReportComponent {
  backendService = inject(BackendService);
  dateService = inject(DateService);
  urlService = inject(UrlService);
  appService = inject(AppService);
  private _snackBar = inject(MatSnackBar);

  readonly dialog = inject(MatDialog);

  formatTenantName = formatTenantName;

  pages: { [id: number]: string } = {
    0: 'Shift Report',
    1: 'Problems',
    2: 'FMCSA Inspections',
    3: 'Malfunction Letters',
    4: 'Marker Notes',
    5: 'Archived Notes',
  };
  page = signal(0);
  state = computed(() => {
    const page = this.page();
    const backendData = this.backendService.backendData();
    const archiveData = this.backendService.archiveData();

    const isArchive = page === 5;

    const data = isArchive ? archiveData?.[0] : backendData?.[page];
    const name = this.pages[page];
    const customNotes = isArchive
      ? archiveData?.customNotes
      : backendData?.customNotes;

    const sortedData = this.sortData(data);

    const sortedDataByTime: [
      tenant: { id: string; name: string; stamp: string },
      note: IDataDriverNotes,
      driver?: {
        name: string;
        id: number;
      },
    ][] = [];
    for (let stamp in customNotes) {
      sortedDataByTime.push([
        { id: '#customNote', name: '***', stamp },
        { [stamp]: customNotes[stamp] },
      ]);
    }

    sortedData.forEach(([key, value]) => {
      const tenantId = key;
      const tenantName = value.name;
      const companyNotes = value.companyNotes;

      for (let stamp in companyNotes) {
        sortedDataByTime.push([
          { id: tenantId, name: tenantName, stamp },
          { [stamp]: companyNotes[stamp] },
        ]);
      }

      for (let driverId in value.drivers) {
        const driver = value.drivers[driverId];
        for (let stamp in driver.notes) {
          +driverId !== 999 &&
            sortedDataByTime.push([
              { id: tenantId, name: tenantName, stamp },
              { [stamp]: driver.notes[stamp] },
              { name: driver.name, id: Number(driverId) },
            ]);
        }
      }
    });

    sortedDataByTime.sort(
      (a, b) => new Date(b[0].stamp).getTime() - new Date(a[0].stamp).getTime(),
    );

    return {
      name,
      customNotes,
      sortedData,
      sortedDataByTime,
    };
  });

  isMultiMode = false;
  isSortedByTime = false;

  handleExpandAll(accordion: any) {
    this.isMultiMode = true;
    setTimeout(() => {
      accordion.openAll();
      this.isMultiMode = false;
    });
  }

  sortArrayByPart = sortArrayByPart;
  getNote = getNote;
  parseDOTInspection = parseDOTInspection;
  parseMalf = parseMalf;

  constructor() {}

  toggleSorting() {
    this.isSortedByTime = !this.isSortedByTime;
  }

  sortData(data: IData | undefined) {
    const sortedData: [
      key: string,
      data: {
        name: string;
        drivers: IDataDriver;
        companyNotes: IDataDriverNotes;
      },
    ][] = [];
    if (data) {
      for (let key in data) {
        sortedData.push([key, data[key]]);
      }

      sortedData.sort((a, b) => a[1].name.localeCompare(b[1].name));
    }
    return sortedData;
  }

  ngOnInit(): void {
    this.backendService.loadShiftReport();
    this.backendService.loadArchive();
  }

  ngOnDestroy(): void {
    if (this.backendService.dataSubscription) {
      this.backendService.dataSubscription.unsubscribe();
    }
  }

  openLogs(id: number, date: string, tenant: ITenant, openLogs?: boolean) {
    openLogs
      ? this.urlService.navigateChromeActiveTab(
          `https://app.monitoringdriver.com/logs/${id}/`,
          tenant,
          true,
        )
      : this.urlService.navigateChromeActiveTab(
          `https://app.monitoringdriver.com/logs/${id}/${date}/`,
          tenant,
        );
  }

  deleteNote(
    value: { note: string; part: number; eventId: number }[],
    key: string,
  ) {
    const dialogRef = this.dialog.open(DialogConfirmComponent, {
      width: '250px',
      data: {
        title: 'Delete Note',
        info: `Are you sure you want to proceed?`,
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.backendService.isDeletingNote.set(key);
        const idsToDelete = value.map((note) => note.eventId);

        this.backendService.deleteNote(idsToDelete).subscribe({
          error: () => {
            this._snackBar.open('Failed to delete note', 'Close', {
              duration: 3000,
            });
            this.backendService.isDeletingNote.set(null);
          },
          complete: () => {
            this.backendService.isDeletingNote.set(null);
            if (this.page() === 5) this.backendService.loadArchive();
            else this.backendService.loadShiftReport();
          },
        });
      }
    });
  }

  archiveNote(
    value: { note: string; part: number; eventId: number }[],
    key: string,
  ) {
    this.backendService.isDeletingNote.set(key);
    const idsToArchive = value.map((note) => note.eventId);

    this.backendService.archiveNote(idsToArchive).subscribe({
      error: () => {
        this._snackBar.open('Failed to move note to archive', 'Close', {
          duration: 3000,
        });
        this.backendService.isDeletingNote.set(null);
      },
      complete: () => {
        this.backendService.isDeletingNote.set(null);
        this.backendService.loadShiftReport();
        this.backendService.loadArchive();
      },
    });
  }

  addCustomNote() {
    const title = 'add Custom Note';
    const eventTypeCode = 'IntermediateLogReducedLocationPrecision';
    const tenant = { name: 'custom', id: 0 };

    return this.dialog.open(DialogAddNoteComponent, {
      data: {
        tenant,
        driver: null,
        eventTypeCode,
        title,
      },
    });
  }

  generateShiftReport() {
    if (this.page() !== 0) return;

    const data = this.state().sortedData;
    const customNotes = this.state().customNotes;

    const reportParts: string[] = [];

    if (customNotes) {
      reportParts.push(`***`);
      for (let key in customNotes) {
        const note = getNote(customNotes[key]);
        reportParts.push(`
${' '}> ${note}`);
      }
      reportParts.push(`

`);
    }

    data.forEach((tenant) => {
      const company = tenant[1];
      const { name, companyNotes, drivers } = company;

      reportParts.push(`## ${formatTenantName(name)}`);

      for (let key in companyNotes) {
        const note = getNote(companyNotes[key]);
        reportParts.push(`
* ${note}`);
      }

      for (let id in drivers) {
        const driver = drivers[id];
        id !== '999' &&
          reportParts.push(`
${driver.name}`);
        const driverNotes = driver.notes;

        for (let key in driverNotes) {
          const note = getNote(driverNotes[key]);
          id !== '999' &&
            reportParts.push(`
${' '}> ${note}`);
        }
      }
      reportParts.push(`

`);
    });

    const report = reportParts.join('');

    navigator.clipboard.writeText(report);
    this._snackBar.open(`Sift Report copied to clipboard`, 'OK', {
      duration: 2000,
    });
  }

  handlePageEvent(event: PageEvent) {
    this.page.set(event.pageIndex);
  }

  isEmpty(obj: any): boolean {
    return Object.keys(obj).length === 0;
  }

  resultCount(result: {
    name: string;
    drivers: IDataDriver;
    companyNotes: IDataDriverNotes;
  }) {
    let count = 0;
    for (let note in result.companyNotes) count++;
    for (let driver in result.drivers) {
      for (let note in result.drivers[driver].notes) {
        count++;
      }
    }
    return count;
  }
}
