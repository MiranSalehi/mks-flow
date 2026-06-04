# Phase 1 — Personal Mode (Local)
## Cursor Implementation Prompt

---

## Your Role

You are a senior TypeScript engineer and VS Code extension architect.
Read `PROJECT.md` fully before writing any code.
Write clean, production-grade TypeScript with strict mode enabled.
Follow Clean Architecture: domain → application → infrastructure → presentation.
Add JSDoc comments on all public methods.
Handle all errors gracefully — never let the extension crash.

---

## Phase 1 Scope

Build a **fully local, offline-first** personal task manager.
No network requests. No authentication. No cloud.
All data stored in SQLite via `better-sqlite3`.

---

## Step 1 — Project Scaffolding

Create the complete folder structure defined in `PROJECT.md`.

### Extension `package.json`
```json
{
  "name": "mksflow",
  "displayName": "MKSFlow",
  "description": "AI-native task management for developers using Cursor",
  "version": "0.1.0",
  "publisher": "your-publisher-id",
  "engines": { "vscode": "^1.85.0" },
  "categories": ["Other"],
  "activationEvents": ["onStartupFinished"],
  "main": "./dist/extension.js",
  "contributes": {
    "viewsContainers": {
      "activitybar": [{
        "id": "mksflow",
        "title": "MKSFlow",
        "icon": "media/icon.svg"
      }]
    },
    "views": {
      "mksflow": [{
        "id": "mksflow.taskTree",
        "name": "Tasks",
        "type": "tree"
      }]
    },
    "commands": [
      { "command": "mksflow.quickCapture",   "title": "MKSFlow: Quick Capture" },
      { "command": "mksflow.createProject",  "title": "MKSFlow: Create Project" },
      { "command": "mksflow.deleteProject",  "title": "MKSFlow: Delete Project" },
      { "command": "mksflow.createTask",     "title": "MKSFlow: Create Task" },
      { "command": "mksflow.startTask",      "title": "MKSFlow: Start Task" },
      { "command": "mksflow.readyForTest",   "title": "MKSFlow: Ready For Test" },
      { "command": "mksflow.approveTask",    "title": "MKSFlow: Approve Task" },
      { "command": "mksflow.sendToAI",       "title": "MKSFlow: Send To AI" },
      { "command": "mksflow.openBoard",      "title": "MKSFlow: Open Board" },
      { "command": "mksflow.exportProject",  "title": "MKSFlow: Export Project" },
      { "command": "mksflow.searchTasks",    "title": "MKSFlow: Search Tasks" }
    ],
    "keybindings": [{
      "command": "mksflow.quickCapture",
      "key": "ctrl+shift+t",
      "mac": "cmd+shift+t"
    }],
    "configuration": {
      "title": "MKSFlow",
      "properties": {
        "mksflow.databasePath": {
          "type": "string",
          "default": "",
          "description": "Custom database path. Leave empty to use default."
        },
        "mksflow.defaultPriority": {
          "type": "string",
          "enum": ["low", "medium", "high", "critical"],
          "default": "medium"
        },
        "mksflow.gitIntegration": {
          "type": "boolean",
          "default": true
        },
        "mksflow.showTimerInStatusBar": {
          "type": "boolean",
          "default": true
        },
        "mksflow.quickCaptureDefaultProject": {
          "type": "string",
          "default": "",
          "description": "Default project ID for Quick Capture"
        }
      }
    }
  }
}
```

### Extension dependencies
```json
{
  "dependencies": {
    "better-sqlite3": "^9.4.3",
    "uuid": "^9.0.0"
  },
  "devDependencies": {
    "@types/better-sqlite3": "^7.6.8",
    "@types/node": "^20.x",
    "@types/uuid": "^9.0.7",
    "@types/vscode": "^1.85.0",
    "ts-loader": "^9.5.1",
    "typescript": "^5.3.3",
    "webpack": "^5.89.0",
    "webpack-cli": "^5.1.4"
  }
}
```

