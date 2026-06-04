import * as vscode from 'vscode';
import { getContainer } from '../../application/containerHolder';
import type { Task } from '../../domain/models/Task';
import { MainPanel } from '../webview/panels/MainPanel';

const UPDATE_INTERVAL_MS = 60_000;

let instance: ActiveTaskStatusBar | undefined;

/**
 * Status bar item showing the active "doing" task and elapsed time.
 */
export class ActiveTaskStatusBar {
  private readonly statusBarItem: vscode.StatusBarItem;
  private updateInterval: ReturnType<typeof setInterval> | undefined;

  private constructor(private readonly context: vscode.ExtensionContext) {
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left,
      100,
    );
    this.statusBarItem.name = 'MKSFlow Active Task';
    this.statusBarItem.command = 'mksflow.openActiveTask';
    this.context.subscriptions.push(this.statusBarItem);
  }

  /** Creates and starts the active task status bar. */
  static register(context: vscode.ExtensionContext): ActiveTaskStatusBar {
    const statusBar = new ActiveTaskStatusBar(context);
    instance = statusBar;

    const openActiveTask = vscode.commands.registerCommand(
      'mksflow.openActiveTask',
      () => statusBar.openActiveTask(),
    );
    context.subscriptions.push(openActiveTask);

    statusBar.start();

    const configListener = vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration('mksflow.showTimerInStatusBar')) {
        statusBar.refresh();
      }
    });
    context.subscriptions.push(configListener);

    context.subscriptions.push({ dispose: () => statusBar.dispose() });

    return statusBar;
  }

  /** Returns the shared status bar instance, if registered. */
  static getInstance(): ActiveTaskStatusBar | undefined {
    return instance;
  }

  /** Starts periodic refresh and shows the item when applicable. */
  start(): void {
    this.refresh();
    this.updateInterval = setInterval(() => this.refresh(), UPDATE_INTERVAL_MS);
  }

  /** Re-reads the active task and updates visibility/text. */
  refresh(): void {
    if (!this.isEnabled()) {
      this.statusBarItem.hide();
      return;
    }

    const task = getActiveDoingTask();
    if (!task) {
      this.statusBarItem.hide();
      return;
    }

    const container = getContainer();
    const elapsed = container.timerService.formatTime(
      container.timerService.getElapsedTime(task),
    );

    this.statusBarItem.text = `$(zap) Working on: ${task.title} — ${elapsed}`;
    this.statusBarItem.tooltip = 'Open active task in MKSFlow board';
    this.statusBarItem.show();
  }

  /** Opens the board focused on the active doing task. */
  openActiveTask(): void {
    const task = getActiveDoingTask();
    if (!task) {
      return;
    }

    MainPanel.createOrShow(this.context, { taskId: task.id });
  }

  /** Clears timers and hides the status bar item. */
  dispose(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = undefined;
    }

    this.statusBarItem.dispose();
    instance = undefined;
  }

  private isEnabled(): boolean {
    return vscode.workspace
      .getConfiguration('mksflow')
      .get<boolean>('showTimerInStatusBar', true);
  }
}

/** Returns the task currently in "doing" status, preferring one with a running timer. */
function getActiveDoingTask(): Task | null {
  const container = getContainer();
  const doingTasks = container.taskService
    .findAll()
    .filter((task) => task.status === 'doing');

  if (doingTasks.length === 0) {
    return null;
  }

  return doingTasks.find((task) => task.timerStartedAt !== null) ?? doingTasks[0];
}

/** Refreshes the status bar if it is registered. */
export function refreshActiveTaskStatusBar(): void {
  instance?.refresh();
}
