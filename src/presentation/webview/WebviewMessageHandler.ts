import * as vscode from 'vscode';
import type { CloudContext } from '../../application/cloudContextHolder';
import { getGitHubContext } from '../../application/githubContextHolder';
import { getLinearContext } from '../../application/linearContextHolder';
import { getNotionContext } from '../../application/notionContextHolder';
import { getContainer } from '../../application/containerHolder';
import { TaskTransitionError } from '../../application/errors';
import type { CreateTaskDto, Task } from '../../domain/models/Task';
import type { TaskFilters, UpdateTaskDto } from '../../domain/models/Task';
import type { TaskPriority, TaskStatus } from '../../domain/types';
import {
  mapApiTaskLog,
  mapApiUser,
  serializedProjectToDomain,
  serializedTaskToDomain,
} from '../../infrastructure/cloud/cloudMappers';
import { RepositoryError } from '../../infrastructure/repositories/RepositoryError';
import type { BoardMode } from '../../shared/cloudConfig';
import { buildCloudTaskUrl, getWebAppUrl } from '../../shared/cloudUrls';
import {
  serializeProject,
  serializeTaskLog,
  type ExtensionMessage,
  type WebviewMessage,
} from '../../shared/messages';
import { serializeTaskForWebview } from './taskSerialization';
import { serializeCloudTasksForWebview, resolveCloudAttachmentUri, clearCloudAttachmentCache } from './cloudTaskSerialization';
import { assertCloudMediaSize } from '../../infrastructure/cloud/cloudMediaLimits';
import { formatRelatedWorkspacePath } from '../../shared/workspacePaths';
import type { LinearTeamOption } from '../../infrastructure/linear/LinearTypes';
import { dispatchTaskToAi } from '../../application/services/AITaskDispatchService';
import type { CloudAuthState } from '../../application/services/CloudSyncService';
import { refreshGitHubSyncStatusBar } from '../statusbar/GitHubSyncStatusBar';
import { refreshNotionSyncStatusBar } from '../statusbar/NotionSyncStatusBar';
import { refreshLinearSyncStatusBar } from '../statusbar/LinearSyncStatusBar';
import { refreshActiveTaskStatusBar } from '../statusbar/ActiveTaskStatusBar';
import { refreshBoardLauncher } from '../statusbar/BoardLauncherStatusBar';
import type { TaskTreeProvider } from '../treeview/TaskTreeProvider';

type PostMessage = (message: ExtensionMessage) => void;

/**
 * Handles webview → extension messages and broadcasts data updates.
 */
export class WebviewMessageHandler {
  private readonly disposables: vscode.Disposable[] = [];

  constructor(
    private readonly postMessage: PostMessage,
    private readonly webview: vscode.Webview,
    private readonly extensionContext: vscode.ExtensionContext,
    private readonly treeProvider?: TaskTreeProvider,
    private readonly cloud?: CloudContext,
  ) {
    if (this.cloud) {
      this.disposables.push(
        this.cloud.sync.onCacheUpdated(() => {
          if (this.isTeamMode()) {
            void this.broadcastCloudUpdates();
          }
        }),
        this.cloud.sync.onAuthStateChanged((state) => {
          this.postCloudAuthState(state);
        }),
        this.cloud.sync.onSyncStatusChanged((state) => {
          this.postMessage({
            type: 'CLOUD_SYNC_STATUS',
            status: state.status,
            message: state.message,
          });
        }),
      );
    }

    const linear = getLinearContext();
    if (linear) {
      this.disposables.push(
        linear.sync.onSyncComplete(() => {
          if (!this.isTeamMode()) {
            this.broadcastLocalUpdates();
          }
          this.postLinearState();
          refreshLinearSyncStatusBar();
        }),
        linear.sync.onStatusChanged(() => {
          this.postLinearState();
          refreshLinearSyncStatusBar();
        }),
      );
    }

    const github = getGitHubContext();
    if (github) {
      this.disposables.push(
        github.sync.onSyncComplete(() => {
          if (!this.isTeamMode()) {
            this.broadcastLocalUpdates();
          }
          this.postGitHubState();
          refreshGitHubSyncStatusBar();
        }),
        github.sync.onStatusChanged(() => {
          this.postGitHubState();
          refreshGitHubSyncStatusBar();
        }),
      );
    }

    const notion = getNotionContext();
    if (notion) {
      this.disposables.push(
        notion.sync.onSyncComplete(() => {
          if (!this.isTeamMode()) {
            this.broadcastLocalUpdates();
          }
          this.postNotionState();
          refreshNotionSyncStatusBar();
        }),
        notion.sync.onStatusChanged(() => {
          this.postNotionState();
          refreshNotionSyncStatusBar();
        }),
      );
    }
  }

  /** Releases cloud sync listeners. */
  dispose(): void {
    for (const disposable of this.disposables) {
      disposable.dispose();
    }
    this.disposables.length = 0;
  }