### Webview `webview-ui/package.json`
```json
{
  "dependencies": {
    "@dnd-kit/core": "^6.1.0",
    "@dnd-kit/sortable": "^8.0.0",
    "@dnd-kit/utilities": "^3.2.2",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "zustand": "^4.4.7"
  },
  "devDependencies": {
    "@types/react": "^18.2.48",
    "@types/react-dom": "^18.2.18",
    "@vitejs/plugin-react": "^4.2.1",
    "typescript": "^5.3.3",
    "vite": "^5.0.12"
  }
}
```

---

## Step 2 — Domain Layer

Create all models and interfaces exactly as in `PROJECT.md`.

### `src/domain/interfaces/IAIProvider.ts`
```typescript
export interface TaskContext {
  task: Task;
  project: Project;
  workspaceFiles?: string[];
  gitFiles?: GitFiles;
}

export interface AIResponse {
  success: boolean;
  message?: string;
  error?: string;
}

export interface IAIProvider {
  id: string;
  name: string;
  isAvailable(): Promise<boolean>;
  sendPrompt(prompt: string, context: TaskContext): Promise<AIResponse>;
}
```

### `src/domain/interfaces/ISyncProvider.ts`
```typescript
// Prepared for Phase 3, 4, 5 — do not implement yet
export interface ExternalTask {
  externalId: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  url: string;
}

export interface ISyncProvider {
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

## Step 3 — Database Layer

### `src/infrastructure/database/DatabaseManager.ts`

Requirements:
- Singleton pattern with `getInstance(storagePath: string)`
- Auto-creates database directory if it doesn't exist
- Runs SQL migrations on first launch
- WAL mode enabled for performance
- Exposes typed `db` instance of `better-sqlite3`
- `close()` method for clean deactivation

### `src/infrastructure/database/migrations/001_initial.sql`

Use the exact schema from `PROJECT.md`.

---

## Step 4 — Repository Layer

### `src/infrastructure/repositories/ProjectRepository.ts`

Methods:
```typescript
findAll(): Project[]
findById(id: string): Project | null
create(data: CreateProjectDto): Project
update(id: string, data: UpdateProjectDto): Project
delete(id: string): void
```

### `src/infrastructure/repositories/TaskRepository.ts`

Methods:
```typescript
findAll(): Task[]
findByProjectId(projectId: string): Task[]
findByStatus(projectId: string, status: TaskStatus): Task[]
findById(id: string): Task | null
search(projectId: string, query: string, filters: TaskFilters): Task[]
create(data: CreateTaskDto): Task
update(id: string, data: UpdateTaskDto): Task
updateStatus(id: string, status: TaskStatus): Task
startTimer(id: string): Task
stopTimer(id: string): Task
delete(id: string): void
logTransition(taskId: string, from: TaskStatus | null, to: TaskStatus, message: string): void
getTaskLogs(taskId: string): TaskLog[]
```

All methods handle errors gracefully. JSON fields (tags, relatedFiles, acceptanceCriteria) are serialized/deserialized automatically.

---

## Step 5 — Service Layer

### `src/application/services/TaskService.ts`

Lifecycle methods with strict validation:
```typescript
startTask(taskId: string): Task       // validates: must be in 'todo'
readyForTest(taskId: string): Task    // validates: must be in 'doing'
approveTask(taskId: string): Task     // validates: must be in 'test'
```

Every transition calls `logTransition()` automatically.

### `src/application/services/AIPromptService.ts`

```typescript
generatePrompt(task: Task, project: Project): string
copyToClipboard(text: string): Promise<void>
```

Uses the exact prompt template from `PROJECT.md`.
Completely decoupled — no dependency on any AI provider.

### `src/application/services/GitService.ts`

```typescript
interface GitFiles {
  modified: string[];
  added: string[];
  deleted: string[];
}

