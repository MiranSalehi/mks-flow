import * as vscode from 'vscode';
import { getContainer } from '../../application/containerHolder';
import { TaskTransitionError } from '../../application/errors';
import type { CreateTaskDto } from '../../domain/models/Task';
import type { TaskFilters, UpdateTaskDto } from '../../domain/models/Task';
import type { TaskStatus } from '../../domain/types';
import { RepositoryError } from '../../infrastructure/repositories/RepositoryError';
import {
  serializeProject,
  serializeTaskLog,
  type ExtensionMessage,
  type WebviewMessage,
} from '../../shared/messages';
import { serializeTaskForWebview } from './taskSerialization';
import { formatRelatedWorkspacePath } from '../../shared/workspacePaths';
import { dispatchTaskToAi } from '../../application/services/AITaskDispatchService';
import { refreshActiveTaskStatusBar } from '../statusbar/ActiveTaskStatusBar';
import type { TaskTreeProvider } from '../treeview/TaskTreeProvider';

type PostMessage = (message: ExtensionMessage) => void;

/**
 * Handles webview → extension messages and broadcasts data updates.
 */
export class WebviewMessageHandler {
  constructor(
    private readonly postMessage: PostMessage,
    private readonly webview: vscode.Webview,
    private readonly treeProvider?: TaskTreeProvider,
  ) {}

  /** Routes an incoming webview message to the appropriate handler. */
  async handle(message: WebviewMessage): Promise<void> {
    try {
      switch (message.type) {
        case 'GET_DATA':
          this.sendInitData();
          return;
        case 'CREATE_PROJECT':
          this.createProject(message.name, message.description, message.color);
          return;
        case 'DELETE_PROJECT':
          this.deleteProject(message.projectId);
          return;
        case 'CREATE_TASK':
          this.createTask(message.projectId, message.task);
          return;
        case 'UPDATE_TASK':
          this.updateTask(message.taskId, message.data);
          return;
        case 'DELETE_TASK':
          this.deleteTask(message.taskId);
          return;
        case 'START_TASK':
          this.startTask(message.taskId);
          return;
        case 'READY_FOR_TEST':
          this.readyForTest(message.taskId);
          return;
        case 'APPROVE_TASK':
          this.approveTask(message.taskId);
          return;
        case 'MOVE_TASK':
          this.moveTask(message.taskId, message.toStatus);
          return;
        case 'SEND_TO_AI':
          await this.sendToAi(message.taskId);
          return;
        case 'START_TIMER':
          this.startTimer(message.taskId);
          return;
        case 'STOP_TIMER':
          this.stopTimer(message.taskId);
          return;
        case 'GET_GIT_FILES':
          await this.sendGitFiles();
          return;
        case 'GET_TASK_LOGS':
          this.sendTaskLogs(message.taskId);
          return;
        case 'PICK_WORKSPACE_FILES':
          await this.pickWorkspaceFiles();
          return;
        case 'ATTACH_TASK_IMAGE':
          await this.attachTaskImage(
            message.taskId,
            message.fileName,
            message.mimeType,
            message.dataBase64,
          );
          return;
        case 'PICK_TASK_IMAGES':
          await this.pickTaskImages(message.taskId);
          return;
        case 'PASTE_TASK_IMAGE_FROM_CLIPBOARD':
          await this.pasteTaskImageFromClipboard(message.taskId);
          return;
        case 'REMOVE_TASK_IMAGE':
          this.removeTaskImage(message.taskId, message.imageId);
          return;
        case 'OPEN_TASK_CONTEXT_FILE':
          await this.openTaskContextFile(message.taskId);
          return;
        case 'EXPORT_PROJECT':
          await this.exportProject(message.projectId);
          return;
        case 'SEARCH_TASKS':
          this.searchTasks(message.projectId, message.query, message.filters);
          return;
        default:
          return;
      }
    } catch (error) {
      this.postError(error);
    }
  }

  /** Sends the full initial dataset to the webview. */
  sendInitData(): void {
    const container = getContainer();
    this.postMessage({
      type: 'INIT_DATA',
      projects: container.projectService.findAll().map(serializeProject),
      tasks: this.serializeTasks(container.taskService.findAll()),
    });
  }

  private createProject(
    name: string,
    description: string,
    color: string,
  ): void {
    getContainer().projectService.create({ name, description, color });
    this.broadcastUpdates();
  }

  private deleteProject(projectId: string): void {
    getContainer().projectService.delete(projectId);
    this.broadcastUpdates();
  }

  private createTask(projectId: string, task: CreateTaskDto): void {
    getContainer().taskService.create({ ...task, projectId });
    this.broadcastUpdates();
  }

  private updateTask(taskId: string, data: UpdateTaskDto): void {
    getContainer().taskService.update(taskId, data);
    this.broadcastUpdates();
  }

  private deleteTask(taskId: string): void {
    getContainer().taskService.delete(taskId);
    this.broadcastUpdates();
  }

  private startTask(taskId: string): void {
    getContainer().taskService.startTask(taskId);
    this.broadcastUpdates();
  }

  private readyForTest(taskId: string): void {
    getContainer().taskService.readyForTest(taskId);
    this.broadcastUpdates();
  }

  private approveTask(taskId: string): void {
    getContainer().taskService.approveTask(taskId);
    this.broadcastUpdates();
  }

  private moveTask(taskId: string, toStatus: TaskStatus): void {
    getContainer().taskService.moveToStatus(taskId, toStatus);
    this.broadcastUpdates();
  }

