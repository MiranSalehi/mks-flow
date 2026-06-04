import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import type { WebviewMessage } from '../../../shared/messages';
import { getContainer } from '../../../application/containerHolder';
import { WEBVIEW_VIEW_TYPE } from '../../../shared/constants';
import type { TaskTreeProvider } from '../../treeview/TaskTreeProvider';
import { WebviewMessageHandler } from '../WebviewMessageHandler';

const TIMER_TICK_MS = 60_000;

/**
 * Kanban board webview panel — loads the Vite-built React UI from dist/webview.
 */
export class MainPanel {
  public static currentPanel: MainPanel | undefined;
  private static treeProvider: TaskTreeProvider | undefined;

  private readonly _panel: vscode.WebviewPanel;
  private readonly _extensionUri: vscode.Uri;
  private readonly _messageHandler: WebviewMessageHandler;
  private _disposables: vscode.Disposable[] = [];
  private _timerInterval: ReturnType<typeof setInterval> | undefined;

  private constructor(
    panel: vscode.WebviewPanel,
    extensionUri: vscode.Uri,
    treeProvider?: TaskTreeProvider,
  ) {
    this._panel = panel;
    this._extensionUri = extensionUri;
    this._messageHandler = new WebviewMessageHandler(
      (message) => {
        void this._panel.webview.postMessage(message);
      },
      panel.webview,
      treeProvider,
    );

    this._panel.webview.html = this._getHtmlForWebview(this._panel.webview);
    this._panel.webview.onDidReceiveMessage(
      (message: WebviewMessage) => {
        void this._messageHandler.handle(message);
      },
      null,
      this._disposables,
    );

    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
    this._startTimerTicks();
    this._messageHandler.sendInitData();
  }

  /** Sets the tree provider used to refresh the sidebar after webview mutations. */
  static setTreeProvider(provider: TaskTreeProvider): void {
    MainPanel.treeProvider = provider;
  }

  /**
   * Opens the board panel, or reveals it if already open.
   */
  public static createOrShow(
    context: vscode.ExtensionContext,
    options?: { taskId?: string },
  ): void {
    const extensionUri = context.extensionUri;
    const column = vscode.window.activeTextEditor?.viewColumn;

    if (MainPanel.currentPanel) {
      MainPanel.currentPanel._panel.reveal(column);
      if (options?.taskId) {
        MainPanel.currentPanel.openTaskDetail(options.taskId);
      }
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      WEBVIEW_VIEW_TYPE,
      'MKSFlow Board',
      column ?? vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode.Uri.joinPath(extensionUri, 'dist', 'webview'),
          ...(vscode.workspace.workspaceFolders?.map((folder) => folder.uri) ??
            []),
        ],
      },
    );

    MainPanel.currentPanel = new MainPanel(
      panel,
      extensionUri,
      MainPanel.treeProvider,
    );

    if (options?.taskId) {
      MainPanel.currentPanel.openTaskDetail(options.taskId);
    }
  }

  /** Sends a message to open a task detail panel in the webview. */
  public openTaskDetail(taskId: string): void {
    void this._panel.webview.postMessage({
      type: 'OPEN_TASK',
      taskId,
    });
  }

  /** Releases panel resources. */
  public dispose(): void {
    MainPanel.currentPanel = undefined;
    if (this._timerInterval) {
      clearInterval(this._timerInterval);
      this._timerInterval = undefined;
    }
    this._panel.dispose();
    while (this._disposables.length) {
      const disposable = this._disposables.pop();
      disposable?.dispose();
    }
  }

  private _startTimerTicks(): void {
    this._timerInterval = setInterval(() => {
      try {
        const container = getContainer();
        const doingTasks = container.taskService
          .findAll()
          .filter((task) => task.status === 'doing');

        for (const task of doingTasks) {
          void this._panel.webview.postMessage({
            type: 'TIMER_TICK',
            taskId: task.id,
            elapsed: container.timerService.getElapsedTime(task),
          });
        }
      } catch {
        // Container unavailable during shutdown
      }
    }, TIMER_TICK_MS);
  }

  private _getHtmlForWebview(webview: vscode.Webview): string {
    const webviewDist = path.join(
      this._extensionUri.fsPath,
      'dist',
      'webview',
    );
    const indexPath = path.join(webviewDist, 'index.html');

    if (!fs.existsSync(indexPath)) {
      return this._buildMissingWebviewHtml();
    }

    let html = fs.readFileSync(indexPath, 'utf8');
    html = html.replace(/(href|src)="([^"]+)"/g, (_match, attr, assetPath) => {
      if (assetPath.startsWith('http') || assetPath.startsWith('data:')) {
        return `${attr}="${assetPath}"`;
      }
      const cleanPath = assetPath.replace(/^\.\//, '');
      const resourceUri = webview.asWebviewUri(
        vscode.Uri.joinPath(this._extensionUri, 'dist', 'webview', cleanPath),
      );
      return `${attr}="${resourceUri}"`;
    });

    return html;
  }

  private _buildMissingWebviewHtml(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <style>
    body {
      font-family: var(--vscode-font-family);
      color: var(--vscode-foreground);
      background: var(--vscode-editor-background);
      padding: 24px;
    }
  </style>
</head>
<body>
  <h2>MKSFlow webview not built</h2>
  <p>Run <code>npm run build:webview</code> in the project root, then reload the window.</p>
</body>
</html>`;
  }
}
