import { Component, inject, ViewChild } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSidenav, MatSidenavModule } from '@angular/material/sidenav';
import { TaskQueueService } from '../../@services/task-queue.service';

@Component({
  selector: 'app-task-queue',
  imports: [MatSidenavModule, MatButtonModule, MatIconModule],
  templateUrl: './task-queue.component.html',
  styleUrl: './task-queue.component.scss',
})
export class TaskQueueComponent {
  taskQueueService = inject(TaskQueueService);
  @ViewChild('rightSidenav', { static: true }) sidenav!: MatSidenav;

  showFiller = false;

  ngOnInit(): void {
    this.taskQueueService.setSidenav(this.sidenav);
  }
}
