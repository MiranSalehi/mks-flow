import type { TaskStatus } from '../../domain/types';

export interface GitHubUser {
  login: string;
  name: string | null;
  avatar_url: string;
}

export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  owner: { login: string };
  private: boolean;
}

export interface GitHubLabel {
  name: string;
}

export interface GitHubIssue {
  number: number;
  title: string;
  body: string | null;
  state: 'open' | 'closed';
  html_url: string;
  labels: GitHubLabel[];
  updated_at: string;
  pull_request?: unknown;
}

export interface GitHubPullRequest {
  number: number;
  title: string;
  body: string | null;
  state: 'open' | 'closed';
  draft: boolean;
  html_url: string;
  head: { ref: string };
  changed_files: number;
  merged_at: string | null;
  updated_at: string;
}

export interface GitHubReview {
  state: string;
  user: { login: string };
}

export interface GitHubProjectV2 {
  id: string;
  title: string;
  fields: {
    nodes: {
      id: string;
      name: string;
      options?: { id: string; name: string }[];
    }[];
  };
}

/** Per-local-project GitHub linkage stored in extension globalState. */
export interface GitHubProjectConfig {
  owner: string;
  repo: string;
  repoFullName: string;
  syncModes: GitHubSyncMode[];
  ghProjectId: string | null;
  ghProjectTitle: string | null;
  statusFieldId: string | null;
  columnToStatus: Record<string, TaskStatus>;
  statusToColumn: Record<TaskStatus, string>;
  lastSyncAt: string | null;
}

export type GitHubSyncMode = 'issues' | 'prs' | 'board';

export interface SyncResult {
  pulled: number;
  pushed: number;
  conflicts: number;
  errors: string[];
}

export interface GitHubRepoOption {
  id: number;
  name: string;
  fullName: string;
  owner: string;
  private: boolean;
}

export interface GitHubProjectOption {
  id: string;
  title: string;
  statusFieldId: string | null;
  columns: { id: string; name: string }[];
}
