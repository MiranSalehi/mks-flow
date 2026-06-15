import type { GitHubApiClient } from '../infrastructure/github/GitHubApiClient';
import type { GitHubAuthService } from './services/GitHubAuthService';
import type { GitHubConfigService } from './services/GitHubConfigService';
import type { GitHubSyncService } from './services/GitHubSyncService';

export interface GitHubContext {
  api: GitHubApiClient;
  auth: GitHubAuthService;
  config: GitHubConfigService;
  sync: GitHubSyncService;
}

let githubContext: GitHubContext | undefined;

export function setGitHubContext(context: GitHubContext): void {
  githubContext = context;
}

export function getGitHubContext(): GitHubContext | undefined {
  return githubContext;
}

export function clearGitHubContext(): void {
  githubContext?.sync.dispose();
  githubContext = undefined;
}
