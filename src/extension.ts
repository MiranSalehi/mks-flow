import * as path from 'path';
import * as vscode from 'vscode';
import {
  clearContainer,
  setContainer,
} from './application/containerHolder';
import { Container } from './application/container';
import {
  DatabaseError,
  DatabaseManager,
} from './infrastructure/database/DatabaseManager';
import { MainPanel } from './presentation/webview/panels/MainPanel';
import { registerCommands } from './presentation/commands';
import { ActiveTaskStatusBar } from './presentation/statusbar/ActiveTaskStatusBar';
import { registerTaskTreeView } from './presentation/treeview/TaskTreeProvider';

let databaseManager: DatabaseManager | undefined;

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
    void vscode.window.showErrorMessage(message);
    return;
  }

  const treeProvider = registerTaskTreeView(context);
  MainPanel.setTreeProvider(treeProvider);
  registerCommands(context, treeProvider);
  ActiveTaskStatusBar.register(context);

  const openBoard = vscode.commands.registerCommand('mksflow.openBoard', () => {
    MainPanel.createOrShow(context);
  });

  context.subscriptions.push(openBoard);
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
  clearContainer();
  databaseManager?.close();
  databaseManager = undefined;
}
