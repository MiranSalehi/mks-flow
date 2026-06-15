import * as vscode from 'vscode';
import type { Project } from '../../domain/models/Project';
import type { Task } from '../../domain/models/Task';
import type { TaskPriority, TaskStatus } from '../../domain/types';

export const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: 'Todo',
  doing: 'Doing',
  test: 'Test',
  done: 'Done',
};

export const STATUS_ICONS: Record<TaskStatus, string> = {
  todo: '📋',
  doing: '⚡',
  test: '🧪',
  done: '✅',
};

export const PRIORITY_ICONS: Record<TaskPriority, string> = {
  critical: '🔴',
  high: '🟠',
  medium: '🟡',
  low: '🟢',
};

export type TreeNode =
  | MessageTreeItem
  | OpenBoardTreeItem
  | ProjectTreeItem
  | StatusGroupTreeItem
  | TaskTreeItem;

/** Pinned row at the top of the sidebar tree to open the Kanban board. */
export class OpenBoardTreeItem extends vscode.TreeItem {
  constructor(attentionCount: number) {
    const label =
      attentionCount > 0
        ? `Open Kanban Board (${attentionCount})`
        : 'Open Kanban Board';
    super(label, vscode.TreeItemCollapsibleState.None);

    this.contextValue = 'mksflow.openBoard';
    this.iconPath = new vscode.ThemeIcon('layout');
    this.description = 'Board';
    this.tooltip = 'Open the MKSFlow Kanban board';
    this.command = {
      command: 'mksflow.openBoard',
      title: 'Open Board',
    };
  }
}

/** Placeholder row when there is nothing to show. */
export class MessageTreeItem extends vscode.TreeItem {
  constructor(label: string) {
    super(label, vscode.TreeItemCollapsibleState.None);
    this.contextValue = 'mksflow.message';
  }
}

/** Project root node with color indicator. */
export class ProjectTreeItem extends vscode.TreeItem {
  constructor(public readonly project: Project) {
    super(project.name, vscode.TreeItemCollapsibleState.Expanded);
    this.description = project.mode;
    this.contextValue = 'mksflow.project';
    this.iconPath = createColorDotIcon(project.color);
    this.tooltip = `${project.name}\n${project.description || 'No description'}`;
  }
}

/** Status group header under a project. */
export class StatusGroupTreeItem extends vscode.TreeItem {
  constructor(
    public readonly projectId: string,
    public readonly status: TaskStatus,
    count: number,
  ) {
    super(
      `${STATUS_ICONS[status]} ${STATUS_LABELS[status]} (${count})`,
      vscode.TreeItemCollapsibleState.Collapsed,
    );
    this.contextValue = 'mksflow.statusGroup';
  }
}

/** Leaf task node — contextValue drives the context menu when-clauses. */
export class TaskTreeItem extends vscode.TreeItem {
  public readonly task: Task;

  constructor(task: Task, timerLabel?: string) {
    const prefix = PRIORITY_ICONS[task.priority];
    const suffix = timerLabel ? ` ▶ ${timerLabel}` : '';
    super(`${prefix} ${task.title}${suffix}`, vscode.TreeItemCollapsibleState.None);

    this.task = task;
    this.contextValue = `mksflow.task.${task.status}`;
    this.description = task.priority;
    this.tooltip = buildTaskTooltip(task, timerLabel);
    this.iconPath = new vscode.ThemeIcon('issue');
  }
}

function buildTaskTooltip(task: Task, timerLabel?: string): string {
  const lines = [
    task.title,
    `Status: ${task.status}`,
    `Priority: ${task.priority}`,
  ];

  if (timerLabel) {
    lines.push(`Time: ${timerLabel}`);
  }

  if (task.description) {
    lines.push('', task.description);
  }

  return lines.join('\n');
}

function createColorDotIcon(color: string): vscode.Uri {
  const safeColor = /^#[0-9A-Fa-f]{6}$/.test(color) ? color : '#007ACC';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"><circle cx="8" cy="8" r="6" fill="${safeColor}"/></svg>`;
  return vscode.Uri.parse(
    `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`,
  );
}

/** Type guard for task tree items passed into commands. */
export function isTaskTreeItem(item: unknown): item is TaskTreeItem {
  return item instanceof TaskTreeItem;
}

/** Type guard for project tree items passed into commands. */
export function isProjectTreeItem(item: unknown): item is ProjectTreeItem {
  return item instanceof ProjectTreeItem;
}
