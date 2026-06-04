# Phase 3 — Linear Integration
## Cursor Implementation Prompt

---

## Prerequisites

Phases 1 and 2 must be complete.
The `ISyncProvider` interface from Phase 1 must already exist.
Read `PROJECT.md` before proceeding.

---

## Phase 3 Goal

Add **two-way sync** between MKSFlow and Linear.

A developer can:
- Connect their Linear workspace to a project
- Pull Linear issues into the extension as tasks
- Push tasks created in the extension to Linear
- See status changes reflected in both directions automatically

---

## ISyncProvider Interface (already exists from Phase 1)

```typescript
interface ISyncProvider {
  id: string;
  name: string;
  isConfigured(): boolean;
  pullTasks(projectId: string): Promise<ExternalTask[]>;
  pushTask(task: Task): Promise<string>;
  updateTask(task: Task): Promise<void>;
  deleteTask(externalId: string): Promise<void>;
  mapToTask(external: ExternalTask): CreateTaskDto;
}
```

---

## LinearSyncProvider

### File: `src/infrastructure/sync/LinearSyncProvider.ts`

Implements `ISyncProvider` using Linear's GraphQL API.

### Authentication
- Linear uses Personal API Keys or OAuth2
- Phase 3: Personal API Key only (OAuth2 in future)
- Key stored in `vscode.SecretStorage` under key `mksflow.linear.apiKey`
- Never logged, never in settings file

### Linear API Details
- GraphQL endpoint: `https://api.linear.app/graphql`
- Docs: https://developers.linear.app/docs

### Status Mapping

```typescript
const LINEAR_STATUS_MAP: Record<string, TaskStatus> = {
  'Todo':        'todo',
  'In Progress': 'doing',
  'In Review':   'test',
  'Done':        'done',
  'Cancelled':   'done',
  'Backlog':     'todo',
};

const TASK_TO_LINEAR_MAP: Record<TaskStatus, string> = {
  'todo':  'Todo',
  'doing': 'In Progress',
  'test':  'In Review',
  'done':  'Done',
};
```

Note: Linear state names vary per team — fetch the actual states from Linear API and let user map them.

### Priority Mapping

```typescript
const LINEAR_PRIORITY_MAP: Record<number, TaskPriority> = {
  0: 'low',      // No priority
  1: 'critical', // Urgent
  2: 'high',
  3: 'medium',
  4: 'low',
};
```

### GraphQL Queries to Implement

```graphql
# Get teams and projects
query GetTeams {
  teams {
    nodes {
      id
      name
      states { nodes { id name } }
      projects { nodes { id name } }
    }
  }
}

# Get issues for a project
query GetIssues($teamId: String!, $after: String) {
  issues(filter: { team: { id: { eq: $teamId } } }, after: $after) {
    nodes {
      id
      title
      description
      state { name }
      priority
      url
      labels { nodes { name } }
      updatedAt
    }
    pageInfo { hasNextPage endCursor }
  }
}

# Create issue
mutation CreateIssue($input: IssueCreateInput!) {
  issueCreate(input: $input) {
    issue { id url }
  }
}

# Update issue status
mutation UpdateIssue($id: String!, $stateId: String!) {
  issueUpdate(id: $id, input: { stateId: $stateId }) {
    issue { id state { name } }
  }
}
```

---

## New Service

### `src/application/services/LinearSyncService.ts`

```typescript
class LinearSyncService {
  connect(apiKey: string): Promise<boolean>
  getTeams(): Promise<LinearTeam[]>
  getProjects(teamId: string): Promise<LinearProject[]>
  syncProject(projectId: string, linearTeamId: string): Promise<SyncResult>
  pullChanges(projectId: string): Promise<SyncResult>
  pushTask(task: Task): Promise<void>
  startAutoSync(projectId: string, intervalMs: number): void
  stopAutoSync(projectId: string): void
}

interface SyncResult {
  pulled: number;
  pushed: number;
  conflicts: number;
  errors: string[];
}
```

### Conflict Resolution Strategy
- **Last write wins** based on `updatedAt` timestamp
- If both sides changed since last sync: prefer Linear (source of truth)
- Log conflict to task log with message "Sync conflict resolved: Linear version used"

### Sync Interval
- Default: every 5 minutes
- Configurable via settings
- Manual "Sync Now" button always available

---

## Settings Additions

```json
{
  "mksflow.linear.syncInterval": 300,
  "mksflow.linear.autoSync": true
}
```

API key is stored in SecretStorage only — never in settings.

---

## Extension Changes

### Project Settings Panel (new screen in webview)

When editing a project, show "Integrations" tab with:

**Linear section:**
- "Connect Linear" button (if not connected)
- API key input field (masked)
- "Test Connection" button → shows connected workspace name
- Team selector dropdown
- Project selector dropdown (filtered by team)
- "Sync Now" button
- Last synced timestamp
- "Disconnect" button

### TaskCard additions (Linear tasks)
- Linear icon badge
- "Open in Linear" link (opens `externalUrl` in browser)
- "Last synced" tooltip on hover

### Sync Status Bar Item
Shows bottom-right in VS Code:
```
↕ Linear: synced 2m ago
```

Red if sync error. Click to open sync log.

---

## New Commands

| Command | ID | Description |
|---|---|---|
| Connect Linear | `mksflow.connectLinear` | Open Linear connection setup |
| Sync Linear Now | `mksflow.syncLinear` | Manual sync trigger |
| Disconnect Linear | `mksflow.disconnectLinear` | Remove Linear connection |

---

## Phase 3 Quality Checklist

- [ ] Phases 1 and 2 work with no regression
- [ ] API key stored only in SecretStorage
- [ ] Test connection shows workspace name or clear error
- [ ] Teams and projects load from Linear correctly
- [ ] Pull: Linear issues imported as tasks with correct status/priority mapping
- [ ] Push: tasks created in extension appear in Linear
- [ ] Status update in extension reflects in Linear
- [ ] Status update in Linear reflects in extension on next sync
- [ ] Conflict resolution logs correctly
- [ ] Auto-sync runs every 5 minutes (configurable)
- [ ] Manual sync works
- [ ] Sync errors shown non-intrusively
- [ ] "Open in Linear" link works
- [ ] Pagination handled (projects with 100+ issues)
- [ ] Disconnect removes all Linear data cleanly
