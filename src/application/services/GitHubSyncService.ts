import * as vscode from 'vscode';
import type { IProjectRepository } from '../../domain/interfaces/IProjectRepository';
import type { ITaskRepository } from '../../domain/interfaces/ITaskRepository';
import type { Task } from '../../domain/models/Task';
import type { TaskStatus } from '../../domain/types';
import {
  GITHUB_PROVIDER_ID,
} from '../../shared/githubConfig';
import type { GitHubApiClient } from '../../infrastructure/github/GitHubApiClient';
import { GitHubApiError } from '../../infrastructure/github/GitHubApiError';
import {
  filterUserTags,
  isPullRequestExternalId,
} from '../../infrastructure/github/githubMappers';
import type {
  GitHubProjectConfig,
  GitHubProjectOption,
  GitHubRepoOption,
  GitHubSyncMode,
  SyncResult,
} from '../../infrastructure/github/GitHubTypes';
import { GitHubSyncProvider } from '../../infrastructure/sync/GitHubSyncProvider';
import type { GitHubAuthService } from './GitHubAuthService';
import type { GitHubConfigService } from './GitHubConfigService';

type SyncListener = () => void;
type StatusListener = (state: {
  status: 'idle' | 'syncing' | 'error';
  message?: string;
  lastSyncAt: string | null;
}) => void;

const DEFAULT_COLUMN_MAP: Record<string, TaskStatus> = {
  Todo: 'todo',
  'In Progress': 'doing',
  'In review': 'test',
  Review: 'test',
  Done: 'done',
};

/**
 * Orchestrates two-way sync between local tasks and GitHub.
 */
export class GitHubSyncService {
  private readonly provider: GitHubSyncProvider;
  private readonly syncTimers = new Map<string, ReturnType<typeof setInterval>>();
  private readonly itemIdByIssue = new Map<string, string>();
  private syncListeners: SyncListener[] = [];
  private statusListeners: StatusListener[] = [];
  private globalLastSyncAt: string | null = null;
  private globalStatus: 'idle' | 'syncing' | 'error' = 'idle';
  private globalMessage: string | undefined;

  constructor(
    private readonly auth: GitHubAuthService,
    private readonly config: GitHubConfigService,
    private readonly api: GitHubApiClient,
    private readonly taskRepository: ITaskRepository,
    private readonly projectRepository: IProjectRepository,
  ) {
    this.provider = new GitHubSyncProvider(api, (projectId) =>
      this.config.getConfig(projectId),
    );
  }

  onSyncComplete(listener: SyncListener): vscode.Disposable {
    this.syncListeners.push(listener);
    return {
      dispose: () => {
        this.syncListeners = this.syncListeners.filter((l) => l !== listener);
      },
    };
  }

  onStatusChanged(listener: StatusListener): vscode.Disposable {
    this.statusListeners.push(listener);
    return {
      dispose: () => {
        this.statusListeners = this.statusListeners.filter((l) => l !== listener);
      },
    };
  }

  getStatus() {
    return {
      status: this.globalStatus,
      message: this.globalMessage,
      lastSyncAt: this.globalLastSyncAt,
    };
  }

  isProjectLinked(projectId: string): boolean {
    return this.config.isLinked(projectId);
  }

  getProjectConfig(projectId: string): GitHubProjectConfig | null {
    return this.config.getConfig(projectId);
  }

  async getRepositories(): Promise<GitHubRepoOption[]> {
    await this.auth.loadStoredToken();
    const repos = await this.api.listAllRepos();
    return repos.map((repo) => ({
      id: repo.id,
      name: repo.name,
      fullName: repo.full_name,
      owner: repo.owner.login,
      private: repo.private,
    }));
  }

