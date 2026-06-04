/** Kanban column / task workflow status. */
export type TaskStatus = 'todo' | 'doing' | 'test' | 'done';

/** Task priority level. */
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';

/** Project operating mode — determines storage and sync backend. */
export type ProjectMode = 'personal' | 'team' | 'linear' | 'github' | 'notion';

/** Git working-tree changes exposed to task context. */
export interface GitFiles {
  modified: string[];
  added: string[];
  deleted: string[];
}
