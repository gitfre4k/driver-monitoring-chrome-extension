import { Injectable, signal } from '@angular/core';
import { MatSidenav } from '@angular/material/sidenav';
import { catchError, concatMap, EMPTY, Observable, Subject, tap } from 'rxjs';
import { DateTime } from 'luxon';

export type TTaskStatus = 'pending' | 'processing' | 'complete' | 'error';

export interface ITask {
  id: number;
  name: string;
  status: TTaskStatus;
  time: string;
}

interface ITaskHandlers {
  next?: (value: unknown) => void;
  error?: (err: unknown) => void;
  complete?: () => void;
}

interface IQueueItem {
  id: number;
  work: () => Observable<unknown>;
  handlers?: ITaskHandlers;
}

/** How long a settled (complete/error) task stays visible before it is removed. */
const DONE_REMOVAL_DELAY = 5000;

/**
 * A single serialized task queue. Operations are added to the end and run one
 * at a time; each task exposes its state (pending | processing | complete |
 * error) through the `tasks` signal.
 */
export class TaskQueue {
  readonly tasks = signal<ITask[]>([]);

  private taskId = 0;
  private readonly queue$ = new Subject<IQueueItem>();

  constructor() {
    this.queue$
      .pipe(
        // concatMap guarantees the next task only starts once the previous one
        // has settled — i.e. every operation "waits for its turn".
        concatMap((item) => {
          this.setStatus(item.id, 'processing');
          return item.work().pipe(
            tap({
              next: (value) => item.handlers?.next?.(value),
              error: (err) => {
                this.setStatus(item.id, 'error');
                item.handlers?.error?.(err);
              },
              complete: () => {
                this.setStatus(item.id, 'complete');
                item.handlers?.complete?.();
              },
            }),
            // Swallow the error so a failed task does not tear down the queue.
            catchError(() => EMPTY),
          );
        }),
      )
      .subscribe();
  }

  /**
   * Adds an operation to the end of the queue. `work` is a factory so the
   * underlying observable is only created when the task reaches the front.
   */
  enqueue(
    name: string,
    work: () => Observable<unknown>,
    handlers?: ITaskHandlers,
  ): number {
    const id = ++this.taskId;
    this.tasks.update((prev) => [
      ...prev,
      { id, name, status: 'pending', time: DateTime.now().toFormat('HH:mm') },
    ]);
    this.queue$.next({ id, work, handlers });
    return id;
  }

  private setStatus(id: number, status: TTaskStatus) {
    this.tasks.update((prev) =>
      prev.map((task) => (task.id === id ? { ...task, status } : task)),
    );

    if (status === 'complete' || status === 'error') {
      setTimeout(
        () =>
          this.tasks.update((prev) => prev.filter((task) => task.id !== id)),
        DONE_REMOVAL_DELAY,
      );
    }
  }
}

@Injectable({
  providedIn: 'root',
})
export class TaskQueueService {
  /** Monitor write-operations (add PTI, zip, smart fix, resize, ...). */
  readonly monitor = new TaskQueue();
  /** Multi-tenant scan operations (violations, DOT, advanced, cert, ...). */
  readonly scan = new TaskQueue();

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
    return this.sidenav.toggle();
  }
}
