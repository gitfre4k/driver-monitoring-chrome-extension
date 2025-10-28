import { Injectable, signal } from '@angular/core';
import { MatSidenav } from '@angular/material/sidenav';
import { IZipTask } from '../interfaces/zip.interface';

@Injectable({
  providedIn: 'root',
})
export class TaskQueueService {
  currentTasks = signal<{ name: string; status: string }[]>([]);

  zipTasks = signal<{ [id: number]: IZipTask }>({});

  private sidenav!: MatSidenav;

  public setSidenav(sidenav: MatSidenav) {
    this.sidenav = sidenav;
  }

  public open() {
    return this.sidenav.open();
  }

  public close() {
    return this.sidenav.close();
  }

  public toggle() {
    console.log(this.sidenav);
    return this.sidenav.toggle();
  }

  addPendingTask(taskName: string) {
    this.currentTasks.update((prevValue) => {
      const newValue = [...prevValue];
      newValue.push({ name: taskName, status: 'pending' });
      return newValue;
    });
  }
}
