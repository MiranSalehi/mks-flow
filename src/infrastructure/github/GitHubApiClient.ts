import {
  GITHUB_GRAPHQL_URL,
  GITHUB_REST_URL,
} from '../../shared/githubConfig';
import { GitHubApiError } from './GitHubApiError';
import type {
  GitHubIssue,
  GitHubProjectV2,
  GitHubPullRequest,
  GitHubRepo,
  GitHubReview,
  GitHubUser,
} from './GitHubTypes';

interface ProjectItemsPage {
  node: {
    items: {
      nodes: {
        id: string;
        fieldValues: {
          nodes: {
            name?: string;
            field?: { name: string };
          }[];
        };
        content: {
          number?: number;
          title?: string;
          body?: string;
          url?: string;
          state?: string;
          labels?: { nodes: { name: string }[] };
        } | null;
      }[];
      pageInfo: { hasNextPage: boolean; endCursor: string | null };
    };
  };
}

/**
 * GitHub REST + GraphQL client for issues, PRs, and Projects v2.
 */
export class GitHubApiClient {
  private token: string | null = null;

  setToken(token: string | null): void {
    this.token = token?.trim() || null;
  }

  getToken(): string | null {
    return this.token;
  }

  async getUser(): Promise<GitHubUser> {
    return this.rest<GitHubUser>('/user');
  }

  async listRepos(page = 1): Promise<GitHubRepo[]> {
    return this.rest<GitHubRepo[]>(
      `/user/repos?per_page=100&page=${page}&sort=updated`,
    );
  }

  async listAllRepos(): Promise<GitHubRepo[]> {
    const repos: GitHubRepo[] = [];
    let page = 1;
    while (true) {
      const batch = await this.listRepos(page);
      repos.push(...batch);
      if (batch.length < 100) {
        break;
      }
      page += 1;
    }
    return repos;
  }

  async listIssues(owner: string, repo: string): Promise<GitHubIssue[]> {
    const issues: GitHubIssue[] = [];
    let page = 1;
    while (true) {
      const batch = await this.rest<GitHubIssue[]>(
        `/repos/${owner}/${repo}/issues?state=all&per_page=100&page=${page}`,
      );
      const filtered = batch.filter((issue) => !issue.pull_request);
      issues.push(...filtered);
      if (batch.length < 100) {
        break;
      }
      page += 1;
    }
    return issues;
  }

  async createIssue(
    owner: string,
    repo: string,
    input: { title: string; body: string; labels?: string[] },
  ): Promise<GitHubIssue> {
    return this.rest<GitHubIssue>(`/repos/${owner}/${repo}/issues`, {
      method: 'POST',
      body: JSON.stringify({
        title: input.title,
        body: input.body,
        labels: input.labels,
      }),
    });
  }

  async updateIssue(
    owner: string,
    repo: string,
    number: number,
    input: { title?: string; body?: string; state?: 'open' | 'closed' },
  ): Promise<GitHubIssue> {
    return this.rest<GitHubIssue>(
      `/repos/${owner}/${repo}/issues/${number}`,
      {
        method: 'PATCH',
        body: JSON.stringify(input),
      },
    );
  }

  async addLabels(
    owner: string,
    repo: string,
    number: number,
    labels: string[],
  ): Promise<void> {
    if (labels.length === 0) {
      return;
    }
    await this.rest(`/repos/${owner}/${repo}/issues/${number}/labels`, {
      method: 'POST',
      body: JSON.stringify({ labels }),
    });
  }

  async removeLabel(
    owner: string,
    repo: string,
    number: number,
    label: string,
  ): Promise<void> {
    await this.rest(
      `/repos/${owner}/${repo}/issues/${number}/labels/${encodeURIComponent(label)}`,
      { method: 'DELETE' },
    );
  }

  async listPullRequests(
    owner: string,
    repo: string,
  ): Promise<GitHubPullRequest[]> {
    const pulls: GitHubPullRequest[] = [];
    let page = 1;
    while (true) {
      const batch = await this.rest<GitHubPullRequest[]>(
        `/repos/${owner}/${repo}/pulls?state=all&per_page=100&page=${page}`,
      );
      pulls.push(...batch);
      if (batch.length < 100) {
        break;
      }
      page += 1;
    }
    return pulls;
  }

  async getPullReviews(
    owner: string,
    repo: string,
    number: number,
  ): Promise<GitHubReview[]> {
    return this.rest<GitHubReview[]>(
      `/repos/${owner}/${repo}/pulls/${number}/reviews`,
    );
  }

  async addIssueComment(
    owner: string,
    repo: string,
    number: number,
    body: string,
  ): Promise<void> {
    await this.rest(`/repos/${owner}/${repo}/issues/${number}/comments`, {
      method: 'POST',
      body: JSON.stringify({ body }),
    });
  }

