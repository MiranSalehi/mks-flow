import type { Project } from '../domain/models/Project';
import type { TaskLog } from '../domain/models/TaskLog';
import type {
  CreateTaskDto,
  Task,
  TaskFilters,
  UpdateTaskDto,
} from '../domain/models/Task';
import type { BoardMode, CloudSyncStatus } from './cloudConfig';
import type { GitFiles, TaskPriority, TaskStatus } from '../domain/types';

export type TaskSource = 'local' | 'cloud';

export interface CloudUser {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
}

/** JSON-safe project payload for webview messaging. */
export interface SerializedProject {
  id: string;
  name: string;
  description: string;
  mode: Project['mode'];
  color: string;
  createdAt: string;
  updatedAt: string;
}

/** JSON-safe description image for webview previews. */
export interface SerializedDescriptionImage {
  id: string;
  fileName: string;
  mimeType: string;
  relativePath: string;
  uri: string;
}

/** JSON-safe task payload for webview messaging. */
export interface SerializedTask {
  id: string;
  projectId: string;
  title: string;
  description: string;
  descriptionImages: SerializedDescriptionImage[];
  status: Task['status'];
  priority: Task['priority'];
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
}

/** JSON-safe task log payload for webview messaging. */
export interface SerializedTaskLog {
  id: string;
  taskId: string;
  fromStatus: TaskLog['fromStatus'];
  toStatus: TaskLog['toStatus'];
  message: string;
  createdAt: string;
}

/** Messages sent from the extension host to the webview. */
export type ExtensionMessage =
  | { type: 'INIT_DATA'; projects: SerializedProject[]; tasks: SerializedTask[] }
  | { type: 'TASKS_UPDATED'; tasks: SerializedTask[] }
  | { type: 'PROJECTS_UPDATED'; projects: SerializedProject[] }
  | { type: 'TASK_LOGS'; taskId: string; logs: SerializedTaskLog[] }
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
  | {
      type: 'LINEAR_TEAMS';
      teams: SerializedLinearTeam[];
    }
  | {
      type: 'LINEAR_PROJECT_CONFIG';
      projectId: string;
      config: SerializedLinearProjectConfig | null;
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
  | { type: 'GITHUB_REPOS'; repos: SerializedGitHubRepo[] }
  | { type: 'GITHUB_PROJECTS'; projects: SerializedGitHubProject[] }
  | {
      type: 'GITHUB_PROJECT_CONFIG';
      projectId: string;
      config: SerializedGitHubProjectConfig | null;
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
  | { type: 'NOTION_DATABASES'; databases: SerializedNotionDatabase[] }
  | {
      type: 'NOTION_DATABASE_SCHEMA';
      databaseId: string;
      mapping: SerializedNotionPropertyMapping;
    }
  | {
      type: 'NOTION_PROJECT_CONFIG';
      projectId: string;
      config: SerializedNotionProjectConfig | null;
    }
  | {
      type: 'NOTION_SYNC_RESULT';
      projectId: string;
      pulled: number;
      pushed: number;
      conflicts: number;
      errors: string[];
    };

export interface SerializedGitHubRepo {
  id: number;
  name: string;
  fullName: string;
  owner: string;
  private: boolean;
}

export interface SerializedGitHubProject {
  id: string;
  title: string;
  statusFieldId: string | null;
  columns: { id: string; name: string }[];
}

export interface SerializedGitHubProjectConfig {
  owner: string;
  repo: string;
  repoFullName: string;
  syncModes: ('issues' | 'prs' | 'board')[];
  ghProjectId: string | null;
  ghProjectTitle: string | null;
  lastSyncAt: string | null;
}

export interface SerializedLinearTeam {
  id: string;
  name: string;
  states: { id: string; name: string; type: string }[];
  projects: { id: string; name: string }[];
}

export interface SerializedLinearProjectConfig {
  linearTeamId: string;
  linearTeamName: string;
  linearProjectId: string | null;
  linearProjectName: string | null;
  lastSyncAt: string | null;
}

export interface SerializedNotionDatabase {
  id: string;
  title: string;
  icon: string | null;
  url: string;
}

export interface SerializedNotionPropertyMapping {
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

export interface SerializedNotionProjectConfig {
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

/** Messages sent from the webview to the extension host. */
export type WebviewMessage =
  | { type: 'GET_DATA' }
  | { type: 'CREATE_PROJECT'; name: string; description: string; color: string }
  | { type: 'DELETE_PROJECT'; projectId: string }
  | { type: 'CREATE_TASK'; projectId: string; task: CreateTaskDto }
  | { type: 'UPDATE_TASK'; taskId: string; data: UpdateTaskDto }
  | { type: 'DELETE_TASK'; taskId: string }
  | { type: 'START_TASK'; taskId: string }
  | { type: 'READY_FOR_TEST'; taskId: string }
  | { type: 'APPROVE_TASK'; taskId: string }
  | {
      type: 'MOVE_TASK';
      taskId: string;
      toStatus: Task['status'];
      insertAt?: number;
    }
  | {
      type: 'REORDER_TASKS';
      projectId: string;
      status: Task['status'];
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
      syncModes: ('issues' | 'prs' | 'board')[];
      ghProjectId: string | null;
    }
  | { type: 'GITHUB_UNLINK_PROJECT'; projectId: string }
  | { type: 'GITHUB_SYNC_NOW'; projectId?: string }
  | {
      type: 'GITHUB_PR_COMMENT';
      taskId: string;
      comment: string;
    }
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

/** Serializes domain projects for the webview. */
export function serializeProject(project: Project): SerializedProject {
  return {
    ...project,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
  };
}

/** Serializes domain tasks for the webview. */
export function serializeTask(task: Task): SerializedTask {
  return {
    ...task,
    descriptionImages: task.descriptionImages.map((image) => ({
      ...image,
      uri: '',
    })),
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
    timerStartedAt: task.timerStartedAt?.toISOString() ?? null,
    source: 'local',
    assignedTo: null,
    createdBy: null,
    teamId: null,
  };
}

/** Serializes task logs for the webview. */
export function serializeTaskLog(log: TaskLog): SerializedTaskLog {
  return {
    ...log,
    createdAt: log.createdAt.toISOString(),
  };
}
