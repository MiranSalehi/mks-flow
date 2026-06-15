import * as vscode from 'vscode';
import { getGitHubContext } from '../../application/githubContextHolder';

let instance: GitHubSyncStatusBar | undefined;

/** Status bar item showing GitHub sync health. */
export class GitHubSyncStatusBar {
  private readonly statusBarItem: vscode.StatusBarItem;
  private updateInterval: ReturnType<typeof setInterval> | undefined;

  private constructor(context: vscode.ExtensionContext) {
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      89,
    );
    this.statusBarItem.name = 'MKSFlow GitHub Sync';
    this.statusBarItem.command = 'mksflow.syncGitHub';
    context.subscriptions.push(this.statusBarItem);

    const github = getGitHubContext();
    github?.sync.onStatusChanged(() => this.refresh());
    github?.sync.onSyncComplete(() => this.refresh());
  }

  static register(context: vscode.ExtensionContext): GitHubSyncStatusBar {
    const bar = new GitHubSyncStatusBar(context);
    instance = bar;
    bar.start();
    context.subscriptions.push({ dispose: () => bar.dispose() });
    return bar;
  }

  start(): void {
    this.refresh();
    this.updateInterval = setInterval(() => this.refresh(), 60_000);
  }

  refresh(): void {
    const github = getGitHubContext();
    if (!github) {
      this.statusBarItem.hide();
      return;
    }

    void github.auth.hasToken().then((connected: boolean) => {
      if (!connected) {
        this.statusBarItem.hide();
        return;
      }

      const { status, message, lastSyncAt } = github.sync.getStatus();
      const ago = formatRelative(lastSyncAt);
      const icon = status === 'error' ? '$(error)' : '$(github)';
      this.statusBarItem.text = `${icon} GitHub: ${status === 'syncing' ? 'syncing…' : ago}`;
      this.statusBarItem.tooltip =
        message ??
        (lastSyncAt
          ? `Last synced ${ago}. Click to sync now.`
          : 'Click to sync GitHub now');
      this.statusBarItem.backgroundColor =
        status === 'error'
          ? new vscode.ThemeColor('statusBarItem.errorBackground')
          : undefined;
      this.statusBarItem.show();
    });
  }

  dispose(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
    this.statusBarItem.dispose();
    instance = undefined;
  }
}

function formatRelative(iso: string | null): string {
  if (!iso) {
    return 'not synced';
  }
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (minutes < 1) {
    return 'just now';
  }
  if (minutes < 60) {
    return `${minutes}m ago`;
  }
  return `${Math.floor(minutes / 60)}h ago`;
}

export function refreshGitHubSyncStatusBar(): void {
  instance?.refresh();
}
