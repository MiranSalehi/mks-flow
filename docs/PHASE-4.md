# Phase 4 — GitHub Integration
## Cursor Implementation Prompt

---

## Prerequisites

Phases 1, 2, and 3 must be complete.
Read `PROJECT.md` before proceeding.

---

## Phase 4 Goal

Add **two-way sync** between MKSFlow and GitHub.

Three GitHub data sources are supported:
1. **Issues** — create, update, close issues
2. **Project Boards** — sync cards from GitHub Projects v2
3. **Pull Requests** — view and track PRs as tasks (read + comment)

---

## Authentication

GitHub uses OAuth2 with Personal Access Token (PAT) for Phase 4.
Full OAuth2 flow in a future phase.

Required PAT scopes:
```
repo
project
read:user
```

Token stored in `vscode.SecretStorage` under `mksflow.github.token`.

---

## GitHubSyncProvider

### File: `src/infrastructure/sync/GitHubSyncProvider.ts`

Implements `ISyncProvider`.
Uses GitHub REST API v3 and GraphQL API v4.

### Base URLs
- REST: `https://api.github.com`
- GraphQL: `https://api.github.com/graphql`

---

## Sub-Feature 1: GitHub Issues

### Status Mapping
```typescript
const GITHUB_ISSUE_STATUS_MAP = {
  'open':   'todo',    // default for open issues
  'closed': 'done',
};
// Issues with label "in-progress" → 'doing'
// Issues with label "in-review"   → 'test'
```

### Label Strategy
Extension manages status via labels:
- `mksflow:doing` → task is in Doing
- `mksflow:test` → task is in Test

When task moves to Doing: add label `mksflow:doing` to GitHub issue.
When task moves to Test: remove `mksflow:doing`, add `mksflow:test`.
When task is Done: close the issue, remove all mksflow labels.

### REST Endpoints Used

```
GET    /repos/{owner}/{repo}/issues              List issues
POST   /repos/{owner}/{repo}/issues             Create issue
PATCH  /repos/{owner}/{repo}/issues/{number}    Update issue (title, body, state)
POST   /repos/{owner}/{repo}/issues/{number}/labels    Add labels
DELETE /repos/{owner}/{repo}/issues/{number}/labels/{name}  Remove label
GET    /repos/user/repos                        List user repos
```

### Field Mapping
```typescript
// GitHub Issue → Task
{
  externalId:    issue.number.toString(),
  externalUrl:   issue.html_url,
  title:         issue.title,
  description:   issue.body || '',
  tags:          issue.labels.map(l => l.name).filter(l => !l.startsWith('mksflow:')),
  status:        mapGitHubStatus(issue.state, issue.labels),
  priority:      mapGitHubPriority(issue.labels), // via priority labels if set
}

// Task → GitHub Issue
{
  title:  task.title,
  body:   `${task.description}\n\n---\n**Acceptance Criteria:**\n${task.acceptanceCriteria.map(c => `- ${c}`).join('\n')}`,
  labels: [...task.tags, statusToLabel(task.status)],
}
```

---

## Sub-Feature 2: GitHub Project Boards (Projects v2)

Uses GitHub GraphQL API v4.

### GraphQL Queries

```graphql
# Get user's projects
query GetProjects($login: String!) {
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

# Get project items
query GetProjectItems($projectId: ID!, $after: String) {
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
              id
              number
              title
              body
              state
              url
              labels(first: 10) { nodes { name } }
            }
          }
        }
        pageInfo { hasNextPage endCursor }
      }
    }
  }
}

# Update project item status
mutation UpdateItemStatus($projectId: ID!, $itemId: ID!, $fieldId: ID!, $optionId: String!) {
  updateProjectV2ItemFieldValue(input: {
    projectId: $projectId
    itemId: $itemId
    fieldId: $fieldId
    value: { singleSelectOptionId: $optionId }
  }) {
    projectV2Item { id }
  }
}
```

### Status Mapping for Boards
User configures mapping per project:
```
Linear status "In Progress" → our 'doing'
```
GitHub Projects v2 has custom column names — let user map them in settings UI.

