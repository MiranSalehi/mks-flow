import * as vscode from 'vscode';
import { getContainer } from '../../application/containerHolder';
import { summarizeTaskAttention } from '../../application/services/TaskAttentionService';
import { MainPanel } from '../webview/panels/MainPanel';

const LAUNCHER_PRIORITY = 200;

let instance: BoardLauncherStatusBar | undefined;
let treeBadgeUpdater: ((summary: ReturnType<typeof summarizeTaskAttention>) => void) | undefined;

/**
 * Right-aligned status bar entry: MKSFlow launcher with optional attention count.
 */
export class BoardLauncherStatusBar {
  private readonly statusBarItem: vscode.StatusBarItem;

  private constructor(private readonly context: vscode.ExtensionContext) {
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      LAUNCHER_PRIORITY,
    );
    this.statusBarItem.name = 'MKSFlow Board';
    this.statusBarItem.command = 'mksflow.openBoard';
    this.context.subscriptions.push(this.statusBarItem);
  }

  static register(context: vscode.ExtensionContext): BoardLauncherStatusBar {
    const launcher = new BoardLauncherStatusBar(context);
    instance = launcher;

    context.subscriptions.push({
      dispose: () => {
        instance = undefined;
        treeBadgeUpdater = undefined;
      },
    });

    const configListener = vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration('mksflow.showBoardLauncher')) {
        launcher.refresh();
      }
    });
    context.subscriptions.push(configListener);

    launcher.refresh();
    return launcher;
  }

  static setTreeBadgeUpdater(
    updater: (summary: ReturnType<typeof summarizeTaskAttention>) => void,
  ): void {
    treeBadgeUpdater = updater;
  }

  refresh(): void {
    if (!this.isEnabled()) {
      this.statusBarItem.hide();
      treeBadgeUpdater?.({
        testCount: 0,
        doingCount: 0,
        badgeCount: 0,
        badgeTooltip: 'MKSFlow',
      });
      return;
    }

    const summary = summarizeTaskAttention(getContainer().taskService.findAll());
    treeBadgeUpdater?.(summary);

    const parts = ['$(layout) MKSFlow'];
    if (summary.badgeCount > 0) {
      parts.push(`$(circle-filled) ${summary.badgeCount}`);
      this.statusBarItem.backgroundColor = new vscode.ThemeColor(
        'statusBarItem.prominentBackground',
      );
      this.statusBarItem.color = new vscode.ThemeColor(
        'statusBarItem.prominentForeground',
      );
    } else {
      this.statusBarItem.backgroundColor = undefined;
      this.statusBarItem.color = undefined;
    }

    this.statusBarItem.text = parts.join(' ');
    this.statusBarItem.tooltip = `${summary.badgeTooltip}\n\nClick to open the Kanban board`;
    this.statusBarItem.show();
  }

  openBoard(): void {
    MainPanel.createOrShow(this.context);
  }

  private isEnabled(): boolean {
    return vscode.workspace
      .getConfiguration('mksflow')
      .get<boolean>('showBoardLauncher', true);
  }
}

export function refreshBoardLauncher(): void {
  instance?.refresh();
}
