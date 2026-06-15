import type { TaskDescriptionImage } from './TaskDescriptionImage';
import type { TaskPriority, TaskStatus } from '../types';

/** A unit of work tracked through the todo → doing → test → done lifecycle. */
export interface Task {
  id: string;
  projectId: string;
  title: string;
  description: string;
  descriptionImages: TaskDescriptionImage[];
  status: TaskStatus;
  priority: TaskPriority;
  tags: string[];
  /** File paths or glob patterns relevant to implementation. */
  relatedFiles: string[];
  acceptanceCriteria: string[];
  /** Total tracked time in seconds. */
  timeTracked: number;
  /** When non-null, the timer is running from this timestamp. */
  timerStartedAt: Date | null;
  externalId: string | null;
  externalProvider: string | null;
  externalUrl: string | null;
  /** Display order within the task's status column (0 = top). */
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

/** Input for creating a new task. */
export interface CreateTaskDto {
  projectId: string;
  title: string;
  description?: string;
  descriptionImages?: TaskDescriptionImage[];
  status?: TaskStatus;
  priority?: TaskPriority;
  tags?: string[];
  relatedFiles?: string[];
  acceptanceCriteria?: string[];
  externalId?: string | null;
  externalProvider?: string | null;
  externalUrl?: string | null;
}

/** Partial update payload for an existing task. */
export interface UpdateTaskDto {
  title?: string;
  description?: string;
  descriptionImages?: TaskDescriptionImage[];
  status?: TaskStatus;
  priority?: TaskPriority;
  tags?: string[];
  relatedFiles?: string[];
  acceptanceCriteria?: string[];
  timeTracked?: number;
  timerStartedAt?: Date | null;
  externalId?: string | null;
  externalProvider?: string | null;
  externalUrl?: string | null;
}

/** Filters applied when searching tasks within a project. */
export interface TaskFilters {
  statuses?: TaskStatus[];
  priorities?: TaskPriority[];
  tags?: string[];
}
