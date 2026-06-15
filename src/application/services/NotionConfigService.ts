import * as vscode from 'vscode';
import { NOTION_PROJECT_CONFIG_KEY } from '../../shared/notionConfig';
import type { NotionProjectConfig } from '../../infrastructure/notion/NotionTypes';

type ConfigMap = Record<string, NotionProjectConfig>;

/**
 * Persists per-project Notion linkage in extension globalState.
 */
export class NotionConfigService {
  constructor(private readonly context: vscode.ExtensionContext) {}

  getConfig(projectId: string): NotionProjectConfig | null {
    return this.getAll()[projectId] ?? null;
  }

  getAll(): ConfigMap {
    return (
      this.context.globalState.get<ConfigMap>(NOTION_PROJECT_CONFIG_KEY) ?? {}
    );
  }

  isLinked(projectId: string): boolean {
    return Boolean(this.getConfig(projectId));
  }

  getLinkedProjectIds(): string[] {
    return Object.keys(this.getAll());
  }

  async saveConfig(
    projectId: string,
    config: NotionProjectConfig,
  ): Promise<void> {
    const all = this.getAll();
    all[projectId] = config;
    await this.context.globalState.update(NOTION_PROJECT_CONFIG_KEY, all);
  }

  async updateLastSync(projectId: string, iso: string): Promise<void> {
    const config = this.getConfig(projectId);
    if (!config) {
      return;
    }

    await this.saveConfig(projectId, { ...config, lastSyncAt: iso });
  }

  async removeConfig(projectId: string): Promise<void> {
    const all = this.getAll();
    delete all[projectId];
    await this.context.globalState.update(NOTION_PROJECT_CONFIG_KEY, all);
  }

  async clearAll(): Promise<void> {
    await this.context.globalState.update(NOTION_PROJECT_CONFIG_KEY, undefined);
  }
}
