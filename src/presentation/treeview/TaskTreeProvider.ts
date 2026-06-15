import * as vscode from 'vscode';
import { getContainer } from '../../application/containerHolder';
import type { TaskStatus } from '../../domain/types';
import { TASK_TREE_VIEW_ID } from '../../shared/constants';
import { summarizeTaskAttention } from '../../application/services/TaskAttentionService';
import {
  BoardLauncherStatusBar,
  refreshBoardLauncher,
} from '../statusbar/BoardLauncherStatusBar';
import {
  MessageTreeItem,
  OpenBoardTreeItem,
  ProjectTreeItem,
  StatusGroupTreeItem,
  TaskTreeItem,
  type TreeNode,
} from './TreeItems';

/**
 * Sidebar tree view for projects and tasks.
 */
export class TaskTreeProvider implements vscode.TreeDataProvider<TreeNode> {
  private readonly _onDidChangeTreeData = new vscode.EventEmitter<
    TreeNode | undefined
  >();

  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  /** Refreshes the tree view contents. */
  refresh(): void {
    this._onDidChangeTreeData.fire(undefined);
  }

  getTreeItem(element: TreeNode): vscode.TreeItem {
    return element;
  }

  getChildren(element?: TreeNode): TreeNode[] {
    try {
      const container = getContainer();

      if (!element) {
        const projects = container.projectService.findAll();
        if (projects.length === 0) {
          return [
            new MessageTreeItem(
              'No projects yet — use Quick Capture (Cmd+Shift+T)',
            ),
          ];
        }

        const attention = summarizeTaskAttention(container.taskService.findAll());
        return [
          new OpenBoardTreeItem(attention.badgeCount),
          ...projects.map((project) => new ProjectTreeItem(project)),
        ];
      }

      if (element instanceof ProjectTreeItem) {
        return buildStatusGroups(element.project);
      }

      if (element instanceof StatusGroupTreeItem) {
        return buildTasksForStatus(element.projectId, element.status);
      }

      return [];
    } catch {
      return [new MessageTreeItem('MKSFlow is not ready')];
    }
  }
}

function buildStatusGroups(project: import('../../domain/models/Project').Project): TreeNode[] {
  const container = getContainer();
  const tasks = container.taskService.findByProjectId(project.id);

  if (tasks.length === 0) {
    return [new MessageTreeItem('No tasks yet')];
  }

  const groups: TaskStatus[] = ['todo', 'doing', 'test', 'done'];

  return groups.flatMap((status) => {
    const count = tasks.filter((task) => task.status === status).length;
    if (count === 0) {
      return [];
    }

    return [new StatusGroupTreeItem(project.id, status, count)];
  });
}

function buildTasksForStatus(projectId: string, status: TaskStatus): TreeNode[] {
  const container = getContainer();

  return container.taskService
    .findByProjectId(projectId)
    .filter((task) => task.status === status)
    .map((task) => {
      let timerLabel: string | undefined;
      if (task.status === 'doing') {
        timerLabel = container.timerService.formatTime(
          container.timerService.getElapsedTime(task),
        );
      }

      return new TaskTreeItem(task, timerLabel);
    });
}

/** Registers the MKSFlow task tree view. */
export function registerTaskTreeView(
  context: vscode.ExtensionContext,
): TaskTreeProvider {
  const provider = new TaskTreeProvider();
  const treeView = vscode.window.createTreeView(TASK_TREE_VIEW_ID, {
    treeDataProvider: provider,
    showCollapseAll: true,
  });

  const applyBadge = (summary: ReturnType<typeof summarizeTaskAttention>): void => {
    if (summary.badgeCount > 0) {
      treeView.badge = {
        value: summary.badgeCount,
        tooltip: summary.badgeTooltip,
      };
    } else {
      treeView.badge = undefined;
    }
  };

  BoardLauncherStatusBar.setTreeBadgeUpdater(applyBadge);

  treeView.onDidChangeVisibility((event) => {
    if (event.visible) {
      refreshBoardLauncher();
    }
  });

  context.subscriptions.push(treeView);
  return provider;
}

export {
  MessageTreeItem,
  OpenBoardTreeItem,
  ProjectTreeItem,
  StatusGroupTreeItem,
  TaskTreeItem,
} from './TreeItems';