  private async sendToAi(taskId: string): Promise<void> {
    const container = getContainer();
    const task = container.taskService.findById(taskId);
    if (!task) {
      return;
    }

    const project = container.projectService.findById(task.projectId);
    if (!project) {
      return;
    }

    const response = await dispatchTaskToAi(container, task, project);
    if (!response.success) {
      throw new Error(response.error ?? 'Failed to send task to AI');
    }

    if (response.relativePath && response.contextFilePath && response.chatPrompt) {
      const markdown = container.aiPromptService.generatePrompt(task, project);
      this.postMessage({
        type: 'AI_CONTEXT_READY',
        taskId,
        relativePath: response.relativePath,
        contextFilePath: response.contextFilePath,
        chatPrompt: response.chatPrompt,
        markdown,
      });
      void vscode.window.showInformationMessage(
        `Task context ready: @${response.relativePath}`,
      );
      return;
    }

    const prompt = container.aiPromptService.generatePrompt(task, project);
    this.postMessage({ type: 'AI_PROMPT', taskId, prompt });
  }

  private async openTaskContextFile(taskId: string): Promise<void> {
    const container = getContainer();
    const task = container.taskService.findById(taskId);
    if (!task) {
      return;
    }

    const project = container.projectService.findById(task.projectId);
    if (!project) {
      return;
    }

    const file = await container.taskContextFileService.writeContextFile(
      task,
      project,
    );
    const document = await vscode.workspace.openTextDocument(
      vscode.Uri.file(file.absolutePath),
    );
    await vscode.window.showTextDocument(document, { preview: false });
  }

  private startTimer(taskId: string): void {
    getContainer().timerService.startTimer(taskId);
    this.broadcastUpdates();
  }

  private stopTimer(taskId: string): void {
    getContainer().timerService.stopTimer(taskId);
    this.broadcastUpdates();
  }

  private async sendGitFiles(): Promise<void> {
    const enabled = vscode.workspace
      .getConfiguration('mksflow')
      .get<boolean>('gitIntegration', true);

    if (!enabled) {
      this.postMessage({
        type: 'GIT_FILES',
        files: { modified: [], added: [], deleted: [] },
      });
      return;
    }

    const files = await getContainer().gitService.getChangedFiles();
    this.postMessage({ type: 'GIT_FILES', files });
  }

  private sendTaskLogs(taskId: string): void {
    const logs = getContainer().taskService.getTaskLogs(taskId);
    this.postMessage({
      type: 'TASK_LOGS',
      taskId,
      logs: logs.map(serializeTaskLog),
    });
  }

  private async pickWorkspaceFiles(): Promise<void> {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
      void vscode.window.showWarningMessage(
        'Open a workspace folder before picking related files.',
      );
      return;
    }

    const uris = await vscode.window.showOpenDialog({
      canSelectMany: true,
      canSelectFiles: true,
      canSelectFolders: true,
      defaultUri: workspaceFolder.uri,
      openLabel: 'Add',
      title: 'Add related files or folders',
    });

    if (!uris?.length) {
      return;
    }

    this.postMessage({
      type: 'WORKSPACE_FILES_PICKED',
      files: uris.map((uri) => formatRelatedWorkspacePath(uri)),
    });
  }

  private async exportProject(projectId: string): Promise<void> {
    await getContainer().exportService.saveExportFile(projectId);
  }

  private async attachTaskImage(
    taskId: string,
    fileName: string,
    mimeType: string,
    dataBase64: string,
  ): Promise<void> {
    getContainer().taskImageService.attachFromBase64(
      taskId,
      fileName,
      mimeType,
      dataBase64,
    );
    this.broadcastUpdates();
  }

  private async pickTaskImages(taskId: string): Promise<void> {
    const result = await getContainer().taskImageService.attachFromPicker(taskId);
    if (result) {
      this.broadcastUpdates();
    }
  }

  private async pasteTaskImageFromClipboard(taskId: string): Promise<void> {
    const result =
      await getContainer().taskImageService.attachFromSystemClipboard(taskId);
    if (result) {
      this.broadcastUpdates();
    }
  }

  private removeTaskImage(taskId: string, imageId: string): void {
    getContainer().taskImageService.removeImage(taskId, imageId);
    this.broadcastUpdates();
  }

  private serializeTasks(
    tasks: ReturnType<ReturnType<typeof getContainer>['taskService']['findAll']>,
  ) {
    return tasks.map((task) => serializeTaskForWebview(task, this.webview));
  }

  private searchTasks(
    projectId: string,
    query: string,
    filters: TaskFilters,
  ): void {
    const tasks = getContainer().taskService.search(projectId, query, filters);
    this.postMessage({
      type: 'TASKS_UPDATED',
      tasks: this.serializeTasks(tasks),
    });
  }

  private broadcastUpdates(): void {
    const container = getContainer();
    this.postMessage({
      type: 'PROJECTS_UPDATED',
      projects: container.projectService.findAll().map(serializeProject),
    });
    this.postMessage({
      type: 'TASKS_UPDATED',
      tasks: this.serializeTasks(container.taskService.findAll()),
    });
    this.treeProvider?.refresh();
    refreshActiveTaskStatusBar();
  }

  private postError(error: unknown): void {
    const message =
      error instanceof TaskTransitionError ||
      error instanceof RepositoryError ||
      error instanceof Error
        ? error.message
        : 'Unexpected error';

    this.postMessage({ type: 'ERROR', message });
    void vscode.window.showErrorMessage(message);
  }
}
