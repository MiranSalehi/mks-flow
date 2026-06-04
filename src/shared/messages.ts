import type { Project } from '../domain/models/Project';
import type { TaskLog } from '../domain/models/TaskLog';
import type {
  CreateTaskDto,
  Task,
  TaskFilters,
  UpdateTaskDto,
} from '../domain/models/Task';
import type { GitFiles } from '../domain/types';

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
  createdAt: string;
  updatedAt: string;
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
    }
  | { type: 'OPEN_TASK'; taskId: string }
  | { type: 'WORKSPACE_FILES_PICKED'; files: string[] }
  | { type: 'ERROR'; message: string };

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
  | { type: 'MOVE_TASK'; taskId: string; toStatus: Task['status'] }
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
  | { type: 'SEARCH_TASKS'; projectId: string; query: string; filters: TaskFilters };

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
  };
}

/** Serializes task logs for the webview. */
export function serializeTaskLog(log: TaskLog): SerializedTaskLog {
  return {
    ...log,
    createdAt: log.createdAt.toISOString(),
  };
}
