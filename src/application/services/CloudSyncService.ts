import * as vscode from 'vscode';
import type { CloudApiClient } from '../../infrastructure/cloud/CloudApiClient';
import type { ApiUser, CloudCachePayload } from '../../infrastructure/cloud/CloudApiTypes';
import { CloudApiError } from '../../infrastructure/cloud/CloudApiError';
import { mapApiProject, mapApiTask } from '../../infrastructure/cloud/cloudMappers';
import type { CloudAuthService } from './CloudAuthService';
import {
  CLOUD_BOARD_MODE_KEY,
  CLOUD_CACHE_KEY,
  getCloudSyncIntervalMs,
  type BoardMode,
  type CloudSyncStatus,
} from '../../shared/cloudConfig';
import type {
  SerializedProject,
  SerializedTask,
} from '../../shared/messages';

export interface CloudAuthState {
  isAuthenticated: boolean;
  user?: ApiUser;
  lastSyncAt?: string | null;
}

export interface CloudSyncState {
  status: CloudSyncStatus;
  message?: string;
}

type SyncListener = (cache: CloudCachePayload) => void;
type AuthListener = (state: CloudAuthState) => void;
type StatusListener = (state: CloudSyncState) => void;

const EMPTY_CACHE: CloudCachePayload = {
  user: null,
  projects: [],
  tasks: [],
  lastSyncAt: null,
};

/**
 * Pulls team tasks from mksflow-cloud, caches them, and polls for updates.
 */
export class CloudSyncService {
  private cache: CloudCachePayload = { ...EMPTY_CACHE };
  private pollTimer: ReturnType<typeof setInterval> | undefined;
  private syncListeners: SyncListener[] = [];
  private authListeners: AuthListener[] = [];
  private statusListeners: StatusListener[] = [];
  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly api: CloudApiClient,
    private readonly auth: CloudAuthService,
  ) {
    this.cache = this.loadCacheFromDisk();
  }

  /** Registers a callback invoked after cache updates. */
  onCacheUpdated(listener: SyncListener): vscode.Disposable {
    this.syncListeners.push(listener);
    return new vscode.Disposable(() => {
      this.syncListeners = this.syncListeners.filter((item) => item !== listener);
    });
  }

  /** Registers a callback for auth state changes. */
  onAuthStateChanged(listener: AuthListener): vscode.Disposable {
    this.authListeners.push(listener);
    return new vscode.Disposable(() => {
      this.authListeners = this.authListeners.filter((item) => item !== listener);
    });
  }

  /** Registers a callback for sync status changes. */
  onSyncStatusChanged(listener: StatusListener): vscode.Disposable {
    this.statusListeners.push(listener);
    return new vscode.Disposable(() => {
      this.statusListeners = this.statusListeners.filter(
        (item) => item !== listener,
      );
    });
  }

  /** Returns the in-memory cloud cache. */
  getCache(): CloudCachePayload {
    return this.cache;
  }

  /** Returns persisted board mode (personal or team). */
  getBoardMode(): BoardMode {
    return (
      this.context.globalState.get<BoardMode>(CLOUD_BOARD_MODE_KEY) ?? 'personal'
    );
  }

  /** Persists and broadcasts board mode. */
  setBoardMode(mode: BoardMode): void {
    void this.context.globalState.update(CLOUD_BOARD_MODE_KEY, mode);
  }

  /** Starts polling when a token is available. */
  async initialize(): Promise<void> {
    const hasToken = await this.auth.loadStoredToken();
    if (hasToken) {
      if (this.getBoardMode() === 'team') {
        this.startPolling();
      }
      await this.syncNow().catch(() => {
        // Offline on startup — cache already loaded
      });
    }

    this.emitAuthState({
      isAuthenticated: hasToken,
      user: this.cache.user ?? undefined,
      lastSyncAt: this.cache.lastSyncAt,
    });
  }

  /** Performs an immediate sync from the API. */
  async syncNow(): Promise<void> {
    const hasToken = await this.auth.loadStoredToken();
    if (!hasToken) {
      this.emitAuthState({ isAuthenticated: false });
      return;
    }

    this.setSyncStatus({ status: 'syncing' });

    try {
      const user = await this.api.me();
      const apiProjects = await this.api.listTeamProjects();
      const projectIds = new Set(apiProjects.map((project) => project.id));
      const apiTasks = (await this.api.listTasks()).filter((task) =>
        projectIds.has(task.project_id),
      );

      const projectTeamMap = new Map(
        apiProjects.map((project) => [project.id, project.team_id]),
      );

      const projects: SerializedProject[] = apiProjects.map(mapApiProject);
      const tasks: SerializedTask[] = apiTasks.map((task) =>
        mapApiTask(task, projectTeamMap.get(task.project_id) ?? null),
      );

      this.cache = {
        user,
        projects,
        tasks,
        lastSyncAt: new Date().toISOString(),
      };

      await this.persistCache();
      this.setSyncStatus({ status: 'idle' });
      this.emitAuthState({
        isAuthenticated: true,
        user,
        lastSyncAt: this.cache.lastSyncAt,
      });
      this.emitCacheUpdated();
    } catch (error) {
      if (error instanceof CloudApiError && error.isUnauthorized()) {
        await this.handleUnauthorized();
        return;
      }

      const isOffline =
        error instanceof CloudApiError && error.status === 0;

      this.setSyncStatus({
        status: isOffline ? 'offline' : 'error',
        message: error instanceof Error ? error.message : 'Sync failed',
      });

      if (isOffline && this.cache.tasks.length > 0) {
        this.emitCacheUpdated();
      }

      if (!isOffline) {
        throw error;
      }
    }
  }

  /** Clears auth and cache after a 401 response. */
  async handleUnauthorized(): Promise<void> {
    await this.auth.clearToken();
    this.stopPolling();
    this.cache = { ...EMPTY_CACHE };
    await this.persistCache();
    this.setSyncStatus({ status: 'idle' });
    this.emitAuthState({ isAuthenticated: false });
    this.emitCacheUpdated();
  }

  /** Clears cache and stops polling on logout. */
  async clearCache(): Promise<void> {
    this.cache = { ...EMPTY_CACHE };
    await this.persistCache();
    this.emitCacheUpdated();
  }

  /** Starts interval polling. */
  startPolling(): void {
    this.stopPolling();
    const intervalMs = getCloudSyncIntervalMs();
    this.pollTimer = setInterval(() => {
      void this.syncNow().catch(() => {
        // Errors surfaced via sync status
      });
    }, intervalMs);
  }

  /** Stops interval polling. */
  stopPolling(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = undefined;
    }
  }

  /** Releases timers on extension deactivate. */
  dispose(): void {
    this.stopPolling();
  }

  private loadCacheFromDisk(): CloudCachePayload {
    return (
      this.context.globalState.get<CloudCachePayload>(CLOUD_CACHE_KEY) ??
      { ...EMPTY_CACHE }
    );
  }

  private async persistCache(): Promise<void> {
    await this.context.globalState.update(CLOUD_CACHE_KEY, this.cache);
  }

  private emitCacheUpdated(): void {
    for (const listener of this.syncListeners) {
      listener(this.cache);
    }
  }

  private emitAuthState(state: CloudAuthState): void {
    for (const listener of this.authListeners) {
      listener(state);
    }
  }

  private setSyncStatus(state: CloudSyncState): void {
    for (const listener of this.statusListeners) {
      listener(state);
    }
  }
}
