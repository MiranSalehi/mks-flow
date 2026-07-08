import * as path from 'path';
import * as vscode from 'vscode';
import {
  clearContainer,
  getContainer,
  setContainer,
} from './application/containerHolder';
import { Container } from './application/container';
import {
  setLinearContext,
  clearLinearContext,
} from './application/linearContextHolder';
import { LinearAuthService } from './application/services/LinearAuthService';
import { LinearConfigService } from './application/services/LinearConfigService';
import { LinearSyncService } from './application/services/LinearSyncService';
import {
  DatabaseError,
  DatabaseManager,
} from './infrastructure/database/DatabaseManager';
import { MainPanel } from './presentation/webview/panels/MainPanel';
import { registerCommands } from './presentation/commands';
import { ActiveTaskStatusBar } from './presentation/statusbar/ActiveTaskStatusBar';
import { BoardLauncherStatusBar } from './presentation/statusbar/BoardLauncherStatusBar';
import { GitHubSyncStatusBar } from './presentation/statusbar/GitHubSyncStatusBar';
import { NotionSyncStatusBar } from './presentation/statusbar/NotionSyncStatusBar';
import { LinearSyncStatusBar } from './presentation/statusbar/LinearSyncStatusBar';
import { registerTaskTreeView } from './presentation/treeview/TaskTreeProvider';
import {
  clearCloudContext,
  setCloudContext,
} from './application/cloudContextHolder';
import { CloudAuthService } from './application/services/CloudAuthService';
import { CloudSyncService } from './application/services/CloudSyncService';
import { CloudTaskService } from './application/services/CloudTaskService';
import { CloudApiClient } from './infrastructure/cloud/CloudApiClient';
import {
  setGitHubContext,
  clearGitHubContext,
} from './application/githubContextHolder';
import {
  setNotionContext,
  clearNotionContext,
} from './application/notionContextHolder';
import { GitHubAuthService } from './application/services/GitHubAuthService';
import { GitHubConfigService } from './application/services/GitHubConfigService';
import { GitHubSyncService } from './application/services/GitHubSyncService';
import { NotionAuthService } from './application/services/NotionAuthService';
import { NotionConfigService } from './application/services/NotionConfigService';
import { NotionSyncService } from './application/services/NotionSyncService';
import { GitHubApiClient } from './infrastructure/github/GitHubApiClient';
import { NotionApiClient } from './infrastructure/notion/NotionApiClient';
import { LinearApiClient } from './infrastructure/linear/LinearApiClient';
import { ensureMksflowGitignore } from './shared/mksflowGitignore';

let databaseManager: DatabaseManager | undefined;
let activationErrorMessage: string | undefined;

/**
 * Resolves the root directory used for the SQLite database file.
 */
function resolveStoragePath(context: vscode.ExtensionContext): string {
  const customPath = vscode.workspace
    .getConfiguration('mksflow')
    .get<string>('databasePath', '')
    .trim();

  return customPath || context.globalStoragePath;
}

/**
 * Activates the MKSFlow extension.
 */
export function activate(context: vscode.ExtensionContext): void {
  const openBoardCommand = vscode.commands.registerCommand(
    'mksflow.openBoard',
    () => {
      if (!databaseManager) {
        void vscode.window.showErrorMessage(
          activationErrorMessage ??
            'MKSFlow could not start. Reinstall the extension or check Output → MKSFlow.',
        );
        return;
      }
      MainPanel.createOrShow(context);
    },
  );
  context.subscriptions.push(openBoardCommand);

  const treeProvider = registerTaskTreeView(context);
  MainPanel.setTreeProvider(treeProvider);

  try {
    const storagePath = resolveStoragePath(context);
    const migrationsDir = path.join(
      context.extensionPath,
      'dist',
      'migrations',
    );

    databaseManager = DatabaseManager.getInstance(storagePath, migrationsDir);
    const container = Container.create(databaseManager.db);
    container.resumeTimers();
    setContainer(container);
  } catch (error) {
    const message =
      error instanceof DatabaseError
        ? error.getDisplayMessage()
        : formatActivationError(error);

    console.error('[MKSFlow] Database initialization failed:', error);
    activationErrorMessage = message;
    void vscode.window.showErrorMessage(message);
    return;
  }

  for (const folder of vscode.workspace.workspaceFolders ?? []) {
    ensureMksflowGitignore(folder.uri.fsPath);
  }

  const cloudApi = new CloudApiClient();
  const cloudAuth = new CloudAuthService(context, cloudApi);
  const cloudSync = new CloudSyncService(context, cloudApi, cloudAuth);
  const cloudTasks = new CloudTaskService(cloudApi, cloudSync);
  setCloudContext({
    api: cloudApi,
    auth: cloudAuth,
    sync: cloudSync,
    tasks: cloudTasks,
  });
  void cloudSync.initialize();

  const linearApi = new LinearApiClient();
  const linearAuth = new LinearAuthService(context, linearApi);
  const linearConfig = new LinearConfigService(context);
  const appContainer = getContainer();
  const linearSync = new LinearSyncService(
    linearAuth,
    linearConfig,
    linearApi,
    appContainer.taskRepository,
    appContainer.projectRepository,
  );
  setLinearContext({
    api: linearApi,
    auth: linearAuth,
    config: linearConfig,
    sync: linearSync,
  });
  void linearSync.initialize();

  const githubApi = new GitHubApiClient();
  const githubAuth = new GitHubAuthService(context, githubApi);
  const githubConfig = new GitHubConfigService(context);
  const githubSync = new GitHubSyncService(
    githubAuth,
    githubConfig,
    githubApi,
    appContainer.taskRepository,
    appContainer.projectRepository,
  );
  setGitHubContext({
    api: githubApi,
    auth: githubAuth,
    config: githubConfig,
    sync: githubSync,
  });
  void githubSync.initialize();

  const notionApi = new NotionApiClient();
  const notionAuth = new NotionAuthService(context, notionApi);
  const notionConfig = new NotionConfigService(context);
  const notionSync = new NotionSyncService(
    notionAuth,
    notionConfig,
    notionApi,
    appContainer.taskRepository,
    appContainer.projectRepository,
  );
  setNotionContext({
    api: notionApi,
    auth: notionAuth,
    config: notionConfig,
    sync: notionSync,
  });
  void notionSync.initialize();

  MainPanel.setCloudContext({
    api: cloudApi,
    auth: cloudAuth,
    sync: cloudSync,
    tasks: cloudTasks,
  });
  registerCommands(context, treeProvider);
  ActiveTaskStatusBar.register(context);
  BoardLauncherStatusBar.register(context);
  LinearSyncStatusBar.register(context);
  GitHubSyncStatusBar.register(context);
  NotionSyncStatusBar.register(context);
}

function formatActivationError(error: unknown): string {
  if (error instanceof Error) {
    return `MKSFlow failed to open its local database: ${error.message}`;
  }

  return 'MKSFlow failed to open its local database';
}

/**
 * Deactivates the MKSFlow extension and releases resources.
 */
export function deactivate(): void {
  MainPanel.currentPanel?.dispose();
  clearGitHubContext();
  clearNotionContext();
  clearLinearContext();
  clearCloudContext();
  clearContainer();
  databaseManager?.close();
  databaseManager = undefined;
}
