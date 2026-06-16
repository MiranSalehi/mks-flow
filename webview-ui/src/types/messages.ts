export type TaskStatus = 'todo' | 'doing' | 'test' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';
export type ProjectMode = 'personal' | 'team' | 'linear' | 'github' | 'notion';
export type BoardMode = 'personal' | 'team';
export type TaskSource = 'local' | 'cloud';
export type CloudSyncStatus = 'idle' | 'syncing' | 'offline' | 'error';

export interface GitFiles {
  modified: string[];
  added: string[];
  deleted: string[];
}

export interface CloudUser {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  mode: ProjectMode;
  color: string;
  createdAt: string;
  updatedAt: string;
}

export interface TaskDescriptionImage {
  id: string;
  fileName: string;
  mimeType: string;
  relativePath: string;
  uri: string;
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description: string;
  descriptionImages: TaskDescriptionImage[];
  status: TaskStatus;
  priority: TaskPriority;
  tags: string[];
  relatedFiles: string[];
  acceptanceCriteria: string[];
  timeTracked: number;
  timerStartedAt: string | null;
  externalId: string | null;
  externalProvider: string | null;
  externalUrl: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  source: TaskSource;
  assignedTo: string | null;
  createdBy: string | null;
  teamId: string | null;
  pullRequestUrl?: string | null;
  agentWorkflowStatus?: string | null;
  currentIteration?: number | null;
  acceptedIteration?: number | null;
}

export interface TaskLog {
  id: string;
  taskId: string;
  fromStatus: TaskStatus | null;
  toStatus: TaskStatus;
  message: string;
  createdAt: string;
}

export interface TaskFilters {
  statuses?: TaskStatus[];
  priorities?: TaskPriority[];
  tags?: string[];
}

export type ExtensionMessage =
  | { type: 'INIT_DATA'; projects: Project[]; tasks: Task[] }
  | { type: 'TASKS_UPDATED'; tasks: Task[] }
  | { type: 'PROJECTS_UPDATED'; projects: Project[] }
  | { type: 'TASK_LOGS'; taskId: string; logs: TaskLog[] }
  | { type: 'GIT_FILES'; files: GitFiles }
  | { type: 'TIMER_TICK'; taskId: string; elapsed: number }
  | { type: 'AI_PROMPT'; taskId: string; prompt: string }
  | {
      type: 'AI_CONTEXT_READY';
      taskId: string;
      relativePath: string;
      contextFilePath: string;
      chatPrompt: string;
      markdown?: string;
      providerName?: string;
      attachedToChat?: boolean;
    }
  | { type: 'OPEN_TASK'; taskId: string }
  | { type: 'WORKSPACE_FILES_PICKED'; files: string[] }
  | { type: 'ERROR'; message: string }
  | {
      type: 'CLOUD_AUTH_STATE';
      isAuthenticated: boolean;
      user?: CloudUser;
      lastSyncAt?: string | null;
    }
  | {
      type: 'CLOUD_SYNC_STATUS';
      status: CloudSyncStatus;
      message?: string;
    }
  | { type: 'BOARD_MODE'; mode: BoardMode }
  | {
      type: 'CLOUD_ATTACHMENT_URI';
      taskId: string;
      attachmentId: string;
      uri: string;
    }
  | {
      type: 'CLOUD_ATTACHMENT_FAILED';
      taskId: string;
      attachmentId: string;
    }
  | { type: 'OPEN_LINEAR_SETUP' }
  | {
      type: 'LINEAR_STATE';
      connected: boolean;
      viewerName: string | null;
      organization: string | null;
      syncStatus: 'idle' | 'syncing' | 'error';
      syncMessage: string | null;
      lastSyncAt: string | null;
    }
  | { type: 'LINEAR_TEAMS'; teams: LinearTeamOption[] }
  | {
      type: 'LINEAR_PROJECT_CONFIG';
      projectId: string;
      config: LinearProjectConfig | null;
    }
  | {
      type: 'LINEAR_SYNC_RESULT';
      projectId: string;
      pulled: number;
      pushed: number;
      conflicts: number;
      errors: string[];
    }
  | { type: 'OPEN_GITHUB_SETUP' }
  | {
      type: 'GITHUB_STATE';
      connected: boolean;
      username: string | null;
      syncStatus: 'idle' | 'syncing' | 'error';
      syncMessage: string | null;
      lastSyncAt: string | null;
    }
  | { type: 'GITHUB_REPOS'; repos: GitHubRepo[] }
  | { type: 'GITHUB_PROJECTS'; projects: GitHubProject[] }
  | {
      type: 'GITHUB_PROJECT_CONFIG';
      projectId: string;
      config: GitHubProjectConfig | null;
    }
  | {
      type: 'GITHUB_SYNC_RESULT';
      projectId: string;
      pulled: number;
      pushed: number;
      conflicts: number;
      errors: string[];
    }
  | { type: 'OPEN_NOTION_SETUP' }
  | {
      type: 'NOTION_STATE';
      connected: boolean;
      workspaceName: string | null;
      syncStatus: 'idle' | 'syncing' | 'error';
      syncMessage: string | null;
      lastSyncAt: string | null;
    }
  | { type: 'NOTION_DATABASES'; databases: NotionDatabase[] }
  | {
      type: 'NOTION_DATABASE_SCHEMA';
      databaseId: string;
      mapping: NotionPropertyMapping;
    }
  | {
      type: 'NOTION_PROJECT_CONFIG';
      projectId: string;
      config: NotionProjectConfig | null;
    }
  | {
      type: 'NOTION_SYNC_RESULT';
      projectId: string;
      pulled: number;
      pushed: number;
      conflicts: number;
      errors: string[];
    };

