import type { CreateTaskDto } from '../../domain/models/Task';
import type { ExternalTask } from '../../domain/interfaces/ISyncProvider';
import type { TaskPriority, TaskStatus } from '../../domain/types';
import { LINEAR_PROVIDER_ID } from '../../shared/linearConfig';
import type { LinearIssue, LinearWorkflowState } from './LinearTypes';
import {
  DEFAULT_LINEAR_STATUS_NAMES,
  LINEAR_PRIORITY_MAP,
  TASK_TO_LINEAR_PRIORITY,
  type LinearProjectConfig,
} from './LinearTypes';

/** Builds bidirectional state maps from a team's workflow states. */
export function buildStateMaps(states: LinearWorkflowState[]): Pick<
  LinearProjectConfig,
  'stateToStatus' | 'statusToState'
> {
  const stateToStatus: Record<string, TaskStatus> = {};
  const statusToState = {} as Record<TaskStatus, string>;

  for (const state of states) {
    const mapped =
      DEFAULT_LINEAR_STATUS_NAMES[state.name] ??
      mapStateType(state.type);
    stateToStatus[state.id] = mapped;
    if (!statusToState[mapped]) {
      statusToState[mapped] = state.id;
    }
  }

  for (const status of ['todo', 'doing', 'test', 'done'] as TaskStatus[]) {
    if (!statusToState[status]) {
      const fallback = states.find(
        (state) =>
          (DEFAULT_LINEAR_STATUS_NAMES[state.name] ?? mapStateType(state.type)) ===
          status,
      );
      if (fallback) {
        statusToState[status] = fallback.id;
      }
    }
  }

  return { stateToStatus, statusToState };
}

function mapStateType(type: string): TaskStatus {
  switch (type) {
    case 'started':
    case 'unstarted':
      return type === 'started' ? 'doing' : 'todo';
    case 'completed':
      return 'done';
    case 'canceled':
      return 'done';
    default:
      return 'todo';
  }
}

export function mapLinearIssueToExternal(
  issue: LinearIssue,
  stateToStatus: Record<string, TaskStatus>,
): ExternalTask {
  return {
    externalId: issue.id,
    title: issue.title,
    description: issue.description ?? '',
    status: stateToStatus[issue.state.id] ?? 'todo',
    priority: LINEAR_PRIORITY_MAP[issue.priority] ?? 'medium',
    url: issue.url,
  };
}

export function mapExternalToCreateDto(
  external: ExternalTask,
  projectId: string,
): CreateTaskDto {
  return {
    projectId,
    title: external.title,
    description: external.description,
    status: external.status as TaskStatus,
    priority: external.priority as TaskPriority,
    tags: [],
    externalId: external.externalId,
    externalProvider: LINEAR_PROVIDER_ID,
    externalUrl: external.url,
  };
}

export function mapTaskPriorityToLinear(priority: TaskPriority): number {
  return TASK_TO_LINEAR_PRIORITY[priority];
}
