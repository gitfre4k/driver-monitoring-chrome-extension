import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  HostListener,
  inject,
  signal,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { TaskQueueService } from '../../@services/task-queue.service';
import { MatBadgeModule } from '@angular/material/badge';
import { NgTemplateOutlet } from '@angular/common';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-task-queue',
  imports: [
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
  private elementRef = inject(ElementRef);

  readonly opened = signal(false);

  /** Close the panel when a click lands outside this component. */
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (
      this.opened() &&
      !this.elementRef.nativeElement.contains(event.target as Node)
    ) {
      this.opened.set(false);
    }
  }

  monitorTasks = this.taskQueueService.monitor.tasks;
  scanTasks = this.taskQueueService.scan.tasks;

  totalCount = computed(
    () => this.monitorTasks().length + this.scanTasks().length,
  );

  toggle() {
    this.opened.update((value) => !value);
  }
}
