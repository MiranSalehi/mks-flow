import * as vscode from 'vscode';
import { LINEAR_SECRETS_KEY, LINEAR_VIEWER_KEY } from '../../shared/linearConfig';
import type { LinearApiClient } from '../../infrastructure/linear/LinearApiClient';
import { LinearApiError } from '../../infrastructure/linear/LinearApiError';
import type { LinearViewer } from '../../infrastructure/linear/LinearTypes';

/**
 * Stores and loads the Linear API key from VS Code SecretStorage.
 */
export class LinearAuthService {
  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly api: LinearApiClient,
  ) {}

  async hasApiKey(): Promise<boolean> {
    const key = await this.context.secrets.get(LINEAR_SECRETS_KEY);
    return Boolean(key);
  }

  async loadStoredKey(): Promise<boolean> {
    const key = await this.context.secrets.get(LINEAR_SECRETS_KEY);
    if (!key) {
      this.api.setApiKey(null);
      return false;
    }

    this.api.setApiKey(key);
    return true;
  }

  async connect(apiKey: string): Promise<LinearViewer> {
    const trimmed = apiKey.trim();
    if (!trimmed) {
      throw new LinearApiError('API key is required');
    }

    this.api.setApiKey(trimmed);
    try {
      const viewer = await this.api.getViewer();
      await this.context.secrets.store(LINEAR_SECRETS_KEY, trimmed);
      await this.context.globalState.update(LINEAR_VIEWER_KEY, {
        name: viewer.name,
        organization: viewer.organization.name,
      });
      return viewer;
    } catch (error) {
      this.api.setApiKey(null);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    await this.context.secrets.delete(LINEAR_SECRETS_KEY);
    await this.context.globalState.update(LINEAR_VIEWER_KEY, undefined);
    this.api.setApiKey(null);
  }

  getCachedViewer(): { name: string; organization: string } | null {
    return (
      this.context.globalState.get<{ name: string; organization: string }>(
        LINEAR_VIEWER_KEY,
      ) ?? null
    );
  }

  async testConnection(): Promise<string> {
    const loaded = await this.loadStoredKey();
    if (!loaded) {
      throw new LinearApiError('No Linear API key stored');
    }

    const viewer = await this.api.getViewer();
    await this.context.globalState.update(LINEAR_VIEWER_KEY, {
      name: viewer.name,
      organization: viewer.organization.name,
    });
    return viewer.organization.name;
  }
}
