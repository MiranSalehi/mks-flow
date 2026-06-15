import type { TaskPriority, TaskStatus } from '../../domain/types';

export interface LinearWorkflowState {
  id: string;
  name: string;
  type: string;
}

export interface LinearProject {
  id: string;
  name: string;
}

export interface LinearTeam {
  id: string;
  name: string;
  states: { nodes: LinearWorkflowState[] };
  projects: { nodes: LinearProject[] };
}

export interface LinearIssue {
  id: string;
  title: string;
  description: string | null;
  state: { id: string; name: string };
  priority: number;
  url: string;
  labels: { nodes: { name: string }[] };
  updatedAt: string;
  project?: { id: string } | null;
}

export interface LinearViewer {
  id: string;
  name: string;
  organization: { name: string };
}

/** Per-local-project Linear linkage stored in extension globalState. */
export interface LinearProjectConfig {
  linearTeamId: string;
  linearTeamName: string;
  linearProjectId: string | null;
  linearProjectName: string | null;
  /** Linear workflow state id → MKSFlow status. */
  stateToStatus: Record<string, TaskStatus>;
  /** MKSFlow status → Linear workflow state id. */
  statusToState: Record<TaskStatus, string>;
  lastSyncAt: string | null;
}

export interface SyncResult {
  pulled: number;
  pushed: number;
  conflicts: number;
  errors: string[];
}

export interface LinearTeamOption {
  id: string;
  name: string;
  states: LinearWorkflowState[];
  projects: LinearProject[];
}

/** Default name-based status mapping before user customization. */
export const DEFAULT_LINEAR_STATUS_NAMES: Record<string, TaskStatus> = {
  Backlog: 'todo',
  Todo: 'todo',
  'To Do': 'todo',
  'In Progress': 'doing',
  Doing: 'doing',
  Started: 'doing',
  'In Review': 'test',
  Review: 'test',
  Test: 'test',
  QA: 'test',
  Done: 'done',
  Completed: 'done',
  Cancelled: 'done',
  Canceled: 'done',
};

export const TASK_TO_LINEAR_PRIORITY: Record<TaskPriority, number> = {
  critical: 1,
  high: 2,
  medium: 3,
  low: 4,
};

export const LINEAR_PRIORITY_MAP: Record<number, TaskPriority> = {
  0: 'low',
  1: 'critical',
  2: 'high',
  3: 'medium',
  4: 'low',
};
