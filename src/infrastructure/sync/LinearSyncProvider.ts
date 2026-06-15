import type { CreateTaskDto, Task } from '../../domain/models/Task';
import type {
  ExternalTask,
  ISyncProvider,
} from '../../domain/interfaces/ISyncProvider';
import type { TaskStatus } from '../../domain/types';
import { LINEAR_PROVIDER_ID } from '../../shared/linearConfig';
import type { LinearApiClient } from '../linear/LinearApiClient';
import type { LinearProjectConfig } from '../linear/LinearTypes';
import {
  mapExternalToCreateDto,
  mapLinearIssueToExternal,
  mapTaskPriorityToLinear,
} from '../linear/linearMappers';

/**
 * {@link ISyncProvider} implementation backed by the Linear GraphQL API.
 */
export class LinearSyncProvider implements ISyncProvider {
  readonly id = LINEAR_PROVIDER_ID;
  readonly name = 'Linear';

  constructor(
    private readonly api: LinearApiClient,
    private readonly getConfig: (projectId: string) => LinearProjectConfig | null,
  ) {}

  isConfigured(): boolean {
    return Boolean(this.api.getApiKey());
  }

  async pullTasks(projectId: string): Promise<ExternalTask[]> {
    const config = this.requireConfig(projectId);
    const issues = await this.api.listIssues(
      config.linearTeamId,
      config.linearProjectId,
    );

    return issues.map((issue) =>
      mapLinearIssueToExternal(issue, config.stateToStatus),
    );
  }

  async pushTask(task: Task): Promise<string> {
    const config = this.requireConfig(task.projectId);
    const stateId = config.statusToState[task.status];
    if (!stateId) {
      throw new Error(`No Linear state mapped for status "${task.status}"`);
    }

    const created = await this.api.createIssue({
      teamId: config.linearTeamId,
      title: task.title,
      description: task.description,
      stateId,
      priority: mapTaskPriorityToLinear(task.priority),
      projectId: config.linearProjectId,
    });

    return created.id;
  }

  async updateTask(task: Task): Promise<void> {
    if (!task.externalId) {
      throw new Error('Cannot update Linear issue without externalId');
    }

    const config = this.requireConfig(task.projectId);
    const stateId = config.statusToState[task.status];
    if (!stateId) {
      throw new Error(`No Linear state mapped for status "${task.status}"`);
    }

    await this.api.updateIssue({
      id: task.externalId,
      title: task.title,
      description: task.description,
      stateId,
      priority: mapTaskPriorityToLinear(task.priority),
    });
  }

  async deleteTask(externalId: string): Promise<void> {
    await this.api.deleteIssue(externalId);
  }

  mapToTask(_external: ExternalTask): CreateTaskDto {
    throw new Error(
      'mapToTask requires projectId — use mapToTaskForProject instead',
    );
  }

  mapToTaskForProject(
    external: ExternalTask,
    projectId: string,
  ): CreateTaskDto {
    return mapExternalToCreateDto(external, projectId);
  }

  /** Resolves the Linear issue URL after creation. */
  async getIssueUrl(issueId: string, projectId: string): Promise<string> {
    const issues = await this.pullTasks(projectId);
    const match = issues.find((issue) => issue.externalId === issueId);
    return match?.url ?? `https://linear.app/issue/${issueId}`;
  }

  private requireConfig(projectId: string): LinearProjectConfig {
    const config = this.getConfig(projectId);
    if (!config) {
      throw new Error(`Project ${projectId} is not linked to Linear`);
    }
    return config;
  }
}

export function statusFromExternal(
  status: string,
): TaskStatus {
  return status as TaskStatus;
}