  /** Routes an incoming webview message to the appropriate handler. */
  async handle(message: WebviewMessage): Promise<void> {
    try {
      switch (message.type) {
        case 'GET_DATA':
          this.sendInitData();
          return;
        case 'SET_BOARD_MODE':
          await this.setBoardMode(message.mode);
          return;
        case 'CLOUD_LOGIN':
          await this.cloudLogin(message.email, message.password);
          return;
        case 'CLOUD_LOGOUT':
          await this.cloudLogout();
          return;
        case 'CLOUD_SYNC_NOW':
          await this.cloudSyncNow();
          return;
        case 'OPEN_CLOUD_TASK':
          await this.openCloudTask(message.projectId, message.taskId);
          return;
        case 'OPEN_CLOUD_WEB_APP':
          await this.openCloudWebApp();
          return;
        case 'CREATE_PROJECT':
          this.assertPersonalMode();
          this.createProject(message.name, message.description, message.color);
          return;
        case 'DELETE_PROJECT':
          this.assertPersonalMode();
          this.deleteProject(message.projectId);
          return;
        case 'CREATE_TASK':
          this.assertPersonalMode();
          await this.createTask(message.projectId, message.task);
          return;
        case 'UPDATE_TASK':
          await this.updateTask(message.taskId, message.data);
          return;
        case 'DELETE_TASK':
          this.assertPersonalMode();
          await this.deleteTask(message.taskId);
          return;
        case 'START_TASK':
          await this.startTask(message.taskId);
          return;
        case 'READY_FOR_TEST':
          await this.readyForTest(message.taskId);
          return;
        case 'APPROVE_TASK':
          await this.approveTask(message.taskId);
          return;
        case 'MOVE_TASK':
          await this.moveTask(message.taskId, message.toStatus, message.insertAt);
          return;
        case 'REORDER_TASKS':
          await this.reorderTasks(
            message.projectId,
            message.status,
            message.taskIds,
          );
          return;
        case 'SEND_TO_AI':
          await this.sendToAi(message.taskId);
          return;
        case 'START_TIMER':
          this.assertPersonalMode();
          this.startTimer(message.taskId);
          return;
        case 'STOP_TIMER':
          this.assertPersonalMode();
          this.stopTimer(message.taskId);
          return;
        case 'GET_GIT_FILES':
          await this.sendGitFiles();
          return;
        case 'GET_TASK_LOGS':
          await this.sendTaskLogs(message.taskId);
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
          await this.removeTaskImage(message.taskId, message.imageId);
          return;
        case 'RESOLVE_CLOUD_ATTACHMENT':
          await this.resolveCloudAttachment(
            message.taskId,
            message.attachmentId,
            message.mimeType,
          );
          return;
        case 'OPEN_TASK_CONTEXT_FILE':
          await this.openTaskContextFile(message.taskId);
          return;
        case 'EXPORT_PROJECT':
          this.assertPersonalMode();
          await this.exportProject(message.projectId);
          return;
        case 'SEARCH_TASKS':
          this.searchTasks(message.projectId, message.query, message.filters);
          return;
        case 'LINEAR_CONNECT':
          await this.linearConnect(message.apiKey);
          return;
        case 'LINEAR_DISCONNECT':
          await this.linearDisconnect();
          return;
        case 'LINEAR_TEST_CONNECTION':
          await this.linearTestConnection();
          return;
        case 'LINEAR_GET_TEAMS':
          await this.linearGetTeams();
          return;
        case 'LINEAR_GET_PROJECT_CONFIG':
          this.linearGetProjectConfig(message.projectId);
          return;
        case 'LINEAR_LINK_PROJECT':
          await this.linearLinkProject(
            message.projectId,
            message.teamId,
            message.linearProjectId,
          );
          return;
        case 'LINEAR_UNLINK_PROJECT':
          await this.linearUnlinkProject(message.projectId);
          return;
        case 'LINEAR_SYNC_NOW':
          await this.linearSyncNow(message.projectId);
          return;
        case 'GITHUB_CONNECT':
          await this.githubConnect(message.token);
          return;
        case 'GITHUB_DISCONNECT':
          await this.githubDisconnect();
          return;
        case 'GITHUB_TEST_CONNECTION':
          await this.githubTestConnection();
          return;
        case 'GITHUB_GET_REPOS':
          await this.githubGetRepos();
          return;
        case 'GITHUB_GET_PROJECTS':
          await this.githubGetProjects();
          return;
        case 'GITHUB_GET_PROJECT_CONFIG':
          this.githubGetProjectConfig(message.projectId);
          return;
        case 'GITHUB_LINK_PROJECT':
          await this.githubLinkProject(message);
          return;
        case 'GITHUB_UNLINK_PROJECT':
          await this.githubUnlinkProject(message.projectId);
          return;
        case 'GITHUB_SYNC_NOW':
          await this.githubSyncNow(message.projectId);
          return;
        case 'GITHUB_PR_COMMENT':
          await this.githubPrComment(message.taskId, message.comment);
          return;
        case 'NOTION_CONNECT':
          await this.notionConnect(message.token);
          return;
        case 'NOTION_DISCONNECT':
          await this.notionDisconnect();
          return;
        case 'NOTION_TEST_CONNECTION':
          await this.notionTestConnection();
          return;
        case 'NOTION_GET_DATABASES':
          await this.notionGetDatabases();
          return;
        case 'NOTION_GET_DATABASE_SCHEMA':
          await this.notionGetDatabaseSchema(message.databaseId);
          return;
        case 'NOTION_GET_PROJECT_CONFIG':
          this.notionGetProjectConfig(message.projectId);
          return;
        case 'NOTION_LINK_PROJECT':
          await this.notionLinkProject(message);
          return;
        case 'NOTION_UNLINK_PROJECT':
          await this.notionUnlinkProject(message.projectId);
          return;
        case 'NOTION_SYNC_NOW':
          await this.notionSyncNow(message.projectId);
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
    this.postMessage({
      type: 'BOARD_MODE',
      mode: this.getBoardMode(),
    });

    if (this.cloud) {
      const cache = this.cloud.sync.getCache();
      this.postCloudAuthState({
        isAuthenticated: Boolean(this.cloud.api.getToken()),
        user: cache.user ?? undefined,
        lastSyncAt: cache.lastSyncAt,
      });
    }

    if (this.isTeamMode()) {
      void this.broadcastCloudUpdates();
      return;
    }

    const container = getContainer();
    this.postMessage({
      type: 'INIT_DATA',
      projects: container.projectService.findAll().map(serializeProject),
      tasks: this.serializeLocalTasks(container.taskService.findAll()),
    });
    this.postLinearState();
    this.postGitHubState();
    this.postNotionState();
  }

  private async setBoardMode(mode: BoardMode): Promise<void> {
    if (!this.cloud) {
      return;
    }

    this.cloud.sync.setBoardMode(mode);
    this.postMessage({ type: 'BOARD_MODE', mode });

    if (mode === 'team') {
      const hasToken = await this.cloud.auth.loadStoredToken();
      if (hasToken) {
        this.cloud.sync.startPolling();
        await this.cloud.sync.syncNow();
      } else {
        void this.broadcastCloudUpdates();
      }
      return;
    }

    this.cloud.sync.stopPolling();
    this.sendInitData();
  }

  private async cloudLogin(email: string, password: string): Promise<void> {
    if (!this.cloud) {
      return;
    }

    const user = await this.cloud.auth.login(email, password);
    this.cloud.sync.startPolling();
    await this.cloud.sync.syncNow();
    this.postCloudAuthState({
      isAuthenticated: true,
      user,
      lastSyncAt: this.cloud.sync.getCache().lastSyncAt,
    });
    void this.broadcastCloudUpdates();
  }

  private async cloudLogout(): Promise<void> {
    if (!this.cloud) {
      return;
    }

    await this.cloud.auth.logout();
    this.cloud.sync.stopPolling();
    await this.cloud.sync.clearCache();
    this.postCloudAuthState({ isAuthenticated: false });
    void this.broadcastCloudUpdates();
  }

  private async cloudSyncNow(): Promise<void> {
    if (!this.cloud) {
      return;
    }

    await this.cloud.sync.syncNow();
    if (this.isTeamMode()) {
      await this.broadcastCloudUpdates();
    }
  }

  private async openCloudTask(projectId: string, taskId: string): Promise<void> {
    const url = buildCloudTaskUrl(projectId, taskId);
    await vscode.env.openExternal(vscode.Uri.parse(url));
  }

  private async openCloudWebApp(): Promise<void> {
    await vscode.env.openExternal(vscode.Uri.parse(getWebAppUrl()));
  }

  private createProject(
    name: string,
    description: string,
    color: string,
  ): void {
    getContainer().projectService.create({ name, description, color });
    this.broadcastLocalUpdates();
  }

  private deleteProject(projectId: string): void {
    getContainer().projectService.delete(projectId);
    this.broadcastLocalUpdates();
  }

  private async createTask(projectId: string, task: CreateTaskDto): Promise<void> {
    const created = getContainer().taskService.create({ ...task, projectId });
    await this.pushIntegrationSyncIfLinked(created.id);
    this.broadcastLocalUpdates();
  }

  private async updateTask(taskId: string, data: UpdateTaskDto): Promise<void> {
    if (this.isCloudTask(taskId)) {
      await this.cloud!.tasks.update(taskId, data);
      await this.broadcastCloudUpdates();
      return;
    }

    getContainer().taskService.update(taskId, data);
    await this.pushIntegrationSyncIfLinked(taskId);
    this.broadcastLocalUpdates();
  }

  private async deleteTask(taskId: string): Promise<void> {
    const task = getContainer().taskService.findById(taskId);
    if (task) {
      await this.deleteIntegrationSyncIfLinked(task);
    }
    getContainer().taskService.delete(taskId);
    this.broadcastLocalUpdates();
  }

  private async startTask(taskId: string): Promise<void> {
    if (this.isCloudTask(taskId)) {
      await this.cloud!.tasks.startTask(taskId);
      return;
    }

    getContainer().taskService.startTask(taskId);
    await this.pushIntegrationSyncIfLinked(taskId);
    this.broadcastLocalUpdates();
  }

  private async readyForTest(taskId: string): Promise<void> {
    if (this.isCloudTask(taskId)) {
      await this.cloud!.tasks.readyForTest(taskId);
      return;
    }

    getContainer().taskService.readyForTest(taskId);
    await this.pushIntegrationSyncIfLinked(taskId);
    this.broadcastLocalUpdates();
  }

  private async approveTask(taskId: string): Promise<void> {
    if (this.isCloudTask(taskId)) {
      await this.cloud!.tasks.approveTask(taskId);
      return;
    }

    getContainer().taskService.approveTask(taskId);
    await this.pushIntegrationSyncIfLinked(taskId);
    this.broadcastLocalUpdates();
  }

  private async moveTask(
    taskId: string,
    toStatus: TaskStatus,
    insertAt?: number,
  ): Promise<void> {
    if (this.isCloudTask(taskId)) {
      await this.cloud!.tasks.moveToStatus(taskId, toStatus, insertAt);
      return;
    }

    getContainer().taskService.moveToStatus(taskId, toStatus, insertAt);
    await this.pushIntegrationSyncIfLinked(taskId);
    this.broadcastLocalUpdates();
  }

  private async reorderTasks(
    projectId: string,
    status: TaskStatus,
    taskIds: string[],
  ): Promise<void> {
    if (this.isTeamMode()) {
      await this.cloud!.tasks.reorderTasks(projectId, status, taskIds);
      return;
    }

    getContainer().taskService.reorderTasks(projectId, status, taskIds);
    this.broadcastLocalUpdates();
  }

  private async sendToAi(taskId: string): Promise<void> {
    const container = getContainer();

    if (this.isCloudTask(taskId)) {
      const serialized = this.cloud!.tasks.findById(taskId);
      if (!serialized) {
        return;
      }

      const cache = this.cloud!.sync.getCache();
      const serializedProject = cache.projects.find(
        (project) => project.id === serialized.projectId,
      );
      if (!serializedProject) {
        return;
      }

      const task = serializedTaskToDomain(serialized);
      const project = serializedProjectToDomain(serializedProject);
      const response = await dispatchTaskToAi(container, task, project);
      this.handleAiResponse(taskId, response, container, task, project);
      return;
    }

    const task = container.taskService.findById(taskId);
    if (!task) {
      return;
    }

    const project = container.projectService.findById(task.projectId);
    if (!project) {
      return;
    }

    const response = await dispatchTaskToAi(container, task, project);
    this.handleAiResponse(taskId, response, container, task, project);
  }

  private handleAiResponse(
    taskId: string,
    response: Awaited<ReturnType<typeof dispatchTaskToAi>>,
    container: ReturnType<typeof getContainer>,
    task: Parameters<typeof dispatchTaskToAi>[1],
    project: Parameters<typeof dispatchTaskToAi>[2],
  ): void {
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
        providerName: response.providerName,
        attachedToChat: response.attachedToChat,
      });
      const hostLabel = response.providerName ?? 'AI chat';
      const attachHint = response.attachedToChat
        ? `attached in ${hostLabel}`
        : `ready for ${hostLabel} — paste @${response.relativePath} if needed`;
      void vscode.window.showInformationMessage(`Task context ${attachHint}`);
      return;
    }

