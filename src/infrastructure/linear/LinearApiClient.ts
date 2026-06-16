import { LinearApiError } from './LinearApiError';
import type {
  LinearIssue,
  LinearTeam,
  LinearViewer,
} from './LinearTypes';
import { LINEAR_GRAPHQL_URL } from '../../shared/linearConfig';

interface IssuesPage {
  issues: {
    nodes: LinearIssue[];
    pageInfo: { hasNextPage: boolean; endCursor: string | null };
  };
}

interface GraphQlResponse<T> {
  data?: T;
  errors?: { message: string }[];
}

/**
 * Minimal GraphQL client for the Linear API.
 */
export class LinearApiClient {
  private apiKey: string | null = null;

  setApiKey(key: string | null): void {
    this.apiKey = key?.trim() || null;
  }

  getApiKey(): string | null {
    return this.apiKey;
  }

  async getViewer(): Promise<LinearViewer> {
    const data = await this.query<{ viewer: LinearViewer }>(`
      query Viewer {
        viewer {
          id
          name
          organization { name }
        }
      }
    `);
    return data.viewer;
  }

  async getTeams(): Promise<LinearTeam[]> {
    const data = await this.query<{
      teams: { nodes: LinearTeam[] };
    }>(`
      query Teams {
        teams {
          nodes {
            id
            name
            states { nodes { id name type } }
            projects { nodes { id name } }
          }
        }
      }
    `);
    return data.teams.nodes;
  }

  async listIssues(
    teamId: string,
    linearProjectId: string | null,
  ): Promise<LinearIssue[]> {
    const issues: LinearIssue[] = [];
    let after: string | null = null;
    let hasNextPage = true;

    const query = linearProjectId
      ? `
        query Issues($teamId: ID!, $projectId: ID!, $after: String) {
          issues(
            filter: {
              team: { id: { eq: $teamId } }
              project: { id: { eq: $projectId } }
            }
            after: $after
            first: 50
          ) {
            nodes {
              id
              title
              description
              state { id name }
              priority
              url
              labels { nodes { name } }
              updatedAt
              project { id }
            }
            pageInfo { hasNextPage endCursor }
          }
        }
      `
      : `
        query Issues($teamId: ID!, $after: String) {
          issues(
            filter: { team: { id: { eq: $teamId } } }
            after: $after
            first: 50
          ) {
            nodes {
              id
              title
              description
              state { id name }
              priority
              url
              labels { nodes { name } }
              updatedAt
              project { id }
            }
            pageInfo { hasNextPage endCursor }
          }
        }
      `;

    while (hasNextPage) {
      const variables: Record<string, unknown> = {
        teamId,
        after,
      };
      if (linearProjectId) {
        variables.projectId = linearProjectId;
      }

      const page: IssuesPage = await this.query<IssuesPage>(query, variables);

      issues.push(...page.issues.nodes);
      hasNextPage = page.issues.pageInfo.hasNextPage;
      after = page.issues.pageInfo.endCursor;
    }

    return issues;
  }

  async createIssue(input: {
    teamId: string;
    title: string;
    description?: string;
    stateId: string;
    priority: number;
    projectId?: string | null;
  }): Promise<{ id: string; url: string }> {
    const data = await this.query<{
      issueCreate: { issue: { id: string; url: string } };
    }>(
      `
      mutation CreateIssue($input: IssueCreateInput!) {
        issueCreate(input: $input) {
          issue { id url }
        }
      }
    `,
      {
        input: {
          teamId: input.teamId,
          title: input.title,
          description: input.description ?? '',
          stateId: input.stateId,
          priority: input.priority,
          projectId: input.projectId ?? undefined,
        },
      },
    );

    return data.issueCreate.issue;
  }

  async updateIssue(input: {
    id: string;
    title?: string;
    description?: string;
    stateId?: string;
    priority?: number;
  }): Promise<void> {
    await this.query(
      `
      mutation UpdateIssue($id: String!, $input: IssueUpdateInput!) {
        issueUpdate(id: $id, input: $input) {
          success
          issue { id url }
        }
      }
    `,
      {
        id: input.id,
        input: {
          title: input.title,
          description: input.description,
          stateId: input.stateId,
          priority: input.priority,
        },
      },
    );
  }

  async deleteIssue(id: string): Promise<void> {
    await this.query(
      `
      mutation DeleteIssue($id: String!) {
        issueDelete(id: $id) { success }
      }
    `,
      { id },
    );
  }

  private async query<T>(
    query: string,
    variables?: Record<string, unknown>,
  ): Promise<T> {
    if (!this.apiKey) {
      throw new LinearApiError('Linear API key is not configured');
    }

    const response = await fetch(LINEAR_GRAPHQL_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: this.apiKey,
      },
      body: JSON.stringify({ query, variables }),
    });

    if (!response.ok) {
      throw new LinearApiError(
        `Linear API request failed (${response.status})`,
        response.status,
      );
    }

    const body = (await response.json()) as GraphQlResponse<T>;
    if (body.errors?.length) {
      throw new LinearApiError(body.errors.map((e) => e.message).join('; '));
    }

    if (!body.data) {
      throw new LinearApiError('Linear API returned no data');
    }

    return body.data;
  }
}
