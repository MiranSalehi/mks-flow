import type { CreateTaskDto, Task } from '../models/Task';

/** Task representation from an external system before local mapping. */
export interface ExternalTask {
  externalId: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  url: string;
}

/**
 * Two-way sync adapter for Linear, GitHub, Notion, etc.
 * Implementations are added in Phases 3–5 — not wired in Phase 1.
 */
export interface ISyncProvider {
  id: string;
  name: string;
  /** Returns whether credentials and config are present. */
  isConfigured(): boolean;
  /** Pulls remote tasks for the given local project. */
  pullTasks(projectId: string): Promise<ExternalTask[]>;
  /** Creates a remote task and returns its external identifier. */
  pushTask(task: Task): Promise<string>;
  /** Updates an existing remote task. */
  updateTask(task: Task): Promise<void>;
  /** Deletes a remote task by external identifier. */
  deleteTask(externalId: string): Promise<void>;
  /** Maps a remote task into a local create DTO. */
  mapToTask(external: ExternalTask): CreateTaskDto;
}
