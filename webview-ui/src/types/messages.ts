export type TaskStatus = 'todo' | 'doing' | 'test' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';
export type ProjectMode = 'personal' | 'team' | 'linear' | 'github' | 'notion';

export interface GitFiles {
  modified: string[];
  added: string[];
  deleted: string[];
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
  createdAt: string;
  updatedAt: string;
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
    }
  | { type: 'OPEN_TASK'; taskId: string }
  | { type: 'WORKSPACE_FILES_PICKED'; files: string[] }
  | { type: 'ERROR'; message: string };

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
  | { type: 'MOVE_TASK'; taskId: string; toStatus: TaskStatus }
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

export const STATUSES: TaskStatus[] = ['todo', 'doing', 'test', 'done'];

export const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: 'Todo',
  doing: 'Doing',
  test: 'Test',
  done: 'Done',
};

export const PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical',
};