  async getProjects(): Promise<GitHubProjectOption[]> {
    await this.auth.loadStoredToken();
    const user = await this.api.getUser();
    const projects = await this.api.listProjectsV2(user.login);
    return projects.map((project) => {
      const statusField = project.fields.nodes.find(
        (field) => field.name.toLowerCase() === 'status',
      );
      return {
        id: project.id,
        title: project.title,
        statusFieldId: statusField?.id ?? null,
        columns:
          statusField?.options?.map((option) => ({
            id: option.id,
            name: option.name,
          })) ?? [],
      };
    });
  }

  async linkProject(
    projectId: string,
    repo: { owner: string; name: string; fullName: string },
    syncModes: GitHubSyncMode[],
    ghProject: GitHubProjectOption | null,
  ): Promise<SyncResult> {
    const project = this.projectRepository.findById(projectId);
    if (!project) {
      throw new Error(`Project not found: ${projectId}`);
    }

    const columnToStatus: Record<string, TaskStatus> = {};
    const statusToColumn = {} as Record<TaskStatus, string>;

    if (ghProject) {
      for (const column of ghProject.columns) {
        const mapped =
          DEFAULT_COLUMN_MAP[column.name] ??
          DEFAULT_COLUMN_MAP[column.name.toLowerCase()] ??
          'todo';
        columnToStatus[column.name] = mapped;
        if (!statusToColumn[mapped]) {
          statusToColumn[mapped] = column.id;
        }
      }
    }

    const linkage: GitHubProjectConfig = {
      owner: repo.owner,
      repo: repo.name,
      repoFullName: repo.fullName,
      syncModes,
      ghProjectId: ghProject?.id ?? null,
      ghProjectTitle: ghProject?.title ?? null,
      statusFieldId: ghProject?.statusFieldId ?? null,
      columnToStatus,
      statusToColumn,
      lastSyncAt: null,
    };

    await this.config.saveConfig(projectId, linkage);
    this.projectRepository.update(projectId, { mode: 'github' });

    const result = await this.syncProject(projectId);
    this.startAutoSync(projectId);
    return result;
  }

  async unlinkProject(projectId: string): Promise<void> {
    this.stopAutoSync(projectId);
    const tasks = this.taskRepository.findByProjectId(projectId);
    for (const task of tasks) {
      if (task.externalProvider === GITHUB_PROVIDER_ID) {
        this.taskRepository.delete(task.id);
      }
    }
    await this.config.removeConfig(projectId);
    this.projectRepository.update(projectId, { mode: 'personal' });
    this.notifySyncComplete();
  }

