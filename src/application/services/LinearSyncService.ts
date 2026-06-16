import * as vscode from 'vscode';
import type { IProjectRepository } from '../../domain/interfaces/IProjectRepository';
import type { ITaskRepository } from '../../domain/interfaces/ITaskRepository';
import type { Task } from '../../domain/models/Task';
import { LINEAR_PROVIDER_ID } from '../../shared/linearConfig';
import type { LinearApiClient } from '../../infrastructure/linear/LinearApiClient';
import { LinearApiError } from '../../infrastructure/linear/LinearApiError';
import type { TaskStatus } from '../../domain/types';
import {
  buildMapsFromStateToStatus,
  buildStateMaps,
  mapLinearIssueToExternal,
} from '../../infrastructure/linear/linearMappers';
import type {
  LinearProjectConfig,
  LinearTeamOption,
  SyncResult,
} from '../../infrastructure/linear/LinearTypes';
import { LinearSyncProvider } from '../../infrastructure/sync/LinearSyncProvider';
import type { LinearAuthService } from './LinearAuthService';
import type { LinearConfigService } from './LinearConfigService';

type SyncListener = () => void;
type StatusListener = (state: {
  status: 'idle' | 'syncing' | 'error';
  message?: string;
  lastSyncAt: string | null;
}) => void;

/**
 * Orchestrates two-way sync between local SQLite tasks and Linear issues.
 */
export class LinearSyncService {
  private readonly provider: LinearSyncProvider;
  private readonly syncTimers = new Map<string, ReturnType<typeof setInterval>>();
  private syncListeners: SyncListener[] = [];
  private statusListeners: StatusListener[] = [];
  private globalLastSyncAt: string | null = null;
  private globalStatus: 'idle' | 'syncing' | 'error' = 'idle';
  private globalMessage: string | undefined;

  constructor(
    private readonly auth: LinearAuthService,
    private readonly config: LinearConfigService,
    private readonly api: LinearApiClient,
    private readonly taskRepository: ITaskRepository,
    private readonly projectRepository: IProjectRepository,
  ) {
    this.provider = new LinearSyncProvider(api, (projectId) =>
      this.config.getConfig(projectId),
    );
  }

  onSyncComplete(listener: SyncListener): vscode.Disposable {
    this.syncListeners.push(listener);
    return {
      dispose: () => {
        this.syncListeners = this.syncListeners.filter(
          (item) => item !== listener,
        );
      },
    };
  }

  onStatusChanged(listener: StatusListener): vscode.Disposable {
    this.statusListeners.push(listener);
    return {
      dispose: () => {
        this.statusListeners = this.statusListeners.filter(
          (item) => item !== listener,
        );
      },
    };
  }

  getStatus(): {
    status: 'idle' | 'syncing' | 'error';
    message?: string;
    lastSyncAt: string | null;
  } {
    return {
      status: this.globalStatus,
      message: this.globalMessage,
      lastSyncAt: this.globalLastSyncAt,
    };
  }

  isProjectLinked(projectId: string): boolean {
    return this.config.isLinked(projectId);
  }

  getProjectConfig(projectId: string): LinearProjectConfig | null {
    return this.config.getConfig(projectId);
  }

  async getTeams(): Promise<LinearTeamOption[]> {
    await this.auth.loadStoredKey();
    const teams = await this.api.getTeams();
    return teams.map((team) => ({
      id: team.id,
      name: team.name,
      states: team.states.nodes,
      projects: team.projects.nodes,
    }));
  }

  /** Links a local project to a Linear team (and optional Linear project). */
  async linkProject(
    projectId: string,
    team: {
      id: string;
      name: string;
      states: { id: string; name: string; type: string }[];
    },
    linearProject: { id: string; name: string } | null,
    customStateToStatus?: Record<string, TaskStatus>,
  ): Promise<SyncResult> {
    const project = this.projectRepository.findById(projectId);
    if (!project) {
      throw new Error(`Project not found: ${projectId}`);
    }

    const maps = customStateToStatus
      ? buildMapsFromStateToStatus(team.states, customStateToStatus)
      : buildStateMaps(team.states);
    const linkage: LinearProjectConfig = {
      linearTeamId: team.id,
      linearTeamName: team.name,
      linearProjectId: linearProject?.id ?? null,
      linearProjectName: linearProject?.name ?? null,
      stateToStatus: maps.stateToStatus,
      statusToState: maps.statusToState,
      lastSyncAt: null,
    };

    await this.config.saveConfig(projectId, linkage);
    this.projectRepository.update(projectId, { mode: 'linear' });

    const result = await this.syncProject(projectId);
    this.startAutoSync(projectId);
    return result;
  }

