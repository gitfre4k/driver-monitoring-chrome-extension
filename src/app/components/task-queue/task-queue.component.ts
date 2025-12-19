import {
  ChangeDetectionStrategy,
  Component,
  inject,
  ViewChild,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSidenav, MatSidenavModule } from '@angular/material/sidenav';
import { TaskQueueService } from '../../@services/task-queue.service';
import { DateTime } from 'luxon';
import { MatBadgeModule } from '@angular/material/badge';
import { KeyValuePipe } from '@angular/common';
import { IZipTask } from '../../interfaces/zip.interface';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-task-queue',
  imports: [
    MatSidenavModule,
    MatButtonModule,
    MatIconModule,
    MatBadgeModule,
    KeyValuePipe,
    MatProgressSpinnerModule,
  ],
  templateUrl: './task-queue.component.html',
  styleUrl: './task-queue.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaskQueueComponent {
  taskQueueService = inject(TaskQueueService);
  @ViewChild('rightSidenav', { static: true }) sidenav!: MatSidenav;

  showFiller = false;

  DateTime = DateTime;

  ngOnInit(): void {
    this.taskQueueService.setSidenav(this.sidenav);
  }

  taskCount(tasks: { [id: number]: IZipTask }) {
    let count = 0;
    for (let key in tasks) {
      count++;
    }
    return count;
  }
}
