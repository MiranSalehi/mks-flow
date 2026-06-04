# MKSFlow — Master Project Document

---

## Vision

A production-ready VS Code / Cursor extension that acts as an
**AI-native task management system** for developers.

Not just a Kanban board — a bridge between:
- Your tasks and your AI coding assistant
- Your local workflow and your team
- Your extension and external tools (Linear, GitHub, Notion)

---

## Modes (5 Total)

| Mode | Description | Phase |
|---|---|---|
| **Personal** | Fully local, SQLite, no internet needed | Phase 1 |
| **Team** | Cloud sync, members, roles, owner approval | Phase 2 |
| **Linear** | Two-way sync with Linear issues | Phase 3 |
| **GitHub** | Two-way sync with Issues, Boards, Pull Requests | Phase 4 |
| **Notion** | Receive and sync Notion boards | Phase 5 |

Each mode is **independently selectable per project**.
Multiple modes can be active at the same time in different projects.

---

## Domain Models

### Project
```typescript
interface Project {
  id: string;
  name: string;
  description: string;
  mode: ProjectMode;           // 'personal' | 'team' | 'linear' | 'github' | 'notion'
  color: string;               // hex color for UI identification
  createdAt: Date;
  updatedAt: Date;
}
```

### Task
```typescript
interface Task {
  id: string;
  projectId: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  tags: string[];
  relatedFiles: string[];       // file paths or glob patterns
  acceptanceCriteria: string[];
  timeTracked: number;          // seconds tracked via built-in timer
  timerStartedAt: Date | null;  // null = timer not running
  externalId: string | null;    // ID in Linear / GitHub / Notion
  externalProvider: string | null;
  externalUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

type TaskStatus   = 'todo' | 'doing' | 'test' | 'done';
type TaskPriority = 'low' | 'medium' | 'high' | 'critical';
type ProjectMode  = 'personal' | 'team' | 'linear' | 'github' | 'notion';
```

### TaskLog
```typescript
interface TaskLog {
  id: string;
  taskId: string;
  fromStatus: TaskStatus | null;
  toStatus: TaskStatus;
  message: string;
  createdAt: Date;
}
```

---

## Database Schema (SQLite — Phase 1)

```sql
CREATE TABLE projects (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  description TEXT DEFAULT '',
  mode        TEXT NOT NULL DEFAULT 'personal',
  color       TEXT NOT NULL DEFAULT '#007ACC',
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);

CREATE TABLE tasks (
  id                  TEXT PRIMARY KEY,
  project_id          TEXT NOT NULL,
  title               TEXT NOT NULL,
  description         TEXT DEFAULT '',
  status              TEXT NOT NULL DEFAULT 'todo',
  priority            TEXT NOT NULL DEFAULT 'medium',
  tags                TEXT DEFAULT '[]',
  related_files       TEXT DEFAULT '[]',
  acceptance_criteria TEXT DEFAULT '[]',
  time_tracked        INTEGER DEFAULT 0,
  timer_started_at    TEXT DEFAULT NULL,
  external_id         TEXT DEFAULT NULL,
  external_provider   TEXT DEFAULT NULL,
  external_url        TEXT DEFAULT NULL,
  created_at          TEXT NOT NULL,
  updated_at          TEXT NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE TABLE task_logs (
  id          TEXT PRIMARY KEY,
  task_id     TEXT NOT NULL,
  from_status TEXT,
  to_status   TEXT NOT NULL,
  message     TEXT DEFAULT '',
  created_at  TEXT NOT NULL,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
);
```

---

## Folder Structure

```
mksflow/
├── package.json
├── tsconfig.json
├── webpack.config.js
├── .vscodeignore
├── README.md
├── media/
│   └── icon.svg
│
├── src/
│   ├── extension.ts
│   │
│   ├── domain/
│   │   ├── models/
│   │   │   ├── Project.ts
│   │   │   ├── Task.ts
│   │   │   └── TaskLog.ts
│   │   └── interfaces/
│   │       ├── IProjectRepository.ts
│   │       ├── ITaskRepository.ts
│   │       ├── IAIProvider.ts
│   │       └── ISyncProvider.ts      ← future sync adapters
│   │
│   ├── infrastructure/
│   │   ├── database/
│   │   │   ├── DatabaseManager.ts
│   │   │   └── migrations/
│   │   │       └── 001_initial.sql
│   │   ├── repositories/
│   │   │   ├── ProjectRepository.ts
│   │   │   └── TaskRepository.ts
│   │   └── ai/
│   │       └── adapters/
│   │           └── ClipboardAIAdapter.ts
│   │
│   ├── application/
│   │   ├── services/
│   │   │   ├── ProjectService.ts
│   │   │   ├── TaskService.ts
│   │   │   ├── AIPromptService.ts
│   │   │   ├── GitService.ts
│   │   │   ├── TimerService.ts       ← NEW
│   │   │   └── ExportService.ts      ← NEW
│   │   └── container.ts
│   │
│   ├── presentation/
│   │   ├── treeview/
│   │   │   ├── TaskTreeProvider.ts
│   │   │   └── TreeItems.ts
│   │   ├── webview/
│   │   │   ├── WebviewManager.ts
│   │   │   └── panels/
│   │   │       └── MainPanel.ts
│   │   ├── statusbar/
│   │   │   └── ActiveTaskStatusBar.ts  ← NEW
│   │   └── commands/
│   │       ├── index.ts
│   │       ├── projectCommands.ts
│   │       ├── taskCommands.ts
│   │       └── quickCaptureCommand.ts  ← NEW
│   │
│   └── shared/
│       ├── constants.ts
│       ├── utils.ts
│       └── types.ts
│
└── webview-ui/
    ├── package.json
    ├── tsconfig.json
    ├── vite.config.ts
    └── src/
        ├── main.tsx
        ├── App.tsx
        ├── components/
        │   ├── Layout/
        │   │   ├── Layout.tsx
        │   │   └── Sidebar.tsx
        │   ├── ProjectList/
        │   │   ├── ProjectList.tsx
        │   │   └── ProjectItem.tsx
        │   ├── TaskBoard/
        │   │   ├── TaskBoard.tsx
        │   │   ├── TaskColumn.tsx
        │   │   └── TaskCard.tsx
        │   ├── TaskDetail/
        │   │   ├── TaskDetail.tsx
        │   │   └── AIPromptModal.tsx
        │   ├── SearchFilter/           ← NEW
        │   │   └── SearchFilter.tsx
        │   └── shared/
        │       ├── Badge.tsx
        │       ├── Button.tsx
        │       └── Modal.tsx
        ├── hooks/
        │   ├── useVSCode.ts
        │   ├── useProjects.ts
        │   ├── useTasks.ts
        │   └── useTimer.ts             ← NEW
        ├── store/
        │   └── appStore.ts
        └── styles/
            └── globals.css
```

