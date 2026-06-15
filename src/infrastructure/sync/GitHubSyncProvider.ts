import type { CreateTaskDto, Task } from '../../domain/models/Task';
import type {
  ExternalTask,
  ISyncProvider,
} from '../../domain/interfaces/ISyncProvider';
import type { TaskStatus } from '../../domain/types';
import {
  GITHUB_LABEL_DOING,
  GITHUB_LABEL_TEST,
  GITHUB_PROVIDER_ID,
} from '../../shared/githubConfig';
import type { GitHubApiClient } from '../github/GitHubApiClient';
import type { GitHubProjectConfig } from '../github/GitHubTypes';
import {
  isPullRequestExternalId,
  mapExternalToCreateDto,
  mapGitHubIssueToExternal,
  mapGitHubPrToExternal,
  mapTaskStatusToLabels,
} from '../github/githubMappers';

/**
 * {@link ISyncProvider} for GitHub Issues (two-way via labels).
 */
export class GitHubSyncProvider implements ISyncProvider {
  readonly id = GITHUB_PROVIDER_ID;
  readonly name = 'GitHub';

  constructor(
    private readonly api: GitHubApiClient,
    private readonly getConfig: (projectId: string) => GitHubProjectConfig | null,
  ) {}

  isConfigured(): boolean {
    return Boolean(this.api.getToken());
  }

  async pullTasks(projectId: string): Promise<ExternalTask[]> {
    const config = this.requireConfig(projectId);
    const externals: ExternalTask[] = [];

    if (config.syncModes.includes('issues')) {
      const issues = await this.api.listIssues(config.owner, config.repo);
      externals.push(...issues.map(mapGitHubIssueToExternal));
    }

    if (config.syncModes.includes('prs')) {
      const pulls = await this.api.listPullRequests(config.owner, config.repo);
      externals.push(...pulls.map(mapGitHubPrToExternal));
    }

    return externals;
  }

  async pushTask(task: Task): Promise<string> {
    if (isPullRequestExternalId(task.externalId ?? '')) {
      throw new Error('Pull requests are read-only in MKSFlow');
    }

    const config = this.requireConfig(task.projectId);
    const labels = [
      ...task.tags.filter((tag) => !tag.startsWith('mksflow:')),
      ...mapTaskStatusToLabels(task.status),
    ];

    const body = formatIssueBody(task);
    const created = await this.api.createIssue(config.owner, config.repo, {
      title: task.title,
      body,
      labels,
    });

    if (task.status === 'done') {
      await this.api.updateIssue(config.owner, config.repo, created.number, {
        state: 'closed',
      });
    }

    return created.number.toString();
  }

  async updateTask(task: Task): Promise<void> {
    if (!task.externalId) {
      throw new Error('Cannot update GitHub issue without externalId');
    }

    if (isPullRequestExternalId(task.externalId)) {
      return;
    }

    const config = this.requireConfig(task.projectId);
    const number = Number.parseInt(task.externalId, 10);
    const body = formatIssueBody(task);

    await this.api.updateIssue(config.owner, config.repo, number, {
      title: task.title,
      body,
      state: task.status === 'done' ? 'closed' : 'open',
    });

    for (const label of [GITHUB_LABEL_DOING, GITHUB_LABEL_TEST]) {
      try {
        await this.api.removeLabel(config.owner, config.repo, number, label);
      } catch {
        // Label may not exist on the issue
      }
    }
    await this.api.addLabels(
      config.owner,
      config.repo,
      number,
      mapTaskStatusToLabels(task.status),
    );
  }

  async deleteTask(externalId: string): Promise<void> {
    if (isPullRequestExternalId(externalId)) {
      return;
    }
    // Remote close is handled by GitHubSyncService.deleteRemoteTask with project context.
  }

  mapToTask(_external: ExternalTask): CreateTaskDto {
    throw new Error('Use mapToTaskForProject with projectId');
  }

  mapToTaskForProject(
    external: ExternalTask,
    projectId: string,
    tags: string[] = [],
  ): CreateTaskDto {
    return mapExternalToCreateDto(external, projectId, tags);
  }

  async addPrComment(
    projectId: string,
    externalId: string,
    comment: string,
  ): Promise<void> {
    const config = this.requireConfig(projectId);
    const number = Number.parseInt(externalId.replace(/^pr-/, ''), 10);
    await this.api.addIssueComment(config.owner, config.repo, number, comment);
  }

  private requireConfig(projectId: string): GitHubProjectConfig {
    const config = this.getConfig(projectId);
    if (!config) {
      throw new Error(`Project ${projectId} is not linked to GitHub`);
    }
    return config;
  }
}

function formatIssueBody(task: Task): string {
  const criteria =
    task.acceptanceCriteria.length > 0
      ? task.acceptanceCriteria.map((item) => `- ${item}`).join('\n')
      : '- None';

  return `${task.description}\n\n---\n**Acceptance Criteria:**\n${criteria}`;
}

export function statusFromExternal(status: string): TaskStatus {
  return status as TaskStatus;
}
