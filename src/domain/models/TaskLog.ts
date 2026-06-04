import type { TaskStatus } from '../types';

/** Audit entry for a task status transition or sync event. */
export interface TaskLog {
  id: string;
  taskId: string;
  fromStatus: TaskStatus | null;
  toStatus: TaskStatus;
  message: string;
  createdAt: Date;
}

/** Input for recording a new task log entry. */
export interface CreateTaskLogDto {
  taskId: string;
  fromStatus: TaskStatus | null;
  toStatus: TaskStatus;
  message?: string;
}