  async syncProject(projectId: string): Promise<SyncResult> {
    if (!this.config.isLinked(projectId)) {
      return { pulled: 0, pushed: 0, conflicts: 0, errors: ['Not linked'] };
    }

    await this.auth.loadStoredToken();
    this.setStatus('syncing');

    const result: SyncResult = {
      pulled: 0,
      pushed: 0,
      conflicts: 0,
      errors: [],
    };

    try {
      const projectConfig = this.config.getConfig(projectId)!;
      const lastSyncAt = projectConfig.lastSyncAt
        ? new Date(projectConfig.lastSyncAt).getTime()
        : 0;

      const externalTasks = await this.provider.pullTasks(projectId);
      const localTasks = this.taskRepository.findByProjectId(projectId);
      const localByExternal = new Map(
        localTasks
          .filter((task) => task.externalProvider === GITHUB_PROVIDER_ID)
          .map((task) => [task.externalId!, task]),
      );

      if (projectConfig.syncModes.includes('board') && projectConfig.ghProjectId) {
        const boardItems = await this.api.listProjectItems(projectConfig.ghProjectId);
        for (const item of boardItems) {
          if (!item.issueNumber) {
            continue;
          }
          this.itemIdByIssue.set(
            `${projectId}:${item.issueNumber}`,
            item.itemId,
          );
        }
      }

      for (const external of externalTasks) {
        const existing = localByExternal.get(external.externalId);
        const githubUpdated = await this.getGitHubUpdatedAt(
          external.externalId,
          projectConfig,
        );

        if (!existing) {
          const tags = isPullRequestExternalId(external.externalId)
            ? ['github-pr']
            : [];
          const dto = this.provider.mapToTaskForProject(
            external,
            projectId,
            tags,
          );
          this.taskRepository.create(dto);
          result.pulled += 1;
          continue;
        }

        const localUpdated = existing.updatedAt.getTime();
        const remoteNewer = githubUpdated > localUpdated;
        const bothChanged =
          githubUpdated > lastSyncAt && localUpdated > lastSyncAt;

        if (bothChanged) {
          result.conflicts += 1;
          this.taskRepository.logTransition(
            existing.id,
            existing.status,
            existing.status,
            'Sync conflict resolved: GitHub version used',
          );
        }

        if (remoteNewer || bothChanged) {
          this.taskRepository.update(existing.id, {
            title: external.title,
            description: external.description,
            status: external.status as Task['status'],
            priority: external.priority as Task['priority'],
            externalUrl: external.url,
          });
          result.pulled += 1;
        }
      }

      for (const task of localTasks) {
        if (isPullRequestExternalId(task.externalId ?? '')) {
          continue;
        }

        if (task.externalProvider === GITHUB_PROVIDER_ID && task.externalId) {
          if (task.updatedAt.getTime() > lastSyncAt) {
            try {
              await this.provider.updateTask(task);
              await this.syncBoardColumn(task, projectConfig);
              result.pushed += 1;
            } catch (error) {
              result.errors.push(formatError(error));
            }
          }
          continue;
        }

        if (!task.externalId) {
          try {
            const externalId = await this.provider.pushTask(task);
            const issues = await this.api.listIssues(
              projectConfig.owner,
              projectConfig.repo,
            );
            const match = issues.find(
              (issue) => issue.number.toString() === externalId,
            );
            this.taskRepository.update(task.id, {
              externalId,
              externalProvider: GITHUB_PROVIDER_ID,
              externalUrl: match?.html_url ?? '',
              tags: filterUserTags(task.tags),
            });
            result.pushed += 1;
          } catch (error) {
            result.errors.push(formatError(error));
          }
        }
      }

      const now = new Date().toISOString();
      await this.config.updateLastSync(projectId, now);
      this.globalLastSyncAt = now;
      this.setStatus('idle');
      this.notifySyncComplete();
      return result;
    } catch (error) {
      const message = formatError(error);
      result.errors.push(message);
      this.setStatus('error', message);
      if (error instanceof GitHubApiError && error.isUnauthorized()) {
        await this.auth.disconnect();
      }
      return result;
    }
  }

  async pushTask(task: Task): Promise<void> {
    if (!this.config.isLinked(task.projectId)) {
      return;
    }

    if (isPullRequestExternalId(task.externalId ?? '')) {
      return;
    }

    await this.auth.loadStoredToken();

    if (task.externalId && task.externalProvider === GITHUB_PROVIDER_ID) {
      await this.provider.updateTask(task);
      await this.syncBoardColumn(task, this.config.getConfig(task.projectId)!);
      return;
    }

    const externalId = await this.provider.pushTask(task);
    const config = this.config.getConfig(task.projectId)!;
    const issues = await this.api.listIssues(config.owner, config.repo);
    const match = issues.find((issue) => issue.number.toString() === externalId);
    this.taskRepository.update(task.id, {
      externalId,
      externalProvider: GITHUB_PROVIDER_ID,
      externalUrl: match?.html_url ?? '',
    });
  }

  async deleteRemoteTask(task: Task): Promise<void> {
    if (
      task.externalId &&
      task.externalProvider === GITHUB_PROVIDER_ID &&
      !isPullRequestExternalId(task.externalId) &&
      this.config.isLinked(task.projectId)
    ) {
      await this.auth.loadStoredToken();
      const config = this.config.getConfig(task.projectId)!;
      await this.api.updateIssue(
        config.owner,
        config.repo,
        Number.parseInt(task.externalId, 10),
        { state: 'closed' },
      );
    }
  }

