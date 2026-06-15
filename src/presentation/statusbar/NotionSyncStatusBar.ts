import * as vscode from 'vscode';
import { getNotionContext } from '../../application/notionContextHolder';

let instance: NotionSyncStatusBar | undefined;

/** Status bar item showing Notion sync health. */
export class NotionSyncStatusBar {
  private readonly statusBarItem: vscode.StatusBarItem;
  private updateInterval: ReturnType<typeof setInterval> | undefined;

  private constructor(context: vscode.ExtensionContext) {
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      88,
    );
    this.statusBarItem.name = 'MKSFlow Notion Sync';
    this.statusBarItem.command = 'mksflow.syncNotion';
    context.subscriptions.push(this.statusBarItem);

    const notion = getNotionContext();
    notion?.sync.onStatusChanged(() => this.refresh());
    notion?.sync.onSyncComplete(() => this.refresh());
  }

  static register(context: vscode.ExtensionContext): NotionSyncStatusBar {
    const bar = new NotionSyncStatusBar(context);
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
    const notion = getNotionContext();
    if (!notion) {
      this.statusBarItem.hide();
      return;
    }

    void notion.auth.hasToken().then((connected: boolean) => {
      if (!connected) {
        this.statusBarItem.hide();
        return;
      }

      const { status, message, lastSyncAt } = notion.sync.getStatus();
      const ago = formatRelative(lastSyncAt);
      const icon = status === 'error' ? '$(error)' : '$(notebook)';
      this.statusBarItem.text = `${icon} Notion: ${status === 'syncing' ? 'syncing…' : ago}`;
      this.statusBarItem.tooltip =
        message ??
        (lastSyncAt
          ? `Last synced ${ago}. Click to sync now.`
          : 'Click to sync Notion now');
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

export function refreshNotionSyncStatusBar(): void {
  instance?.refresh();
}
