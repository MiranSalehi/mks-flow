import type { Project } from '../../domain/models/Project';
import type { Task } from '../../domain/models/Task';
import type { TaskDescriptionImage } from '../../domain/models/TaskDescriptionImage';
import type { TaskLog } from '../../domain/models/TaskLog';
import type {
  ProjectMode,
  TaskPriority,
  TaskStatus,
} from '../../domain/types';

/** SQLite row shape for the projects table. */
export interface ProjectRow {
  id: string;
  name: string;
  description: string;
  mode: string;
  color: string;
  created_at: string;
  updated_at: string;
}

/** SQLite row shape for the tasks table. */
export interface TaskRow {
  id: string;
  project_id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  tags: string;
  related_files: string;
  acceptance_criteria: string;
  time_tracked: number;
  timer_started_at: string | null;
  external_id: string | null;
  external_provider: string | null;
  external_url: string | null;
  description_images: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

/** SQLite row shape for the task_logs table. */
export interface TaskLogRow {
  id: string;
  task_id: string;
  from_status: string | null;
  to_status: string;
  message: string;
  created_at: string;
}

const TASK_STATUSES: TaskStatus[] = ['todo', 'doing', 'test', 'done'];
const TASK_PRIORITIES: TaskPriority[] = ['low', 'medium', 'high', 'critical'];
const PROJECT_MODES: ProjectMode[] = [
  'personal',
  'team',
  'linear',
  'github',
  'notion',
];

/** Serializes a string array to JSON for SQLite storage. */
export function serializeStringArray(values: string[]): string {
  return JSON.stringify(values);
}

/** Parses description_images JSON into domain objects. */
export function parseDescriptionImages(
  value: string | null | undefined,
): TaskDescriptionImage[] {
  if (!value) {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
      .map((item) => ({
        id: String(item.id ?? ''),
        fileName: String(item.fileName ?? ''),
        mimeType: String(item.mimeType ?? 'image/png'),
        relativePath: String(item.relativePath ?? '').replace(/\\/g, '/'),
      }))
      .filter((item) => item.id && item.relativePath);
  } catch {
    return [];
  }
}

/** Serializes description images for SQLite storage. */
export function serializeDescriptionImages(
  images: TaskDescriptionImage[],
): string {
  return JSON.stringify(images);
}

/** Parses a JSON string column into a string array. */
export function parseStringArray(value: string | null | undefined): string[] {
  if (!value) {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((item): item is string => typeof item === 'string');
  } catch {
    return [];
  }
}

/** Converts an ISO date string from SQLite into a Date. */
export function parseDate(value: string): Date {
  return new Date(value);
}

/** Converts a Date to an ISO-8601 string for SQLite storage. */
export function toIsoString(date: Date): string {
  return date.toISOString();
}

/** Maps a projects table row to a domain Project. */
export function mapProjectRow(row: ProjectRow): Project {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    mode: assertProjectMode(row.mode),
    color: row.color,
    createdAt: parseDate(row.created_at),
    updatedAt: parseDate(row.updated_at),
  };
}

/** Maps a tasks table row to a domain Task. */
export function mapTaskRow(row: TaskRow): Task {
  return {
    id: row.id,
    projectId: row.project_id,
    title: row.title,
    description: row.description,
    status: assertTaskStatus(row.status),
    priority: assertTaskPriority(row.priority),
    tags: parseStringArray(row.tags),
    relatedFiles: parseStringArray(row.related_files),
    acceptanceCriteria: parseStringArray(row.acceptance_criteria),
    descriptionImages: parseDescriptionImages(row.description_images),
    timeTracked: row.time_tracked,
    timerStartedAt: row.timer_started_at
      ? parseDate(row.timer_started_at)
      : null,
    externalId: row.external_id,
    externalProvider: row.external_provider,
    externalUrl: row.external_url,
    sortOrder: row.sort_order ?? 0,
    createdAt: parseDate(row.created_at),
    updatedAt: parseDate(row.updated_at),
  };
}

/** Maps a task_logs table row to a domain TaskLog. */
export function mapTaskLogRow(row: TaskLogRow): TaskLog {
  return {
    id: row.id,
    taskId: row.task_id,
    fromStatus: row.from_status ? assertTaskStatus(row.from_status) : null,
    toStatus: assertTaskStatus(row.to_status),
    message: row.message,
    createdAt: parseDate(row.created_at),
  };
}

function assertTaskStatus(value: string): TaskStatus {
  if (TASK_STATUSES.includes(value as TaskStatus)) {
    return value as TaskStatus;
  }

  return 'todo';
}

function assertTaskPriority(value: string): TaskPriority {
  if (TASK_PRIORITIES.includes(value as TaskPriority)) {
    return value as TaskPriority;
  }

  return 'medium';
}

function assertProjectMode(value: string): ProjectMode {
  if (PROJECT_MODES.includes(value as ProjectMode)) {
    return value as ProjectMode;
  }

  return 'personal';
}