  async listProjectsV2(login: string): Promise<GitHubProjectV2[]> {
    const data = await this.graphql<{
      user: { projectsV2: { nodes: GitHubProjectV2[] } };
    }>(
      `
      query($login: String!) {
        user(login: $login) {
          projectsV2(first: 20) {
            nodes {
              id
              title
              fields(first: 20) {
                nodes {
                  ... on ProjectV2SingleSelectField {
                    id
                    name
                    options { id name }
                  }
                }
              }
            }
          }
        }
      }
    `,
      { login },
    );
    return data.user.projectsV2.nodes;
  }

  async listProjectItems(
    projectId: string,
  ): Promise<
    {
      itemId: string;
      issueNumber: number | null;
      title: string;
      body: string;
      url: string;
      state: string;
      columnName: string | null;
      labels: string[];
    }[]
  > {
    const items: {
      itemId: string;
      issueNumber: number | null;
      title: string;
      body: string;
      url: string;
      state: string;
      columnName: string | null;
      labels: string[];
    }[] = [];

    let after: string | null = null;
    let hasNextPage = true;

    while (hasNextPage) {
      const cursor: string | null = after;
      const page: ProjectItemsPage = await this.graphql<ProjectItemsPage>(
        `
        query($projectId: ID!, $after: String) {
          node(id: $projectId) {
            ... on ProjectV2 {
              items(first: 50, after: $after) {
                nodes {
                  id
                  fieldValues(first: 10) {
                    nodes {
                      ... on ProjectV2ItemFieldSingleSelectValue {
                        name
                        field { ... on ProjectV2SingleSelectField { name } }
                      }
                    }
                  }
                  content {
                    ... on Issue {
                      number
                      title
                      body
                      url
                      state
                      labels(first: 10) { nodes { name } }
                    }
                  }
                }
                pageInfo { hasNextPage endCursor }
              }
            }
          }
        }
      `,
        { projectId, after: cursor },
      );

      for (const node of page.node.items.nodes) {
        const content = node.content;
        if (!content?.number) {
          continue;
        }

        const statusValue = node.fieldValues.nodes.find(
          (value: { field?: { name: string }; name?: string }) =>
            value.field?.name.toLowerCase() === 'status',
        );

        items.push({
          itemId: node.id,
          issueNumber: content.number,
          title: content.title ?? '',
          body: content.body ?? '',
          url: content.url ?? '',
          state: content.state ?? 'OPEN',
          columnName: statusValue?.name ?? null,
          labels:
            content.labels?.nodes.map((label: { name: string }) => label.name) ??
            [],
        });
      }

      hasNextPage = page.node.items.pageInfo.hasNextPage;
      after = page.node.items.pageInfo.endCursor;
    }

    return items;
  }

  async updateProjectItemStatus(
    projectId: string,
    itemId: string,
    fieldId: string,
    optionId: string,
  ): Promise<void> {
    await this.graphql(
      `
      mutation($projectId: ID!, $itemId: ID!, $fieldId: ID!, $optionId: String!) {
        updateProjectV2ItemFieldValue(input: {
          projectId: $projectId
          itemId: $itemId
          fieldId: $fieldId
          value: { singleSelectOptionId: $optionId }
        }) {
          projectV2Item { id }
        }
      }
    `,
      { projectId, itemId, fieldId, optionId },
    );
  }

  private async rest<T>(
    path: string,
    init?: RequestInit,
  ): Promise<T> {
    if (!this.token) {
      throw new GitHubApiError('GitHub token is not configured');
    }

    const response = await fetch(`${GITHUB_REST_URL}${path}`, {
      ...init,
      headers: {
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
        ...(init?.headers ?? {}),
      },
    });

    if (!response.ok) {
      const text = await response.text();
      throw new GitHubApiError(
        text || `GitHub API failed (${response.status})`,
        response.status,
      );
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return (await response.json()) as T;
  }

  private async graphql<T>(
    query: string,
    variables?: Record<string, unknown>,
  ): Promise<T> {
    if (!this.token) {
      throw new GitHubApiError('GitHub token is not configured');
    }

    const response = await fetch(GITHUB_GRAPHQL_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query, variables }),
    });

    if (!response.ok) {
      throw new GitHubApiError(
        `GitHub GraphQL failed (${response.status})`,
        response.status,
      );
    }

    const body = (await response.json()) as {
      data?: T;
      errors?: { message: string }[];
    };

    if (body.errors?.length) {
      throw new GitHubApiError(body.errors.map((e) => e.message).join('; '));
    }

    if (!body.data) {
      throw new GitHubApiError('GitHub GraphQL returned no data');
    }

    return body.data;
  }
}
