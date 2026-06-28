import { inject, Injectable } from '@angular/core';
import { ITenant } from '../interfaces';
import { UrlService } from './url.service';
import { DialogConfirmComponent } from '../components/UI/dialog-confirm/dialog-confirm.component';
import { MatDialog } from '@angular/material/dialog';
import { BackendService } from './backend.service';
import { NotificationService } from './notification.service';

@Injectable({
  providedIn: 'root',
})
export class CloudService {
  urlService = inject(UrlService);
  backendService = inject(BackendService);

  private notification = inject(NotificationService);
  readonly dialog = inject(MatDialog);

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
            this.notification.error('Failed to delete note', {
              action: 'Close',
              duration: 3000,
            });
            this.backendService.isDeletingNote.set(null);
          },
          complete: () => {
            this.backendService.isDeletingNote.set(null);
            // if (this.page() === 5) this.backendService.loadArchive();
            this.backendService.loadShiftReport();
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
        this.notification.error('Failed to move note to archive', {
          action: 'Close',
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
}
