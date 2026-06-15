import * as vscode from 'vscode';
import { NOTION_SECRETS_KEY, NOTION_WORKSPACE_KEY } from '../../shared/notionConfig';
import type { NotionApiClient } from '../../infrastructure/notion/NotionApiClient';
import { NotionApiError } from '../../infrastructure/notion/NotionApiError';
import type { NotionUser } from '../../infrastructure/notion/NotionTypes';

/**
 * Stores and loads the Notion integration token from VS Code SecretStorage.
 */
export class NotionAuthService {
  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly api: NotionApiClient,
  ) {}

  async hasToken(): Promise<boolean> {
    const token = await this.context.secrets.get(NOTION_SECRETS_KEY);
    return Boolean(token);
  }

  async loadStoredToken(): Promise<boolean> {
    const token = await this.context.secrets.get(NOTION_SECRETS_KEY);
    if (!token) {
      this.api.setToken(null);
      return false;
    }

    this.api.setToken(token);
    return true;
  }

  async connect(token: string): Promise<NotionUser> {
    const trimmed = token.trim();
    if (!trimmed) {
      throw new NotionApiError('Notion token is required');
    }

    this.api.setToken(trimmed);
    try {
      const user = await this.api.getMe();
      await this.context.secrets.store(NOTION_SECRETS_KEY, trimmed);
      await this.context.globalState.update(NOTION_WORKSPACE_KEY, {
        id: user.id,
        name: user.name,
      });
      return user;
    } catch (error) {
      this.api.setToken(null);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    await this.context.secrets.delete(NOTION_SECRETS_KEY);
    await this.context.globalState.update(NOTION_WORKSPACE_KEY, undefined);
    this.api.setToken(null);
  }

  getCachedWorkspace(): { id: string; name: string | null } | null {
    return (
      this.context.globalState.get<{ id: string; name: string | null }>(
        NOTION_WORKSPACE_KEY,
      ) ?? null
    );
  }

  async testConnection(): Promise<string> {
    const loaded = await this.loadStoredToken();
    if (!loaded) {
      throw new NotionApiError('No Notion token stored');
    }

    const user = await this.api.getMe();
    await this.context.globalState.update(NOTION_WORKSPACE_KEY, {
      id: user.id,
      name: user.name,
    });
    return user.name ?? user.id;
  }
}
