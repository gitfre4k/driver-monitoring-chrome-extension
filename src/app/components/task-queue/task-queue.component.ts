import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  ViewChild,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSidenav, MatSidenavModule } from '@angular/material/sidenav';
import { TaskQueueService } from '../../@services/task-queue.service';
import { MatBadgeModule } from '@angular/material/badge';
import { NgTemplateOutlet } from '@angular/common';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-task-queue',
  imports: [
    MatSidenavModule,
    MatButtonModule,
    MatIconModule,
    MatBadgeModule,
    NgTemplateOutlet,
    MatProgressSpinnerModule,
    MatTooltipModule,
  ],
  templateUrl: './task-queue.component.html',
  styleUrl: './task-queue.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaskQueueComponent {
  taskQueueService = inject(TaskQueueService);
  @ViewChild('rightSidenav', { static: true }) sidenav!: MatSidenav;

  monitorTasks = this.taskQueueService.monitor.tasks;
  scanTasks = this.taskQueueService.scan.tasks;

  totalCount = computed(
    () => this.monitorTasks().length + this.scanTasks().length,
  );

  ngOnInit(): void {
    this.taskQueueService.setSidenav(this.sidenav);
  }
}