    const prompt = container.aiPromptService.generatePrompt(task, project);
    this.postMessage({ type: 'AI_PROMPT', taskId, prompt });
  }

  private async openTaskContextFile(taskId: string): Promise<void> {
    const container = getContainer();

    if (this.isCloudTask(taskId)) {
      const serialized = this.cloud!.tasks.findById(taskId);
      if (!serialized) {
        return;
      }

      const serializedProject = this.cloud!.sync
        .getCache()
        .projects.find((project) => project.id === serialized.projectId);
      if (!serializedProject) {
        return;
      }

      const task = serializedTaskToDomain(serialized);
      const project = serializedProjectToDomain(serializedProject);
      const file = await container.taskContextFileService.writeContextFile(
        task,
        project,
      );
      const document = await vscode.workspace.openTextDocument(
        vscode.Uri.file(file.absolutePath),
      );
      await vscode.window.showTextDocument(document, { preview: false });
      return;
    }

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
    this.broadcastLocalUpdates();
  }

  private stopTimer(taskId: string): void {
    getContainer().timerService.stopTimer(taskId);
    this.broadcastLocalUpdates();
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

  private async sendTaskLogs(taskId: string): Promise<void> {
    if (this.isCloudTask(taskId)) {
      const apiLogs = await this.cloud!.tasks.fetchLogs(taskId);
      this.postMessage({
        type: 'TASK_LOGS',
        taskId,
        logs: apiLogs.map((log) => mapApiTaskLog(taskId, log)),
      });
      return;
    }

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
    if (this.isCloudTask(taskId)) {
      await this.attachCloudMedia(
        taskId,
        fileName,
        mimeType,
        Buffer.from(dataBase64, 'base64'),
      );
      return;
    }

    getContainer().taskImageService.attachFromBase64(
      taskId,
      fileName,
      mimeType,
      dataBase64,
    );
    this.broadcastLocalUpdates();
  }

  private async attachCloudMedia(
    taskId: string,
    fileName: string,
    mimeType: string,
    buffer: Buffer,
  ): Promise<void> {
    assertCloudMediaSize(mimeType, buffer.length);

    try {
      await this.cloud!.tasks.attachMedia(taskId, fileName, mimeType, buffer);
      await this.broadcastCloudUpdates();
    } catch (error) {
      await this.cloud!.tasks.handleMutationError(error);
    }
  }

  private async pickTaskImages(taskId: string): Promise<void> {
    if (this.isCloudTask(taskId)) {
      const uris = await vscode.window.showOpenDialog({
        canSelectMany: true,
        canSelectFiles: true,
        filters: {
          Media: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'mp4', 'webm', 'mov'],
        },
        title: 'Attach image or video',
      });

      if (!uris?.length) {
        return;
      }

      for (const uri of uris) {
        const buffer = await vscode.workspace.fs.readFile(uri);
        const fileName = uri.path.split('/').pop() ?? 'upload.bin';
        const mimeType = mimeTypeFromFileName(fileName);
        await this.attachCloudMedia(
          taskId,
          fileName,
          mimeType,
          Buffer.from(buffer),
        );
      }

      return;
    }

    const result = await getContainer().taskImageService.attachFromPicker(taskId);
    if (result) {
      this.broadcastLocalUpdates();
    }
  }

  private async pasteTaskImageFromClipboard(taskId: string): Promise<void> {
    if (this.isCloudTask(taskId)) {
      const result =
        await getContainer().taskImageService.readSystemClipboardImage();
      if (!result) {
        void vscode.window.showWarningMessage(
          'No image on clipboard. Copy a screenshot first.',
        );
        return;
      }

      await this.attachCloudMedia(
        taskId,
        result.fileName,
        result.mimeType,
        result.buffer,
      );
      return;
    }

    const result =
      await getContainer().taskImageService.attachFromSystemClipboard(taskId);
    if (result) {
      this.broadcastLocalUpdates();
    }
  }

  private async resolveCloudAttachment(
    taskId: string,
    attachmentId: string,
    mimeType: string,
  ): Promise<void> {
    if (!this.cloud) {
      return;
    }

    try {
      const uri = await resolveCloudAttachmentUri(
        taskId,
        attachmentId,
        mimeType,
        this.webview,
        this.cloud.api,
        this.cloud.auth,
        this.extensionContext.globalStorageUri,
      );

      this.postMessage({
        type: 'CLOUD_ATTACHMENT_URI',
        taskId,
        attachmentId,
        uri,
      });
    } catch (error) {
      console.warn(
        `[MKSFlow] Cloud attachment ${attachmentId} could not be loaded:`,
        error,
      );
      this.postMessage({
        type: 'CLOUD_ATTACHMENT_FAILED',
        taskId,
        attachmentId,
      });
    }
  }

  private async removeTaskImage(taskId: string, imageId: string): Promise<void> {
    if (this.isCloudTask(taskId)) {
      try {
        await this.cloud!.tasks.removeAttachment(taskId, imageId);
        clearCloudAttachmentCache(
          this.extensionContext.globalStorageUri,
          taskId,
          imageId,
        );
        await this.broadcastCloudUpdates();
      } catch (error) {
        await this.cloud!.tasks.handleMutationError(error);
      }
      return;
    }

    getContainer().taskImageService.removeImage(taskId, imageId);
    this.broadcastLocalUpdates();
  }

  private serializeLocalTasks(
    tasks: ReturnType<ReturnType<typeof getContainer>['taskService']['findAll']>,
  ) {
    return tasks.map((task) => serializeTaskForWebview(task, this.webview));
  }

  private searchTasks(
    projectId: string,
    query: string,
    filters: TaskFilters,
  ): void {
    if (this.isTeamMode()) {
      const cache = this.cloud!.sync.getCache();
      let filtered = cache.tasks.filter((task) => task.projectId === projectId);
      const normalized = query.trim().toLowerCase();
      if (normalized) {
        filtered = filtered.filter(
          (task) =>
            task.title.toLowerCase().includes(normalized) ||
            task.description.toLowerCase().includes(normalized),
        );
      }
      if (filters.priorities?.length) {
        filtered = filtered.filter((task) =>
          filters.priorities!.includes(task.priority),
        );
      }
      if (filters.tags?.length) {
        filtered = filtered.filter((task) =>
          filters.tags!.every((tag) => task.tags.includes(tag)),
        );
      }

      void serializeCloudTasksForWebview(
        filtered,
        this.webview,
        this.cloud!.api,
        this.cloud!.auth,
        this.extensionContext.globalStorageUri,
      ).then((tasks) => {
        this.postMessage({ type: 'TASKS_UPDATED', tasks });
      });
      return;
    }

    const tasks = getContainer().taskService.search(projectId, query, filters);
    this.postMessage({
      type: 'TASKS_UPDATED',
      tasks: this.serializeLocalTasks(tasks),
    });
  }

  private broadcastLocalUpdates(): void {
    const container = getContainer();
    this.postMessage({
      type: 'PROJECTS_UPDATED',
      projects: container.projectService.findAll().map(serializeProject),
    });
    this.postMessage({
      type: 'TASKS_UPDATED',
      tasks: this.serializeLocalTasks(container.taskService.findAll()),
    });
    this.treeProvider?.refresh();
    refreshActiveTaskStatusBar();
    refreshBoardLauncher();
  }

  private async broadcastCloudUpdates(): Promise<void> {
    const cache = this.cloud!.sync.getCache();
    const tasks = await serializeCloudTasksForWebview(
      cache.tasks,
      this.webview,
      this.cloud!.api,
      this.cloud!.auth,
      this.extensionContext.globalStorageUri,
    );

    this.postMessage({
      type: 'INIT_DATA',
      projects: cache.projects,
      tasks,
    });
  }

  private postCloudAuthState(state: CloudAuthState): void {
    this.postMessage({
      type: 'CLOUD_AUTH_STATE',
      isAuthenticated: state.isAuthenticated,
      user: state.user ? mapApiUser(state.user) : undefined,
      lastSyncAt: state.lastSyncAt,
    });
  }

  private getBoardMode(): BoardMode {
    return this.cloud?.sync.getBoardMode() ?? 'personal';
  }

  private isTeamMode(): boolean {
    return this.getBoardMode() === 'team';
  }

  private isCloudTask(taskId: string): boolean {
    if (!this.isTeamMode() || !this.cloud) {
      return false;
    }

    return this.cloud.sync
      .getCache()
      .tasks.some((task) => task.id === taskId && task.source === 'cloud');
  }

  private assertPersonalMode(): void {
    if (this.isTeamMode()) {
      throw new Error(
        'This action is not available in Team mode. Manage projects and tasks on mksflow.com.',
      );
    }
  }

  private postLinearState(): void {
    const linear = getLinearContext();
    if (!linear) {
      return;
    }

    const viewer = linear.auth.getCachedViewer();
    const status = linear.sync.getStatus();
    void linear.auth.hasApiKey().then((connected: boolean) => {
      this.postMessage({
        type: 'LINEAR_STATE',
        connected,
        viewerName: viewer?.name ?? null,
        organization: viewer?.organization ?? null,
        syncStatus: status.status,
        syncMessage: status.message ?? null,
        lastSyncAt: status.lastSyncAt,
      });
    });
  }

  private linearGetProjectConfig(projectId: string): void {
    const linear = getLinearContext();
    if (!linear) {
      return;
    }

    const config = linear.sync.getProjectConfig(projectId);
    this.postMessage({
      type: 'LINEAR_PROJECT_CONFIG',
      projectId,
      config: config
        ? {
            linearTeamId: config.linearTeamId,
            linearTeamName: config.linearTeamName,
            linearProjectId: config.linearProjectId,
            linearProjectName: config.linearProjectName,
            lastSyncAt: config.lastSyncAt,
          }
        : null,
    });
  }

  private async linearConnect(apiKey: string): Promise<void> {
    const linear = getLinearContext();
    if (!linear) {
      return;
    }

    await linear.auth.connect(apiKey);
    this.postLinearState();
  }

  private async linearDisconnect(): Promise<void> {
    const linear = getLinearContext();
    if (!linear) {
      return;
    }

    for (const projectId of linear.config.getLinkedProjectIds()) {
      await linear.sync.unlinkProject(projectId);
    }
    await linear.auth.disconnect();
    this.broadcastLocalUpdates();
    this.postLinearState();
  }

  private async linearTestConnection(): Promise<void> {
    const linear = getLinearContext();
    if (!linear) {
      return;
    }

    const organization = await linear.auth.testConnection();
    this.postLinearState();
    this.postMessage({
      type: 'LINEAR_SYNC_RESULT',
      projectId: '',
      pulled: 0,
      pushed: 0,
      conflicts: 0,
      errors: [],
    });
    void organization;
  }

  private async linearGetTeams(): Promise<void> {
    const linear = getLinearContext();
    if (!linear) {
      return;
    }

    const teams = await linear.sync.getTeams();
    this.postMessage({
      type: 'LINEAR_TEAMS',
      teams: teams.map((team: LinearTeamOption) => ({
        id: team.id,
        name: team.name,
        states: team.states,
        projects: team.projects,
      })),
    });
  }

  private async linearLinkProject(
    projectId: string,
    teamId: string,
    linearProjectId: string | null,
  ): Promise<void> {
    const linear = getLinearContext();
    if (!linear) {
      return;
    }

    const teams = await linear.sync.getTeams();
    const team = teams.find((item: LinearTeamOption) => item.id === teamId);
    if (!team) {
      throw new Error('Linear team not found');
    }

    const linearProject = linearProjectId
      ? team.projects.find((item) => item.id === linearProjectId) ?? null
      : null;

    const result = await linear.sync.linkProject(
      projectId,
      team,
      linearProject
        ? { id: linearProject.id, name: linearProject.name }
        : null,
    );

    this.broadcastLocalUpdates();
    this.linearGetProjectConfig(projectId);
    this.postMessage({
      type: 'LINEAR_SYNC_RESULT',
      projectId,
      ...result,
    });
    this.postLinearState();
  }

  private async linearUnlinkProject(projectId: string): Promise<void> {
    const linear = getLinearContext();
    if (!linear) {
      return;
    }

    await linear.sync.unlinkProject(projectId);
    this.broadcastLocalUpdates();
    this.linearGetProjectConfig(projectId);
    this.postLinearState();
  }

  private async linearSyncNow(projectId?: string): Promise<void> {
    const linear = getLinearContext();
    if (!linear) {
      return;
    }

    if (projectId) {
      const result = await linear.sync.syncProject(projectId);
      this.broadcastLocalUpdates();
      this.postMessage({ type: 'LINEAR_SYNC_RESULT', projectId, ...result });
    } else {
      await linear.sync.syncAllLinked();
      this.broadcastLocalUpdates();
    }

    this.postLinearState();
  }

  private async pushIntegrationSyncIfLinked(taskId: string): Promise<void> {
    await this.pushLinearTaskIfLinked(taskId);
    await this.pushGitHubTaskIfLinked(taskId);
    await this.pushNotionTaskIfLinked(taskId);
  }

  private async deleteIntegrationSyncIfLinked(task: Task): Promise<void> {
    await this.deleteLinearTaskIfLinked(task);
    await this.deleteGitHubTaskIfLinked(task);
    await this.deleteNotionTaskIfLinked(task);
  }

  private async pushLinearTaskIfLinked(taskId: string): Promise<void> {
    const linear = getLinearContext();
    if (!linear) {
      return;
    }

    const task = getContainer().taskService.findById(taskId);
    if (!task || !linear.sync.isProjectLinked(task.projectId)) {
      return;
    }

    try {
      await linear.sync.pushTask(task);
    } catch (error) {
      this.postMessage({
        type: 'ERROR',
        message:
          error instanceof Error
            ? `Linear sync failed: ${error.message}`
            : 'Linear sync failed',
      });
    }
  }

  private async deleteLinearTaskIfLinked(task: Task): Promise<void> {
    const linear = getLinearContext();
    if (!linear?.sync.isProjectLinked(task.projectId)) {
      return;
    }

    try {
      await linear.sync.deleteRemoteTask(task);
    } catch {
      // Best-effort remote delete
    }
  }

  private postGitHubState(): void {
    const github = getGitHubContext();
    if (!github) {
      return;
    }

    const user = github.auth.getCachedUser();
    const status = github.sync.getStatus();
    void github.auth.hasToken().then((connected: boolean) => {
      this.postMessage({
        type: 'GITHUB_STATE',
        connected,
        username: user?.login ?? null,
        syncStatus: status.status,
        syncMessage: status.message ?? null,
        lastSyncAt: status.lastSyncAt,
      });
    });
  }

  private githubGetProjectConfig(projectId: string): void {
    const github = getGitHubContext();
    if (!github) {
      return;
    }

    const config = github.sync.getProjectConfig(projectId);
    this.postMessage({
      type: 'GITHUB_PROJECT_CONFIG',
      projectId,
      config: config
        ? {
            owner: config.owner,
            repo: config.repo,
            repoFullName: config.repoFullName,
            syncModes: config.syncModes,
            ghProjectId: config.ghProjectId,
            ghProjectTitle: config.ghProjectTitle,
            lastSyncAt: config.lastSyncAt,
          }
        : null,
    });
  }

  private async githubConnect(token: string): Promise<void> {
    const github = getGitHubContext();
    if (!github) {
      return;
    }
    await github.auth.connect(token);
    this.postGitHubState();
  }

  private async githubDisconnect(): Promise<void> {
    const github = getGitHubContext();
    if (!github) {
      return;
    }
    for (const projectId of github.config.getLinkedProjectIds()) {
      await github.sync.unlinkProject(projectId);
    }
    await github.auth.disconnect();
    this.broadcastLocalUpdates();
    this.postGitHubState();
  }

  private async githubTestConnection(): Promise<void> {
    const github = getGitHubContext();
    if (!github) {
      return;
    }
    await github.auth.testConnection();
    this.postGitHubState();
  }

  private async githubGetRepos(): Promise<void> {
    const github = getGitHubContext();
    if (!github) {
      return;
    }
    const repos = await github.sync.getRepositories();
    this.postMessage({ type: 'GITHUB_REPOS', repos });
  }

  private async githubGetProjects(): Promise<void> {
    const github = getGitHubContext();
    if (!github) {
      return;
    }
    const projects = await github.sync.getProjects();
    this.postMessage({ type: 'GITHUB_PROJECTS', projects });
  }

  private async githubLinkProject(message: {
    projectId: string;
    owner: string;
    repo: string;
    repoFullName: string;
    syncModes: ('issues' | 'prs' | 'board')[];
    ghProjectId: string | null;
  }): Promise<void> {
    const github = getGitHubContext();
    if (!github) {
      return;
    }

    let ghProject = null;
    if (message.ghProjectId) {
      const projects = await github.sync.getProjects();
      ghProject = projects.find((item) => item.id === message.ghProjectId) ?? null;
    }

    const result = await github.sync.linkProject(
      message.projectId,
      {
        owner: message.owner,
        name: message.repo,
        fullName: message.repoFullName,
      },
      message.syncModes,
      ghProject,
    );

    this.broadcastLocalUpdates();
    this.githubGetProjectConfig(message.projectId);
    this.postMessage({ type: 'GITHUB_SYNC_RESULT', projectId: message.projectId, ...result });
    this.postGitHubState();
  }

  private async githubUnlinkProject(projectId: string): Promise<void> {
    const github = getGitHubContext();
    if (!github) {
      return;
    }
    await github.sync.unlinkProject(projectId);
    this.broadcastLocalUpdates();
    this.githubGetProjectConfig(projectId);
    this.postGitHubState();
  }

  private async githubSyncNow(projectId?: string): Promise<void> {
    const github = getGitHubContext();
    if (!github) {
      return;
    }

    if (projectId) {
      const result = await github.sync.syncProject(projectId);
      this.broadcastLocalUpdates();
      this.postMessage({ type: 'GITHUB_SYNC_RESULT', projectId, ...result });
    } else {
      await github.sync.syncAllLinked();
      this.broadcastLocalUpdates();
    }
    this.postGitHubState();
  }

  private async githubPrComment(taskId: string, comment: string): Promise<void> {
    const github = getGitHubContext();
    if (!github) {
      return;
    }
    const task = getContainer().taskService.findById(taskId);
    if (!task) {
      return;
    }
    await github.sync.addPrComment(task.projectId, taskId, comment);
  }

  private async pushGitHubTaskIfLinked(taskId: string): Promise<void> {
    const github = getGitHubContext();
    if (!github) {
      return;
    }

    const task = getContainer().taskService.findById(taskId);
    if (!task || !github.sync.isProjectLinked(task.projectId)) {
      return;
    }

    try {
      await github.sync.pushTask(task);
    } catch (error) {
      this.postMessage({
        type: 'ERROR',
        message:
          error instanceof Error
            ? `GitHub sync failed: ${error.message}`
            : 'GitHub sync failed',
      });
    }
  }

  private async deleteGitHubTaskIfLinked(task: Task): Promise<void> {
    const github = getGitHubContext();
    if (!github?.sync.isProjectLinked(task.projectId)) {
      return;
    }

    try {
      await github.sync.deleteRemoteTask(task);
    } catch {
      // Best-effort
    }
  }

  private postNotionState(): void {
    const notion = getNotionContext();
    if (!notion) {
      return;
    }

    const workspace = notion.auth.getCachedWorkspace();
    const status = notion.sync.getStatus();
    void notion.auth.hasToken().then((connected: boolean) => {
      this.postMessage({
        type: 'NOTION_STATE',
        connected,
        workspaceName: workspace?.name ?? null,
        syncStatus: status.status,
        syncMessage: status.message ?? null,
        lastSyncAt: status.lastSyncAt,
      });
    });
  }

  private notionGetProjectConfig(projectId: string): void {
    const notion = getNotionContext();
    if (!notion) {
      return;
    }

    const config = notion.sync.getProjectConfig(projectId);
    this.postMessage({
      type: 'NOTION_PROJECT_CONFIG',
      projectId,
      config: config
        ? {
            databaseId: config.databaseId,
            databaseTitle: config.databaseTitle,
            databaseUrl: config.databaseUrl,
            titleProperty: config.titleProperty,
            statusProperty: config.statusProperty,
            priorityProperty: config.priorityProperty,
            tagsProperty: config.tagsProperty,
            descriptionProperty: config.descriptionProperty,
            statusMap: config.statusMap,
            priorityMap: config.priorityMap,
            lastSyncAt: config.lastSyncAt,
          }
        : null,
    });
  }

  private async notionConnect(token: string): Promise<void> {
    const notion = getNotionContext();
    if (!notion) {
      return;
    }
    await notion.auth.connect(token);
    this.postNotionState();
  }

  private async notionDisconnect(): Promise<void> {
    const notion = getNotionContext();
    if (!notion) {
      return;
    }
    for (const projectId of notion.config.getLinkedProjectIds()) {
      await notion.sync.unlinkProject(projectId);
    }
    await notion.auth.disconnect();
    this.broadcastLocalUpdates();
    this.postNotionState();
  }

  private async notionTestConnection(): Promise<void> {
    const notion = getNotionContext();
    if (!notion) {
      return;
    }
    await notion.auth.testConnection();
    this.postNotionState();
  }

  private async notionGetDatabases(): Promise<void> {
    const notion = getNotionContext();
    if (!notion) {
      return;
    }
    const databases = await notion.sync.getDatabases();
    this.postMessage({ type: 'NOTION_DATABASES', databases });
  }

  private async notionGetDatabaseSchema(databaseId: string): Promise<void> {
    const notion = getNotionContext();
    if (!notion) {
      return;
    }
    const schema = await notion.sync.getDatabaseSchema(databaseId);
    const mapping = notion.sync.autoDetectMapping(schema);
    this.postMessage({
      type: 'NOTION_DATABASE_SCHEMA',
      databaseId,
      mapping: {
        titleProperty: mapping.titleProperty,
        statusProperty: mapping.statusProperty,
        priorityProperty: mapping.priorityProperty,
        tagsProperty: mapping.tagsProperty,
        descriptionProperty: mapping.descriptionProperty,
        statusMap: mapping.statusMap,
        priorityMap: mapping.priorityMap,
        statusOptions: mapping.statusOptions,
        priorityOptions: mapping.priorityOptions,
      },
    });
  }

  private async notionLinkProject(message: {
    projectId: string;
    databaseId: string;
    statusMap?: Record<string, TaskStatus>;
    priorityMap?: Record<string, TaskPriority>;
  }): Promise<void> {
    const notion = getNotionContext();
    if (!notion) {
      return;
    }

    const result = await notion.sync.linkProject(
      message.projectId,
      message.databaseId,
      {
        statusMap: message.statusMap,
        priorityMap: message.priorityMap,
      },
    );

    this.broadcastLocalUpdates();
    this.notionGetProjectConfig(message.projectId);
    this.postMessage({
      type: 'NOTION_SYNC_RESULT',
      projectId: message.projectId,
      ...result,
    });
    this.postNotionState();
  }

  private async notionUnlinkProject(projectId: string): Promise<void> {
    const notion = getNotionContext();
    if (!notion) {
      return;
    }
    await notion.sync.unlinkProject(projectId);
    this.broadcastLocalUpdates();
    this.notionGetProjectConfig(projectId);
    this.postNotionState();
  }

  private async notionSyncNow(projectId?: string): Promise<void> {
    const notion = getNotionContext();
    if (!notion) {
      return;
    }

    if (projectId) {
      const result = await notion.sync.syncProject(projectId);
      this.broadcastLocalUpdates();
      this.postMessage({ type: 'NOTION_SYNC_RESULT', projectId, ...result });
    } else {
      await notion.sync.syncAllLinked();
      this.broadcastLocalUpdates();
    }
    this.postNotionState();
  }

  private async pushNotionTaskIfLinked(taskId: string): Promise<void> {
    const notion = getNotionContext();
    if (!notion) {
      return;
    }

    const task = getContainer().taskService.findById(taskId);
    if (!task || !notion.sync.isProjectLinked(task.projectId)) {
      return;
    }

    try {
      await notion.sync.pushTask(task);
    } catch (error) {
      this.postMessage({
        type: 'ERROR',
        message:
          error instanceof Error
            ? `Notion sync failed: ${error.message}`
            : 'Notion sync failed',
      });
    }
  }

  private async deleteNotionTaskIfLinked(task: Task): Promise<void> {
    const notion = getNotionContext();
    if (!notion?.sync.isProjectLinked(task.projectId)) {
      return;
    }

    try {
      await notion.sync.deleteRemoteTask(task);
    } catch {
      // Best-effort
    }
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

function mimeTypeFromFileName(fileName: string): string {
  const extension = fileName.split('.').pop()?.toLowerCase();
  switch (extension) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'gif':
      return 'image/gif';
    case 'webp':
      return 'image/webp';
    case 'mp4':
      return 'video/mp4';
    case 'webm':
      return 'video/webm';
    case 'mov':
      return 'video/quicktime';
    default:
      return 'image/png';
  }
}
