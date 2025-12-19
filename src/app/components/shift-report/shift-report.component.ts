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
import { DateAgoPipe } from '../../pipes/date-ago.pipe';
import {
  getNote,
  parseDOTInspection,
  parseMalf,
  sortArrayByPart,
} from '../../helpers/backend.helpers';

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
    DateAgoPipe,
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
  };
  page = signal(0);
  state = computed(() => {
    const page = this.page();
    const backendData = this.backendService.backendData();

    const data = backendData?.[page];
    const name = this.pages[page];

    const customNotes = backendData?.customNotes;

    return { name, data, customNotes };
  });

  sortArrayByPart = sortArrayByPart;
  getNote = getNote;
  parseDOTInspection = parseDOTInspection;
  parseMalf = parseMalf;

  constructor() {}

  ngOnInit(): void {
    this.backendService.loadShiftReport();
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
        this.backendService.loadShiftReport();
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

  handlePageEvent(event: PageEvent) {
    this.page.set(event.pageIndex);
  }

  isEmpty(obj: any): boolean {
    return Object.keys(obj).length === 0;
  }
}
