import * as vscode from 'vscode';
import { GITHUB_SECRETS_KEY, GITHUB_USER_KEY } from '../../shared/githubConfig';
import type { GitHubApiClient } from '../../infrastructure/github/GitHubApiClient';
import { GitHubApiError } from '../../infrastructure/github/GitHubApiError';
import type { GitHubUser } from '../../infrastructure/github/GitHubTypes';

/**
 * Stores and loads the GitHub PAT from VS Code SecretStorage.
 */
export class GitHubAuthService {
  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly api: GitHubApiClient,
  ) {}

  async hasToken(): Promise<boolean> {
    const token = await this.context.secrets.get(GITHUB_SECRETS_KEY);
    return Boolean(token);
  }

  async loadStoredToken(): Promise<boolean> {
    const token = await this.context.secrets.get(GITHUB_SECRETS_KEY);
    if (!token) {
      this.api.setToken(null);
      return false;
    }

    this.api.setToken(token);
    return true;
  }

  async connect(token: string): Promise<GitHubUser> {
    const trimmed = token.trim();
    if (!trimmed) {
      throw new GitHubApiError('GitHub token is required');
    }

    this.api.setToken(trimmed);
    try {
      const user = await this.api.getUser();
      await this.context.secrets.store(GITHUB_SECRETS_KEY, trimmed);
      await this.context.globalState.update(GITHUB_USER_KEY, {
        login: user.login,
        name: user.name,
      });
      return user;
    } catch (error) {
      this.api.setToken(null);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    await this.context.secrets.delete(GITHUB_SECRETS_KEY);
    await this.context.globalState.update(GITHUB_USER_KEY, undefined);
    this.api.setToken(null);
  }

  getCachedUser(): { login: string; name: string | null } | null {
    return (
      this.context.globalState.get<{ login: string; name: string | null }>(
        GITHUB_USER_KEY,
      ) ?? null
    );
  }

  async testConnection(): Promise<string> {
    const loaded = await this.loadStoredToken();
    if (!loaded) {
      throw new GitHubApiError('No GitHub token stored');
    }

    const user = await this.api.getUser();
    await this.context.globalState.update(GITHUB_USER_KEY, {
      login: user.login,
      name: user.name,
    });
    return user.login;
  }
}
