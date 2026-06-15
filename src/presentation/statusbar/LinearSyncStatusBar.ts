import * as vscode from 'vscode';
import { getLinearContext } from '../../application/linearContextHolder';

const REFRESH_INTERVAL_MS = 60_000;

let instance: LinearSyncStatusBar | undefined;

/**
 * Status bar item showing Linear sync health (bottom-right).
 */
export class LinearSyncStatusBar {
  private readonly statusBarItem: vscode.StatusBarItem;
  private updateInterval: ReturnType<typeof setInterval> | undefined;

  private constructor(private readonly context: vscode.ExtensionContext) {
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      90,
    );
    this.statusBarItem.name = 'MKSFlow Linear Sync';
    this.statusBarItem.command = 'mksflow.syncLinear';
    this.context.subscriptions.push(this.statusBarItem);

    const linear = getLinearContext();
    linear?.sync.onStatusChanged(() => this.refresh());
    linear?.sync.onSyncComplete(() => this.refresh());
  }

  static register(context: vscode.ExtensionContext): LinearSyncStatusBar {
    const bar = new LinearSyncStatusBar(context);
    instance = bar;
    bar.start();
    context.subscriptions.push({ dispose: () => bar.dispose() });
    return bar;
  }

  static getInstance(): LinearSyncStatusBar | undefined {
    return instance;
  }

  start(): void {
    this.refresh();
    this.updateInterval = setInterval(() => this.refresh(), REFRESH_INTERVAL_MS);
  }

  refresh(): void {
    const linear = getLinearContext();
    if (!linear) {
      this.statusBarItem.hide();
      return;
    }

    void linear.auth.hasApiKey().then((connected: boolean) => {
      if (!connected) {
        this.statusBarItem.hide();
        return;
      }

      const { status, message, lastSyncAt } = linear.sync.getStatus();
      const ago = formatRelative(lastSyncAt);
      const icon = status === 'error' ? '$(error)' : '$(arrow-swap)';
      this.statusBarItem.text = `${icon} Linear: ${status === 'syncing' ? 'syncing…' : ago}`;
      this.statusBarItem.tooltip =
        message ??
        (lastSyncAt
          ? `Last synced ${ago}. Click to sync now.`
          : 'Click to sync Linear now');
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
      this.updateInterval = undefined;
    }
    this.statusBarItem.dispose();
    instance = undefined;
  }
}

function formatRelative(iso: string | null): string {
  if (!iso) {
    return 'not synced';
  }

  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) {
    return 'just now';
  }
  if (minutes < 60) {
    return `${minutes}m ago`;
  }
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

export function refreshLinearSyncStatusBar(): void {
  instance?.refresh();
}