getChangedFiles(): Promise<GitFiles>
```

Uses `vscode.extensions.getExtension('vscode.git')`.
Returns empty arrays gracefully if git unavailable.

### `src/application/services/TimerService.ts`

```typescript
startTimer(taskId: string): Task
stopTimer(taskId: string): Task
getElapsedTime(task: Task): number        // returns seconds
formatTime(seconds: number): string       // returns "2h 34m"
getActiveTimerTask(): Task | null
```

Timer persists across restarts using `timer_started_at` field in DB.
On extension activation, checks for any task with `timer_started_at` set and resumes tracking.

### `src/application/services/ExportService.ts`

```typescript
exportProject(projectId: string): ExportData
exportToJSON(projectId: string): string
saveExportFile(projectId: string): Promise<void>  // opens save dialog
```

Export includes: project metadata, all tasks, all task logs.

### `src/application/container.ts`

Single place where all dependencies are wired together.
Exports a `Container` class with all services and repositories as properties.

---

## Step 6 — Quick Capture Command

### `src/presentation/commands/quickCaptureCommand.ts`

When triggered (Cmd+Shift+T):
1. Show quick pick to select project (or use default from settings)
2. Show input box for task title
3. Create task immediately with status = 'todo'
4. Show notification: "Task created: {title}"
5. Refresh TreeView

---

## Step 7 — Status Bar

### `src/presentation/statusbar/ActiveTaskStatusBar.ts`

Shows in VS Code status bar (bottom):
```
⚡ Working on: Implement Login — 1h 23m
```

Clicking it opens the task detail in the webview.
Updates every 60 seconds.
Hidden when no task is in "doing" state.

---

## Step 8 — TreeView

### TreeView structure:
```
📁 My Project                    [color dot]
  ├ 📋 Todo (3)
  │   ├ 🔴 Implement Auth        [critical]
  │   └ 🟡 Fix sidebar bug       [medium]
  ├ ⚡ Doing (1)
  │   └ 🟠 Setup database        [high] ▶ 1h 23m
  ├ 🧪 Test (1)
  │   └ 🟢 Write unit tests      [low]
  └ ✅ Done (2)
```

Context menu per task:
- Start Task (if todo)
- Ready For Test (if doing)
- Approve Task (if test)
- Send To AI
- Edit Task
- Delete Task

---

## Step 9 — Webview (React UI)

### Message Protocol (strict types, shared between extension and webview)

```typescript
// Extension → Webview
type ExtensionMessage =
  | { type: 'INIT_DATA';        projects: Project[]; tasks: Task[] }
  | { type: 'TASKS_UPDATED';    tasks: Task[] }
  | { type: 'PROJECTS_UPDATED'; projects: Project[] }
  | { type: 'GIT_FILES';        files: GitFiles }
  | { type: 'TIMER_TICK';       taskId: string; elapsed: number }
  | { type: 'ERROR';            message: string }

// Webview → Extension
type WebviewMessage =
  | { type: 'GET_DATA' }
  | { type: 'CREATE_PROJECT';  name: string; description: string; color: string }
  | { type: 'DELETE_PROJECT';  projectId: string }
  | { type: 'CREATE_TASK';     projectId: string; task: CreateTaskDto }
  | { type: 'UPDATE_TASK';     taskId: string; data: UpdateTaskDto }
  | { type: 'DELETE_TASK';     taskId: string }
  | { type: 'START_TASK';      taskId: string }
  | { type: 'READY_FOR_TEST';  taskId: string }
  | { type: 'APPROVE_TASK';    taskId: string }
  | { type: 'SEND_TO_AI';      taskId: string }
  | { type: 'START_TIMER';     taskId: string }
  | { type: 'STOP_TIMER';      taskId: string }
  | { type: 'GET_GIT_FILES' }
  | { type: 'EXPORT_PROJECT';  projectId: string }
  | { type: 'SEARCH_TASKS';    projectId: string; query: string; filters: TaskFilters }
