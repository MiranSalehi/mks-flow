import * as vscode from 'vscode';
import { LINEAR_PROJECT_CONFIG_KEY } from '../../shared/linearConfig';
import type { LinearProjectConfig } from '../../infrastructure/linear/LinearTypes';

type ConfigMap = Record<string, LinearProjectConfig>;

/**
 * Persists per-project Linear linkage in extension globalState.
 */
export class LinearConfigService {
  constructor(private readonly context: vscode.ExtensionContext) {}

  getConfig(projectId: string): LinearProjectConfig | null {
    return this.getAll()[projectId] ?? null;
  }

  getAll(): ConfigMap {
    return (
      this.context.globalState.get<ConfigMap>(LINEAR_PROJECT_CONFIG_KEY) ?? {}
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
    config: LinearProjectConfig,
  ): Promise<void> {
    const all = this.getAll();
    all[projectId] = config;
    await this.context.globalState.update(LINEAR_PROJECT_CONFIG_KEY, all);
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
    await this.context.globalState.update(LINEAR_PROJECT_CONFIG_KEY, all);
  }

  async clearAll(): Promise<void> {
    await this.context.globalState.update(LINEAR_PROJECT_CONFIG_KEY, undefined);
  }
}
