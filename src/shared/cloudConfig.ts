import * as vscode from 'vscode';

const DEFAULT_API_BASE_URL = 'https://mksflow.com/api/v1';
const DEFAULT_SYNC_INTERVAL_MS = 30_000;

/** Returns the configured MKSFlow Cloud API base URL (no trailing slash). */
export function getApiBaseUrl(): string {
  const configured = vscode.workspace
    .getConfiguration('mksflow')
    .get<string>('apiBaseUrl', DEFAULT_API_BASE_URL)
    .trim();

  return (configured || DEFAULT_API_BASE_URL).replace(/\/+$/, '');
}

/** Polling interval for cloud sync in milliseconds. */
export function getCloudSyncIntervalMs(): number {
  const value = vscode.workspace
    .getConfiguration('mksflow')
    .get<number>('cloudSyncIntervalMs', DEFAULT_SYNC_INTERVAL_MS);

  return Math.max(10_000, value);
}

export const CLOUD_SECRETS_KEY = 'mksflow.cloud.token';
export const CLOUD_BOARD_MODE_KEY = 'mksflow.boardMode';
export const CLOUD_CACHE_KEY = 'mksflow.cloud.cache';

export type BoardMode = 'personal' | 'team';

export type CloudSyncStatus = 'idle' | 'syncing' | 'offline' | 'error';
