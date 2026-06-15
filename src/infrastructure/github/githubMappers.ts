import type { CreateTaskDto } from '../../domain/models/Task';
import type { ExternalTask } from '../../domain/interfaces/ISyncProvider';
import type { TaskPriority, TaskStatus } from '../../domain/types';
import {
  GITHUB_LABEL_DOING,
  GITHUB_LABEL_TEST,
  GITHUB_PROVIDER_ID,
} from '../../shared/githubConfig';
import type { GitHubIssue, GitHubPullRequest } from './GitHubTypes';

const MKSFLOW_LABELS = new Set([GITHUB_LABEL_DOING, GITHUB_LABEL_TEST]);

export function mapGitHubIssueToExternal(issue: GitHubIssue): ExternalTask {
  const labelNames = issue.labels.map((label) => label.name);
  return {
    externalId: issue.number.toString(),
    title: issue.title,
    description: issue.body ?? '',
    status: mapGitHubIssueStatus(issue.state, labelNames),
    priority: mapGitHubPriority(labelNames),
    url: issue.html_url,
  };
}

export function mapGitHubPrToExternal(pr: GitHubPullRequest): ExternalTask {
  return {
    externalId: `pr-${pr.number}`,
    title: `[PR] ${pr.title}`,
    description: formatPrDescription(pr),
    status: mapPrStatus(pr),
    priority: 'medium',
    url: pr.html_url,
  };
}

export function mapExternalToCreateDto(
  external: ExternalTask,
  projectId: string,
  tags: string[] = [],
): CreateTaskDto {
  return {
    projectId,
    title: external.title,
    description: external.description,
    status: external.status as TaskStatus,
    priority: external.priority as TaskPriority,
    tags,
    externalId: external.externalId,
    externalProvider: GITHUB_PROVIDER_ID,
    externalUrl: external.url,
  };
}

export function mapTaskStatusToLabels(status: TaskStatus): string[] {
  switch (status) {
    case 'doing':
      return [GITHUB_LABEL_DOING];
    case 'test':
      return [GITHUB_LABEL_TEST];
    default:
      return [];
  }
}

export function labelsForStatusTransition(
  _from: TaskStatus,
  to: TaskStatus,
): { add: string[]; remove: string[] } {
  const remove = [...MKSFLOW_LABELS];
  const add = mapTaskStatusToLabels(to);
  if (to === 'done') {
    return { add: [], remove };
  }
  if (to === 'todo') {
    return { add: [], remove };
  }
  return { add, remove: remove.filter((label) => !add.includes(label)) };
}

export function mapGitHubIssueStatus(
  state: 'open' | 'closed',
  labels: string[],
): TaskStatus {
  if (state === 'closed') {
    return 'done';
  }
  if (labels.includes(GITHUB_LABEL_TEST)) {
    return 'test';
  }
  if (labels.includes(GITHUB_LABEL_DOING)) {
    return 'doing';
  }
  return 'todo';
}

function mapGitHubPriority(labels: string[]): TaskPriority {
  const lower = labels.map((label) => label.toLowerCase());
  if (lower.some((label) => label.includes('critical') || label.includes('urgent'))) {
    return 'critical';
  }
  if (lower.some((label) => label.includes('high'))) {
    return 'high';
  }
  if (lower.some((label) => label.includes('low'))) {
    return 'low';
  }
  return 'medium';
}

function mapPrStatus(pr: GitHubPullRequest): TaskStatus {
  if (pr.merged_at) {
    return 'done';
  }
  if (pr.state === 'closed') {
    return 'done';
  }
  if (pr.draft) {
    return 'todo';
  }
  return 'doing';
}

function formatPrDescription(pr: GitHubPullRequest): string {
  const lines = [
    pr.body ?? '',
    '',
    '---',
    `**Branch:** \`${pr.head.ref}\``,
    `**Files changed:** ${pr.changed_files}`,
    pr.draft ? '**Status:** Draft' : '**Status:** Open',
  ];
  return lines.join('\n');
}

export function isPullRequestExternalId(externalId: string): boolean {
  return externalId.startsWith('pr-');
}

export function parsePrNumber(externalId: string): number {
  return Number.parseInt(externalId.replace(/^pr-/, ''), 10);
}

export function filterUserTags(labels: string[]): string[] {
  return labels.filter((label) => !MKSFLOW_LABELS.has(label));
}