  async unlinkProject(projectId: string): Promise<void> {
    this.stopAutoSync(projectId);
    const tasks = this.taskRepository.findByProjectId(projectId);
    for (const task of tasks) {
      if (task.externalProvider === LINEAR_PROVIDER_ID) {
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

    await this.auth.loadStoredKey();
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

      const issues = await this.api.listIssues(
        projectConfig.linearTeamId,
        projectConfig.linearProjectId,
      );
      const localTasks = this.taskRepository.findByProjectId(projectId);
      const localByExternal = new Map(
        localTasks
          .filter((task) => task.externalProvider === LINEAR_PROVIDER_ID)
          .map((task) => [task.externalId!, task]),
      );

      for (const issue of issues) {
        const external = mapLinearIssueToExternal(
          issue,
          projectConfig.stateToStatus,
        );
        const linearUpdated = new Date(issue.updatedAt).getTime();
        const existing = localByExternal.get(external.externalId);

        if (!existing) {
          const dto = this.provider.mapToTaskForProject(external, projectId);
          this.taskRepository.create(dto);
          result.pulled += 1;
          continue;
        }

        const localUpdated = existing.updatedAt.getTime();
        const linearNewer = linearUpdated > localUpdated;
        const bothChanged =
          linearUpdated > lastSyncAt && localUpdated > lastSyncAt;

        if (bothChanged) {
          result.conflicts += 1;
          this.taskRepository.logTransition(
            existing.id,
            existing.status,
            existing.status,
            'Sync conflict resolved: Linear version used',
          );
        }

        if (linearNewer || bothChanged) {
          this.taskRepository.update(existing.id, {
            title: external.title,
            description: external.description,
            status: external.status as Task['status'],
            priority: external.priority as Task['priority'],
            tags: external.tags ?? existing.tags,
            externalUrl: external.url,
          });
          result.pulled += 1;
        }
      }

      for (const task of localTasks) {
        if (task.externalProvider === LINEAR_PROVIDER_ID && task.externalId) {
          if (task.updatedAt.getTime() > lastSyncAt) {
            try {
              await this.provider.updateTask(task);
              result.pushed += 1;
            } catch (error) {
              result.errors.push(formatError(error));
            }
          }
          continue;
        }

        if (!task.externalId) {
          try {
            const created = await this.provider.pushTaskWithUrl(task);
            this.taskRepository.update(task.id, {
              externalId: created.id,
              externalProvider: LINEAR_PROVIDER_ID,
              externalUrl: created.url,
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
      if (error instanceof LinearApiError && error.isUnauthorized()) {
        await this.auth.disconnect();
      }
      return result;
    }
  }

  async pushTask(task: Task): Promise<void> {
    if (!this.config.isLinked(task.projectId)) {
      return;
    }

    await this.auth.loadStoredKey();

    if (task.externalId && task.externalProvider === LINEAR_PROVIDER_ID) {
      await this.provider.updateTask(task);
      return;
    }

    const created = await this.provider.pushTaskWithUrl(task);
    this.taskRepository.update(task.id, {
      externalId: created.id,
      externalProvider: LINEAR_PROVIDER_ID,
      externalUrl: created.url,
    });
  }

  async deleteRemoteTask(task: Task): Promise<void> {
    if (
      task.externalId &&
      task.externalProvider === LINEAR_PROVIDER_ID &&
      this.config.isLinked(task.projectId)
    ) {
      await this.auth.loadStoredKey();
      await this.provider.deleteTask(task.externalId);
    }
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
    const intervalMs = this.getSyncIntervalMs();
    const timer = setInterval(() => {
      void this.syncProject(projectId).catch(() => {
        // Status surfaced via listeners
      });
    }, intervalMs);
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
    await this.auth.loadStoredKey();
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

  private setStatus(
    status: 'idle' | 'syncing' | 'error',
    message?: string,
  ): void {
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
      .get<boolean>('linear.autoSync', true);
  }

  private getSyncIntervalMs(): number {
    const seconds = vscode.workspace
      .getConfiguration('mksflow')
      .get<number>('linear.syncInterval', 300);
    return Math.max(60, seconds) * 1000;
  }
}

function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}