  async addPrComment(
    projectId: string,
    taskId: string,
    comment: string,
  ): Promise<void> {
    const task = this.taskRepository.findById(taskId);
    if (!task?.externalId || !isPullRequestExternalId(task.externalId)) {
      throw new Error('Task is not a GitHub pull request');
    }

    await this.auth.loadStoredToken();
    await this.provider.addPrComment(projectId, task.externalId, comment);
  }

  async syncAllLinked(): Promise<void> {
    for (const projectId of this.config.getLinkedProjectIds()) {
      await this.syncProject(projectId);
    }
  }

  startAutoSync(projectId: string): void {
    if (!this.isAutoSyncEnabled()) {
      return;
    }

    this.stopAutoSync(projectId);
    const timer = setInterval(() => {
      void this.syncProject(projectId).catch(() => undefined);
    }, this.getSyncIntervalMs());
    this.syncTimers.set(projectId, timer);
  }

  stopAutoSync(projectId: string): void {
    const timer = this.syncTimers.get(projectId);
    if (timer) {
      clearInterval(timer);
      this.syncTimers.delete(projectId);
    }
  }

  stopAllAutoSync(): void {
    for (const projectId of [...this.syncTimers.keys()]) {
      this.stopAutoSync(projectId);
    }
  }

  async initialize(): Promise<void> {
    await this.auth.loadStoredToken();
    if (!this.isAutoSyncEnabled()) {
      return;
    }

    for (const projectId of this.config.getLinkedProjectIds()) {
      this.startAutoSync(projectId);
    }
  }

  dispose(): void {
    this.stopAllAutoSync();
  }

  private async syncBoardColumn(
    task: Task,
    config: GitHubProjectConfig,
  ): Promise<void> {
    if (
      !config.ghProjectId ||
      !config.statusFieldId ||
      !task.externalId ||
      isPullRequestExternalId(task.externalId)
    ) {
      return;
    }

    const optionId = config.statusToColumn[task.status];
    const itemId = this.itemIdByIssue.get(`${task.projectId}:${task.externalId}`);
    if (!optionId || !itemId) {
      return;
    }

    await this.api.updateProjectItemStatus(
      config.ghProjectId,
      itemId,
      config.statusFieldId,
      optionId,
    );
  }

  private async getGitHubUpdatedAt(
    externalId: string,
    config: GitHubProjectConfig,
  ): Promise<number> {
    if (isPullRequestExternalId(externalId)) {
      const number = Number.parseInt(externalId.replace(/^pr-/, ''), 10);
      const pulls = await this.api.listPullRequests(config.owner, config.repo);
      const pr = pulls.find((item) => item.number === number);
      return pr ? new Date(pr.updated_at).getTime() : 0;
    }

    const issues = await this.api.listIssues(config.owner, config.repo);
    const issue = issues.find((item) => item.number.toString() === externalId);
    return issue ? new Date(issue.updated_at).getTime() : 0;
  }

  private setStatus(status: 'idle' | 'syncing' | 'error', message?: string): void {
    this.globalStatus = status;
    this.globalMessage = message;
    for (const listener of this.statusListeners) {
      listener({
        status,
        message,
        lastSyncAt: this.globalLastSyncAt,
      });
    }
  }

  private notifySyncComplete(): void {
    for (const listener of this.syncListeners) {
      listener();
    }
  }

  private isAutoSyncEnabled(): boolean {
    return vscode.workspace
      .getConfiguration('mksflow')
      .get<boolean>('github.autoSync', true);
  }

  private getSyncIntervalMs(): number {
    const seconds = vscode.workspace
      .getConfiguration('mksflow')
      .get<number>('github.syncInterval', 300);
    return Math.max(60, seconds) * 1000;
  }
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