```

### React Components

**Layout**
- Left sidebar: project list (collapsible)
- Main area: task board for selected project
- Top bar: project name, search bar, filter controls

**ProjectList (sidebar)**
- List all projects with color indicator
- "New Project" button at top
- Active project highlighted
- Right-click: delete project

**TaskBoard**
- 4 columns: Todo / Doing / Test / Done
- Each column header shows task count
- Drag & drop between columns using `@dnd-kit`
- "Add Task" button in every column (creates with that status pre-selected)
- Empty state illustration per column

**TaskCard**
- Title (truncated if too long)
- Priority badge (color-coded: red/orange/yellow/green)
- Tags as small chips
- Timer display (if task is in Doing and timer running)
- Action buttons (context-aware):
  - ▶ Start (if Todo)
  - 🧪 Ready For Test (if Doing)
  - ✅ Approve (if Test)
  - 🤖 Send To AI (always)
  - ✏️ Edit (always)
  - 🗑 Delete (always)
- External link icon if task has `externalUrl`

**TaskDetail (slide-in panel)**
- Full edit form: title, description, priority, tags, relatedFiles, acceptanceCriteria
- Related files: type manually or click "Pick from workspace" (opens VS Code file picker)
- Timer section: start/stop button, elapsed time display
- Git files section: shows modified files, "Add to related files" button
- Task logs timeline at bottom (status transitions with timestamps)

**AIPromptModal**
- Shows generated prompt in a scrollable code block
- "Copy to Clipboard" button with success feedback
- "Close" button

**SearchFilter bar**
- Text search input (searches title + description)
- Priority filter (multi-select chips)
- Tag filter (multi-select chips)
- Clear filters button

### Styling Rules
Use **only** VS Code CSS variables — no hardcoded colors:
```css
--vscode-editor-background
--vscode-editor-foreground
--vscode-sideBar-background
--vscode-button-background
--vscode-button-foreground
--vscode-button-hoverBackground
--vscode-input-background
--vscode-input-foreground
--vscode-input-border
--vscode-focusBorder
--vscode-badge-background
--vscode-badge-foreground
--vscode-list-activeSelectionBackground
--vscode-descriptionForeground
--vscode-errorForeground
--vscode-textLink-foreground
```

Must work perfectly in both dark and light themes.
No hardcoded hex colors anywhere.

---

## Step 10 — Extension Entry Point

### `src/extension.ts`

```typescript
export async function activate(context: vscode.ExtensionContext) {
  // 1. Init DatabaseManager with context.globalStoragePath
  // 2. Build Container (wire all deps)
  // 3. Register all commands
  // 4. Register TaskTreeProvider
  // 5. Create TreeView
  // 6. Register WebviewManager
  // 7. Register ActiveTaskStatusBar
  // 8. Resume any active timers
}

export function deactivate() {
  // 1. Stop all timers cleanly (save elapsed time)
  // 2. Close DB connection
  // 3. Dispose status bar
}
```

---

## Phase 1 Quality Checklist

Before Phase 1 is complete, verify all of these:

- [ ] Extension activates without errors
- [ ] SQLite DB created in globalStoragePath automatically
- [ ] Can create, edit, delete projects
- [ ] Can create, edit, delete tasks
- [ ] Task moves through all 4 statuses correctly
- [ ] Invalid transitions are blocked with clear error message
- [ ] Every transition logged with timestamp
- [ ] Quick Capture (Cmd+Shift+T) works from anywhere
- [ ] Timer starts when task moves to Doing
- [ ] Timer shows in Status Bar with elapsed time
- [ ] Timer resumes correctly after VS Code restart
- [ ] Send to AI writes `.mksflow/tasks/{taskId}.md` in workspace
- [ ] Current Composer chat receives `@.mksflow/tasks/...` prompt (no new chat tab)
- [ ] AI context modal shows file path and copy @reference (clipboard fallback uses legacy modal)
- [ ] Webview board shows all 4 columns
- [ ] Drag & drop moves tasks between columns
- [ ] Search and filter works correctly
- [ ] Export to JSON works and opens save dialog
- [ ] TreeView reflects live data
- [ ] Git changed files shown in task detail
- [ ] Works perfectly in dark theme
- [ ] Works perfectly in light theme
- [ ] Extension deactivates cleanly (no hanging processes)

---

## What NOT to Build in Phase 1

Do not implement any of these — they are for later phases:
- Authentication or user accounts
- Network requests or API calls
- Team features or roles
- Linear / GitHub / Notion sync
- Cursor / Claude / OpenAI API calls

The interfaces (`IAIProvider`, `ISyncProvider`) must exist and be ready,
but only the Clipboard adapter needs to be implemented.