export type GitHubSyncMode = 'issues' | 'prs' | 'board';

export interface GitHubRepo {
  id: number;
  name: string;
  fullName: string;
  owner: string;
  private: boolean;
}

export interface GitHubProject {
  id: string;
  title: string;
  statusFieldId: string | null;
  columns: { id: string; name: string }[];
}

export interface GitHubProjectConfig {
  owner: string;
  repo: string;
  repoFullName: string;
  syncModes: GitHubSyncMode[];
  ghProjectId: string | null;
  ghProjectTitle: string | null;
  lastSyncAt: string | null;
}

export type GitHubSyncStatus = 'idle' | 'syncing' | 'error';

export interface NotionDatabase {
  id: string;
  title: string;
  icon: string | null;
  url: string;
}

export interface NotionPropertyMapping {
  titleProperty: string;
  statusProperty: string | null;
  priorityProperty: string | null;
  tagsProperty: string | null;
  descriptionProperty: string | null;
  statusMap: Record<string, TaskStatus>;
  priorityMap: Record<string, TaskPriority>;
  statusOptions: string[];
  priorityOptions: string[];
}

export interface NotionProjectConfig {
  databaseId: string;
  databaseTitle: string;
  databaseUrl: string;
  titleProperty: string;
  statusProperty: string | null;
  priorityProperty: string | null;
  tagsProperty: string | null;
  descriptionProperty: string | null;
  statusMap: Record<string, TaskStatus>;
  priorityMap: Record<string, TaskPriority>;
  lastSyncAt: string | null;
}

export type NotionSyncStatus = 'idle' | 'syncing' | 'error';

export interface LinearTeamOption {
  id: string;
  name: string;
  states: { id: string; name: string; type: string }[];
  projects: { id: string; name: string }[];
}

export interface LinearProjectConfig {
  linearTeamId: string;
  linearTeamName: string;
  linearProjectId: string | null;
  linearProjectName: string | null;
  lastSyncAt: string | null;
}

export type LinearSyncStatus = 'idle' | 'syncing' | 'error';

