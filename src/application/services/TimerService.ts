import type { ITaskRepository } from '../../domain/interfaces/ITaskRepository';
import type { Task } from '../../domain/models/Task';

/**
 * Manages per-task timers persisted via timer_started_at in SQLite.
 */
export class TimerService {
  constructor(private readonly taskRepository: ITaskRepository) {}

  /** Starts the timer for a task. */
  startTimer(taskId: string): Task {
    return this.taskRepository.startTimer(taskId);
  }

  /** Stops the timer and accumulates elapsed seconds. */
  stopTimer(taskId: string): Task {
    return this.taskRepository.stopTimer(taskId);
  }

  /**
   * Returns total elapsed seconds including any running timer segment.
   */
  getElapsedTime(task: Task): number {
    if (!task.timerStartedAt) {
      return task.timeTracked;
    }

    const runningSeconds = Math.max(
      0,
      Math.floor((Date.now() - task.timerStartedAt.getTime()) / 1000),
    );

    return task.timeTracked + runningSeconds;
  }

  /**
   * Formats seconds as a human-readable duration, e.g. "2h 34m".
   */
  formatTime(seconds: number): string {
    const safeSeconds = Math.max(0, seconds);
    const hours = Math.floor(safeSeconds / 3600);
    const minutes = Math.floor((safeSeconds % 3600) / 60);

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }

    return `${minutes}m`;
  }

  /** Returns the task with an active timer, if any. */
  getActiveTimerTask(): Task | null {
    return (
      this.taskRepository
        .findAll()
        .find((task) => task.timerStartedAt !== null) ?? null
    );
  }

  /**
   * Re-attaches to a timer left running before an extension restart.
   * Returns the active task if one exists in the database.
   */
  resumeActiveTimer(): Task | null {
    return this.getActiveTimerTask();
  }
}
