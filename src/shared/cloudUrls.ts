import * as vscode from 'vscode';

const DEFAULT_WEB_APP_URL = 'https://mksflow.com';

/** Returns the MKSFlow Cloud web app origin (no trailing slash). */
export function getWebAppUrl(): string {
  const configured = vscode.workspace
    .getConfiguration('mksflow')
    .get<string>('webAppUrl', '')
    .trim();

  if (configured) {
    return configured.replace(/\/+$/, '');
  }

  const apiBase = vscode.workspace
    .getConfiguration('mksflow')
    .get<string>('apiBaseUrl', 'https://mksflow.com/api/v1')
    .trim();

  try {
    const url = new URL(apiBase || 'https://mksflow.com/api/v1');

    return `${url.protocol}//${url.host}`;
  } catch {
    return DEFAULT_WEB_APP_URL;
  }
}

/** Deep link to a task on the cloud kanban board. */
export function buildCloudTaskUrl(projectId: string, taskId: string): string {
  return `${getWebAppUrl()}/projects/${encodeURIComponent(projectId)}?task=${encodeURIComponent(taskId)}`;
}

/** Link to a cloud project board. */
export function buildCloudProjectUrl(projectId: string): string {
  return `${getWebAppUrl()}/projects/${encodeURIComponent(projectId)}`;
}