export type WebviewMessage =
  | { type: 'GET_DATA' }
  | { type: 'CREATE_PROJECT'; name: string; description: string; color: string }
  | { type: 'DELETE_PROJECT'; projectId: string }
  | {
      type: 'CREATE_TASK';
      projectId: string;
      task: {
        title: string;
        description?: string;
        status?: TaskStatus;
        priority?: TaskPriority;
        tags?: string[];
      };
    }
  | {
      type: 'UPDATE_TASK';
      taskId: string;
      data: Partial<
        Pick<
          Task,
          | 'title'
          | 'description'
          | 'priority'
          | 'tags'
          | 'relatedFiles'
          | 'acceptanceCriteria'
        >
      >;
    }
  | { type: 'DELETE_TASK'; taskId: string }
  | { type: 'START_TASK'; taskId: string }
  | { type: 'READY_FOR_TEST'; taskId: string }
  | { type: 'APPROVE_TASK'; taskId: string }
  | {
      type: 'MOVE_TASK';
      taskId: string;
      toStatus: TaskStatus;
      insertAt?: number;
    }
  | {
      type: 'REORDER_TASKS';
      projectId: string;
      status: TaskStatus;
      taskIds: string[];
    }
  | { type: 'SEND_TO_AI'; taskId: string }
  | { type: 'START_TIMER'; taskId: string }
  | { type: 'STOP_TIMER'; taskId: string }
  | { type: 'GET_GIT_FILES' }
  | { type: 'GET_TASK_LOGS'; taskId: string }
  | { type: 'PICK_WORKSPACE_FILES' }
  | {
      type: 'ATTACH_TASK_IMAGE';
      taskId: string;
      fileName: string;
      mimeType: string;
      dataBase64: string;
    }
  | { type: 'PICK_TASK_IMAGES'; taskId: string }
  | { type: 'PASTE_TASK_IMAGE_FROM_CLIPBOARD'; taskId: string }
  | { type: 'REMOVE_TASK_IMAGE'; taskId: string; imageId: string }
  | { type: 'OPEN_TASK_CONTEXT_FILE'; taskId: string }
  | { type: 'EXPORT_PROJECT'; projectId: string }
  | { type: 'SEARCH_TASKS'; projectId: string; query: string; filters: TaskFilters }
  | { type: 'SET_BOARD_MODE'; mode: BoardMode }
  | { type: 'CLOUD_LOGIN'; email: string; password: string }
  | { type: 'CLOUD_LOGOUT' }
  | { type: 'CLOUD_SYNC_NOW' }
  | { type: 'OPEN_CLOUD_TASK'; projectId: string; taskId: string }
  | { type: 'OPEN_CLOUD_WEB_APP' }
  | {
      type: 'RESOLVE_CLOUD_ATTACHMENT';
      taskId: string;
      attachmentId: string;
      mimeType: string;
    }
  | { type: 'LINEAR_CONNECT'; apiKey: string }
  | { type: 'LINEAR_DISCONNECT' }
  | { type: 'LINEAR_TEST_CONNECTION' }
  | { type: 'LINEAR_GET_TEAMS' }
  | { type: 'LINEAR_GET_PROJECT_CONFIG'; projectId: string }
  | {
      type: 'LINEAR_LINK_PROJECT';
      projectId: string;
      teamId: string;
      linearProjectId: string | null;
    }
  | { type: 'LINEAR_UNLINK_PROJECT'; projectId: string }
  | { type: 'LINEAR_SYNC_NOW'; projectId?: string }
  | { type: 'GITHUB_CONNECT'; token: string }
  | { type: 'GITHUB_DISCONNECT' }
  | { type: 'GITHUB_TEST_CONNECTION' }
  | { type: 'GITHUB_GET_REPOS' }
  | { type: 'GITHUB_GET_PROJECTS' }
  | { type: 'GITHUB_GET_PROJECT_CONFIG'; projectId: string }
  | {
      type: 'GITHUB_LINK_PROJECT';
      projectId: string;
      repoFullName: string;
      owner: string;
      repo: string;
      syncModes: GitHubSyncMode[];
      ghProjectId: string | null;
    }
  | { type: 'GITHUB_UNLINK_PROJECT'; projectId: string }
  | { type: 'GITHUB_SYNC_NOW'; projectId?: string }
  | { type: 'GITHUB_PR_COMMENT'; taskId: string; comment: string }
  | { type: 'NOTION_CONNECT'; token: string }
  | { type: 'NOTION_DISCONNECT' }
  | { type: 'NOTION_TEST_CONNECTION' }
  | { type: 'NOTION_GET_DATABASES' }
  | { type: 'NOTION_GET_DATABASE_SCHEMA'; databaseId: string }
  | { type: 'NOTION_GET_PROJECT_CONFIG'; projectId: string }
  | {
      type: 'NOTION_LINK_PROJECT';
      projectId: string;
      databaseId: string;
      statusMap?: Record<string, TaskStatus>;
      priorityMap?: Record<string, TaskPriority>;
    }
  | { type: 'NOTION_UNLINK_PROJECT'; projectId: string }
  | { type: 'NOTION_SYNC_NOW'; projectId?: string };

export const STATUSES: TaskStatus[] = ['todo', 'doing', 'test', 'done'];

export const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: 'To Do',
  doing: 'Doing',
  test: 'Test',
  done: 'Done',
};

export const COLUMN_SUBTITLES: Record<TaskStatus, string> = {
  todo: 'Plan & Queue',
  doing: 'In Progress',
  test: 'Review & QA',
  done: 'Shipped',
};

export const PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical',
};
