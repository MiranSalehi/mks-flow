import * as vscode from 'vscode';
import type { IProjectRepository } from '../../domain/interfaces/IProjectRepository';
import type { ITaskRepository } from '../../domain/interfaces/ITaskRepository';
import type { Task } from '../../domain/models/Task';
import type { TaskPriority, TaskStatus } from '../../domain/types';
import { NOTION_PROVIDER_ID } from '../../shared/notionConfig';
import type { NotionApiClient } from '../../infrastructure/notion/NotionApiClient';
import { NotionApiError } from '../../infrastructure/notion/NotionApiError';
import {
  autoDetectMapping,
  buildProjectConfig,
} from '../../infrastructure/notion/notionMappers';
import type {
  NotionDatabaseOption,
  NotionDatabaseSchema,
  NotionProjectConfig,
  PropertyMappingDraft,
  SyncResult,
} from '../../infrastructure/notion/NotionTypes';
import { NotionSyncProvider } from '../../infrastructure/sync/NotionSyncProvider';
import type { NotionAuthService } from './NotionAuthService';
import type { NotionConfigService } from './NotionConfigService';

type SyncListener = () => void;
type StatusListener = (state: {
  status: 'idle' | 'syncing' | 'error';
  message?: string;
  lastSyncAt: string | null;
}) => void;

/**
 * Orchestrates two-way sync between local tasks and Notion databases.
 */
export class NotionSyncService {
  private readonly provider: NotionSyncProvider;
  private readonly syncTimers = new Map<string, ReturnType<typeof setInterval>>();
  private syncListeners: SyncListener[] = [];
  private statusListeners: StatusListener[] = [];
  private globalLastSyncAt: string | null = null;
  private globalStatus: 'idle' | 'syncing' | 'error' = 'idle';
  private globalMessage: string | undefined;

  constructor(
    private readonly auth: NotionAuthService,
    private readonly config: NotionConfigService,
    private readonly api: NotionApiClient,
    private readonly taskRepository: ITaskRepository,
    private readonly projectRepository: IProjectRepository,
  ) {
    this.provider = new NotionSyncProvider(api, (projectId) =>
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

  getProjectConfig(projectId: string): NotionProjectConfig | null {
    return this.config.getConfig(projectId);
  }

  async getDatabases(): Promise<NotionDatabaseOption[]> {
    await this.auth.loadStoredToken();
    return this.api.searchDatabases();
  }

  async getDatabaseSchema(databaseId: string): Promise<NotionDatabaseSchema> {
    await this.auth.loadStoredToken();
    return this.api.getDatabase(databaseId);
  }

  autoDetectMapping(schema: NotionDatabaseSchema): PropertyMappingDraft {
    return autoDetectMapping(schema);
  }

  async linkProject(
    projectId: string,
    databaseId: string,
    mappingOverrides?: {
      statusMap?: Record<string, TaskStatus>;
      priorityMap?: Record<string, TaskPriority>;
    },
  ): Promise<SyncResult> {
    const project = this.projectRepository.findById(projectId);
    if (!project) {
      throw new Error(`Project not found: ${projectId}`);
    }

    await this.auth.loadStoredToken();
    const schema = await this.api.getDatabase(databaseId);
    const draft = autoDetectMapping(schema);

    if (mappingOverrides?.statusMap) {
      draft.statusMap = { ...draft.statusMap, ...mappingOverrides.statusMap };
    }
    if (mappingOverrides?.priorityMap) {
      draft.priorityMap = {
        ...draft.priorityMap,
        ...mappingOverrides.priorityMap,
      };
    }

    const linkage = buildProjectConfig(schema, draft);
    await this.config.saveConfig(projectId, linkage);
    this.projectRepository.update(projectId, { mode: 'notion' });

    const result = await this.syncProject(projectId);
    this.startAutoSync(projectId);
    return result;
  }

  async unlinkProject(projectId: string): Promise<void> {
    this.stopAutoSync(projectId);
    const tasks = this.taskRepository.findByProjectId(projectId);
    for (const task of tasks) {
      if (task.externalProvider === NOTION_PROVIDER_ID) {
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
          .filter((task) => task.externalProvider === NOTION_PROVIDER_ID)
          .map((task) => [task.externalId!, task]),
      );

      for (const external of externalTasks) {
        const existing = localByExternal.get(external.externalId);
        const notionUpdated = external.updatedAt
          ? new Date(external.updatedAt).getTime()
          : 0;

        if (!existing) {
          const dto = this.provider.mapToTaskForProject(
            external,
            projectId,
            external.tags ?? [],
          );
          this.taskRepository.create(dto);
          result.pulled += 1;
          continue;
        }

        const localUpdated = existing.updatedAt.getTime();
        const remoteNewer = notionUpdated > localUpdated;
        const bothChanged =
          notionUpdated > lastSyncAt && localUpdated > lastSyncAt;

        if (bothChanged) {
          result.conflicts += 1;
          this.taskRepository.logTransition(
            existing.id,
            existing.status,
            existing.status,
            'Sync conflict resolved: Notion version used',
          );
        }

        if (remoteNewer || bothChanged) {
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
        if (task.externalProvider === NOTION_PROVIDER_ID && task.externalId) {
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
            const externalId = await this.provider.pushTask(task);
            const pages = await this.api.queryDatabase(projectConfig.databaseId);
            const match = pages.find((page) => page.id === externalId);
            this.taskRepository.update(task.id, {
              externalId,
              externalProvider: NOTION_PROVIDER_ID,
              externalUrl: match?.url ?? '',
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
      if (error instanceof NotionApiError && error.isUnauthorized()) {
        await this.auth.disconnect();
      }
      return result;
    }
  }

  async pushTask(task: Task): Promise<void> {
    if (!this.config.isLinked(task.projectId)) {
      return;
    }

    await this.auth.loadStoredToken();

    if (task.externalId && task.externalProvider === NOTION_PROVIDER_ID) {
      await this.provider.updateTask(task);
      return;
    }

    const externalId = await this.provider.pushTask(task);
    const config = this.config.getConfig(task.projectId)!;
    const pages = await this.api.queryDatabase(config.databaseId);
    const match = pages.find((page) => page.id === externalId);
    this.taskRepository.update(task.id, {
      externalId,
      externalProvider: NOTION_PROVIDER_ID,
      externalUrl: match?.url ?? '',
    });
  }

  async deleteRemoteTask(task: Task): Promise<void> {
    if (
      task.externalId &&
      task.externalProvider === NOTION_PROVIDER_ID &&
      this.config.isLinked(task.projectId)
    ) {
      await this.auth.loadStoredToken();
      await this.api.archivePage(task.externalId);
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
      .get<boolean>('notion.autoSync', true);
  }

  private getSyncIntervalMs(): number {
    const seconds = vscode.workspace
      .getConfiguration('mksflow')
      .get<number>('notion.syncInterval', 300);
    return Math.max(60, seconds) * 1000;
  }
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
