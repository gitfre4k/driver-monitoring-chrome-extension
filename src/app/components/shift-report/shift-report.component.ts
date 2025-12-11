import { Component, computed, inject, signal } from '@angular/core';
import { BackendService } from '../../@services/backend.service';
import { KeyValuePipe } from '@angular/common';
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
import { IDriverFmcsaInspection } from '../../interfaces/driver-daily-log-events.interface';
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
    DateAgoPipe,
  ],
  templateUrl: './shift-report.component.html',
  styleUrl: './shift-report.component.scss',
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
    3: 'Info Notes',
    4: 'Marker Notes',
  };
  page = signal(0);
  state = computed(() => {
    const page = this.page();
    const data = this.backendService.backendData()?.[page];
    const name = this.pages[page];

    return { name, data };
  });

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

  addNote() {
    const dialogRef = this.dialog.open(DialogAddNoteComponent);

    dialogRef.afterClosed().subscribe((result) => {
      if (result !== undefined) {
        this.backendService.loadShiftReport();
      }
    });
  }

  sortArrayByPart(array: { note: string; part: number; eventId: number }[]) {
    return array.sort((a, b) => a.part - b.part);
  }

  parseDOTInspection(array: { note: string; part: number; eventId: number }[]) {
    const rawDOT = this.sortArrayByPart(array);
    let message = '';

    rawDOT.forEach((part) => (message += part.note));

    return JSON.parse(message) as IDriverFmcsaInspection;
  }

  handlePageEvent(event: PageEvent) {
    this.page.set(event.pageIndex);
  }
}