---

## AI Integration Architecture

### Phase 1 — Cursor Composer (default) or Clipboard
- **cursor (default):** write `.mksflow/tasks/{taskId}.md` → focus current Composer → paste `@.mksflow/tasks/...` into the active chat input (no new chat tab)
- **clipboard:** full markdown prompt → clipboard → legacy modal in webview

### Future Providers (via IAIProvider interface)
```typescript
interface IAIProvider {
  id: string;
  name: string;
  isAvailable(): Promise<boolean>;
  sendPrompt(prompt: string, context: TaskContext): Promise<AIResponse>;
}
// Future: CursorAdapter, ClaudeAdapter, OpenAIAdapter, MCPAdapter
```

### Prompt Template
```
## Current Task: {title}

**Project:** {projectName}
**Priority:** {priority}
**Status:** {status}

---

## Description
{description}

---

## Acceptance Criteria
{acceptanceCriteria.map(c => `- ${c}`)}

---

## Related Files
{relatedFiles.map(f => `- ${f}`)}

---

## Instructions
Please help me implement this task.
Analyze the related files and suggest a clear implementation plan.
Focus strictly on the acceptance criteria listed above.
```

---

## Task Lifecycle

```
[Todo] --[Start Task]--> [Doing] --[Ready For Test]--> [Test] --[Approve Task]--> [Done]
```

Every transition is logged in `task_logs` with timestamp and message.

---

## Git Integration (Phase 1 — Read Only)

- Uses VS Code built-in git extension API
- Shows modified / added / deleted files
- Associates changed files with the active Doing task
- No commits from the extension

---

## VS Code Commands

| Command | ID | Description |
|---|---|---|
| Quick Capture | `mksflow.quickCapture` | Create task instantly via shortcut |
| Create Project | `mksflow.createProject` | Create new project |
| Delete Project | `mksflow.deleteProject` | Delete project and all its tasks |
| Create Task | `mksflow.createTask` | Create task in selected project |
| Start Task | `mksflow.startTask` | Todo → Doing |
| Ready For Test | `mksflow.readyForTest` | Doing → Test |
| Approve Task | `mksflow.approveTask` | Test → Done |
| Send To AI | `mksflow.sendToAI` | Generate and copy AI prompt |
| Open Board | `mksflow.openBoard` | Open webview board |
| Export Project | `mksflow.exportProject` | Export project to JSON |
| Search Tasks | `mksflow.searchTasks` | Open search/filter panel |

---

## Technology Stack

| Layer | Technology |
|---|---|
| Language | TypeScript 5.x strict mode |
| Extension API | VS Code Extension API 1.85+ |
| Webview UI | React 18 + Vite |
| Styling | VS Code CSS Variables only |
| Drag & Drop | @dnd-kit/core + @dnd-kit/sortable |
| State Management | Zustand |
| Database | better-sqlite3 |
| Build (extension) | Webpack |
| Build (webview) | Vite |
| Testing | Jest + @vscode/test-electron |

---

## Error Handling Strategy

- All service methods return `Result<T, Error>` pattern or throw typed errors
- SQLite errors caught → `vscode.window.showErrorMessage`
- Git errors non-fatal → Git panel shows "Git unavailable" gracefully
- Webview errors caught by React Error Boundaries
- DB corruption → extension offers to reset and start fresh
- Timer persists across extension restarts via DB

---

## Settings (VS Code settings.json)

```json
{
  "mksflow.databasePath": "",
  "mksflow.defaultPriority": "medium",
  "mksflow.gitIntegration": true,
  "mksflow.aiProvider": "clipboard",
  "mksflow.showTimerInStatusBar": true,
  "mksflow.quickCaptureDefaultProject": ""
}
```

---

## Full Roadmap

| Phase | Feature | Status |
|---|---|---|
| 1 | Personal Mode — local, SQLite, full board, timer, export | 🔨 Build first |
| 2 | Team Mode — cloud API, auth, roles, owner approval | 📋 Planned |
| 3 | Linear Integration — two-way sync | 📋 Planned |
| 4 | GitHub Integration — Issues, Boards, PRs | 📋 Planned |
| 5 | Notion Integration — board sync | 📋 Planned |
