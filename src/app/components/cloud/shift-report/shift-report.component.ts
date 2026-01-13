import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  Input,
  signal,
} from '@angular/core';
import { IData, IDataDriverNotes } from '../../../interfaces/cloud.interface';
import { getNote } from '../../../helpers/backend.helpers';
import { formatTenantName } from '../../../helpers/monitor.helpers';
import { DialogAddNoteComponent } from '../../UI/dialog-add-note/dialog-add-note.component';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { isEmpty, resultCount, sortData } from '../../../helpers/cloud.helpers';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatButtonModule } from '@angular/material/button';
import { MatBadgeModule } from '@angular/material/badge';
import { DatePipe, KeyValuePipe } from '@angular/common';
import { CloudService } from '../../../@services/cloud.service';
import { DateService } from '../../../@services/date.service';
import { DateAgoPipe } from '../../../pipes/date-ago.pipe';
import { BackendService } from '../../../@services/backend.service';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-shift-report',
  imports: [
    MatButtonModule,
    MatBadgeModule,
    MatIconModule,
    KeyValuePipe,
    DatePipe,
    DateAgoPipe,
    MatProgressSpinnerModule,
  ],
  templateUrl: './shift-report.component.html',
  styleUrl: './shift-report.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShiftReportComponent {
  @Input() notes: IData | undefined;
  @Input() customNotes: IDataDriverNotes | undefined;

  cloudService = inject(CloudService);
  backendService = inject(BackendService);
  dateService = inject(DateService);

  private _snackBar = inject(MatSnackBar);
  readonly dialog = inject(MatDialog);

  sortedNotes = computed(() => {
    return sortData(this.notes);
  });

  formatTenantName = formatTenantName;
  sortData = sortData;
  isEmpty = isEmpty;
  resultCount = resultCount;
  getNote = getNote;

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
    if (!this.notes) return;

    const data = sortData(this.notes);
    const customNotes = this.customNotes;

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
}
