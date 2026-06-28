import { Injectable, signal } from '@angular/core';
import { catchError, concatMap, EMPTY, Observable, Subject, tap } from 'rxjs';
import { DateTime } from 'luxon';

export type TTaskStatus =
  | 'pending'
  | 'processing'
  | 'complete'
  | 'error'
  | 'cancelled';

export interface ITask {
  id: number;
  name: string;
  status: TTaskStatus;
  time: string;
  /** Optional de-duplication key — see `enqueue` options. */
  key?: string;
  /** Coarse progress within the task, e.g. `"2/3 Shifting"`. */
  phase?: string;
  /** Fine-grained progress inside the current phase, e.g. `"shift 4/7"`. */
  subtask?: string;
  /** When set, the task can be stopped mid-flight — invoked by `cancel(id)`. */
  cancel?: () => void;
}

interface ITaskHandlers {
  next?: (value: unknown) => void;
  error?: (err: unknown) => void;
  complete?: () => void;
}

interface ITaskOptions {
  /** Logical identity of the task (e.g. a scan mode). */
  key?: string;
  /** When true, skip enqueuing if a task with the same `key` is already
   *  pending or processing. */
  dedupe?: boolean;
  /** Cancellation hook. When provided the task shows a stop button; clicking it
   *  (or calling `cancel(id)`) runs this and marks the task `cancelled`. */
  cancel?: () => void;
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
          // Task was cancelled while still pending — skip its work entirely.
          const task = this.tasks().find((t) => t.id === item.id);
          if (!task || task.status === 'cancelled') return EMPTY;

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
   *
   * When `options.dedupe` is set, a task whose `options.key` matches an existing
   * pending/processing task is not enqueued — the existing task's id is returned
   * instead (or `null` when nothing was queued and there is no live match).
   */
  enqueue(
    name: string,
    work: () => Observable<unknown>,
    handlers?: ITaskHandlers,
    options?: ITaskOptions,
  ): number | null {
    const key = options?.key;

    if (options?.dedupe && key) {
      const existing = this.tasks().find(
        (t) =>
          t.key === key &&
          (t.status === 'pending' || t.status === 'processing'),
      );
      if (existing) return null;
    }

    const id = ++this.taskId;
    this.tasks.update((prev) => [
      ...prev,
      {
        id,
        name,
        status: 'pending',
        time: DateTime.now().toFormat('HH:mm'),
        key,
        cancel: options?.cancel,
      },
    ]);
    this.queue$.next({ id, work, handlers });
    return id;
  }

  /** Patch arbitrary fields of a task in place (e.g. live `phase`/`subtask`). */
  update(id: number, patch: Partial<ITask>) {
    this.tasks.update((prev) =>
      prev.map((task) => (task.id === id ? { ...task, ...patch } : task)),
    );
  }

  /**
   * Stops a task: marks it `cancelled` and runs its `cancel` hook (which
   * unsubscribes the in-flight work). The cancelled state is terminal, so the
   * work's own completion handler will not overwrite it.
   */
  cancel(id: number) {
    const task = this.tasks().find((t) => t.id === id);
    if (
      !task ||
      task.status === 'complete' ||
      task.status === 'error' ||
      task.status === 'cancelled'
    ) {
      return;
    }
    // Mark cancelled first so the work's complete handler is a no-op.
    this.setStatus(id, 'cancelled');
    task.cancel?.();
  }

  private setStatus(id: number, status: TTaskStatus) {
    this.tasks.update((prev) =>
      prev.map((task) => {
        if (task.id !== id) return task;
        // `cancelled` is terminal — don't let a late completion overwrite it.
        if (task.status === 'cancelled') return task;
        return { ...task, status };
      }),
    );

    if (status === 'complete' || status === 'error' || status === 'cancelled') {
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
}
