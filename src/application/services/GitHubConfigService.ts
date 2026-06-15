import * as vscode from 'vscode';
import { GITHUB_PROJECT_CONFIG_KEY } from '../../shared/githubConfig';
import type { GitHubProjectConfig } from '../../infrastructure/github/GitHubTypes';

type ConfigMap = Record<string, GitHubProjectConfig>;

/**
 * Persists per-project GitHub linkage in extension globalState.
 */
export class GitHubConfigService {
  constructor(private readonly context: vscode.ExtensionContext) {}

  getConfig(projectId: string): GitHubProjectConfig | null {
    return this.getAll()[projectId] ?? null;
  }

  getAll(): ConfigMap {
    return (
      this.context.globalState.get<ConfigMap>(GITHUB_PROJECT_CONFIG_KEY) ?? {}
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
    config: GitHubProjectConfig,
  ): Promise<void> {
    const all = this.getAll();
    all[projectId] = config;
    await this.context.globalState.update(GITHUB_PROJECT_CONFIG_KEY, all);
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
    await this.context.globalState.update(GITHUB_PROJECT_CONFIG_KEY, all);
  }

  async clearAll(): Promise<void> {
    await this.context.globalState.update(GITHUB_PROJECT_CONFIG_KEY, undefined);
  }
}