---

## Sub-Feature 3: Pull Requests

PRs are **read + comment only** in Phase 4. No PR creation from extension.

### What to show per PR task
- PR title, description, branch name
- Status: Open / Draft / Merged / Closed
- Review status: Approved / Changes Requested / Pending
- Files changed count
- Link to PR on GitHub
- Add comment from extension

### Status Mapping for PRs
```typescript
const PR_STATUS_MAP = {
  'OPEN':   'doing',
  'DRAFT':  'todo',
  'MERGED': 'done',
  'CLOSED': 'done',
}
```

### REST Endpoints for PRs
```
GET  /repos/{owner}/{repo}/pulls                List PRs
GET  /repos/{owner}/{repo}/pulls/{number}       Get PR details
GET  /repos/{owner}/{repo}/pulls/{number}/reviews    Get reviews
POST /repos/{owner}/{repo}/issues/{number}/comments  Add comment
```

---

## New Service

### `src/application/services/GitHubSyncService.ts`

```typescript
class GitHubSyncService {
  connect(token: string): Promise<GitHubUser>
  getRepositories(): Promise<GitHubRepo[]>
  getProjects(): Promise<GitHubProject[]>

  // Issues
  syncIssues(projectId: string, repo: string): Promise<SyncResult>
  pullIssues(repo: string): Promise<ExternalTask[]>
  pushTask(task: Task, repo: string): Promise<void>

  // Boards
  syncBoard(projectId: string, ghProjectId: string): Promise<SyncResult>
  pullBoardItems(ghProjectId: string): Promise<ExternalTask[]>

  // PRs
  getPullRequests(repo: string): Promise<ExternalTask[]>
  addComment(prNumber: number, repo: string, comment: string): Promise<void>

  startAutoSync(projectId: string, intervalMs: number): void
  stopAutoSync(projectId: string): void
}
```

---

## Settings Additions

```json
{
  "mksflow.github.syncInterval": 300,
  "mksflow.github.autoSync": true,
  "mksflow.github.syncMode": "issues | board | prs | all"
}
```

---

## Extension Changes

### Project Settings — GitHub Integration Tab

- "Connect GitHub" → PAT input + test connection
- Repository selector (search box, paginated list)
- Sync mode toggle: Issues / Board / Pull Requests (can select multiple)
- For Boards: GitHub Project selector + column mapping UI
- "Sync Now" button
- Last synced timestamp
- "Disconnect" button

### TaskCard additions (GitHub tasks)
- GitHub Octocat icon badge
- Issue number display (#42)
- PR review status badge (if PR)
- "Open on GitHub" link

### Special PR TaskCard
- Shows: branch name, files changed, review status
- "Add Comment" button → opens input in task detail

---

## New Commands

| Command | ID | Description |
|---|---|---|
| Connect GitHub | `mksflow.connectGitHub` | Open GitHub connection setup |
| Sync GitHub Now | `mksflow.syncGitHub` | Manual sync trigger |
| Disconnect GitHub | `mksflow.disconnectGitHub` | Remove GitHub connection |

---

## Phase 4 Quality Checklist

- [ ] Phases 1, 2, 3 work with no regression
- [ ] PAT stored only in SecretStorage
- [ ] Test connection shows GitHub username
- [ ] Repository list loads correctly (paginated)
- [ ] Issues: pull from GitHub, appear as tasks
- [ ] Issues: create task → appears as GitHub issue
- [ ] Issues: status change reflected via labels
- [ ] Issues: closing task closes GitHub issue
- [ ] Boards: GitHub Projects v2 items pulled correctly
- [ ] Boards: column mapping UI works
- [ ] Boards: status update reflected in project board
- [ ] PRs: list shows with correct status mapping
- [ ] PRs: review status shown on task card
- [ ] PRs: add comment works
- [ ] Auto-sync every 5 min (configurable)
- [ ] Manual sync works
- [ ] Pagination handled for all endpoints
- [ ] Disconnect cleans up all GitHub data
