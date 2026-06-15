import * as vscode from 'vscode';
import { getContainer } from '../../application/containerHolder';
import { TaskTransitionError } from '../../application/errors';
import { RepositoryError } from '../../infrastructure/repositories/RepositoryError';
import type { TaskTreeProvider } from '../treeview/TaskTreeProvider';
import { refreshActiveTaskStatusBar } from '../statusbar/ActiveTaskStatusBar';
import { refreshBoardLauncher } from '../statusbar/BoardLauncherStatusBar';

/** Refreshes tree view and status bar after data changes. */
export function refreshViews(treeProvider: TaskTreeProvider): void {
  treeProvider.refresh();
  refreshActiveTaskStatusBar();
  refreshBoardLauncher();
}

/** Formats errors for user-facing command feedback. */
export function formatCommandError(error: unknown): string {
  if (error instanceof TaskTransitionError) {
    return error.message;
  }

  if (error instanceof RepositoryError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Command failed';
}

/** Runs an async command handler with standard error reporting. */
export async function runCommand(
  treeProvider: TaskTreeProvider,
  action: () => Promise<void>,
): Promise<void> {
  try {
    await action();
    refreshViews(treeProvider);
  } catch (error) {
    void vscode.window.showErrorMessage(formatCommandError(error));
  }
}

/** Prompts the user to pick a default priority from settings. */
export function getDefaultPriority(): 'low' | 'medium' | 'high' | 'critical' {
  return vscode.workspace
    .getConfiguration('mksflow')
    .get<'low' | 'medium' | 'high' | 'critical'>('defaultPriority', 'medium');
}

/** Resolves a task id from a tree item or quick pick. */
export async function resolveTaskId(taskId?: string): Promise<string | undefined> {
  if (taskId) {
    return taskId;
  }

  const container = getContainer();
  const tasks = container.taskService.findAll();
  if (tasks.length === 0) {
    void vscode.window.showWarningMessage('No tasks available');
    return undefined;
  }

  const picked = await vscode.window.showQuickPick(
    tasks.map((task) => ({
      label: task.title,
      description: `${task.status} · ${task.priority}`,
      taskId: task.id,
    })),
    { placeHolder: 'Select a task' },
  );

  return picked?.taskId;
}

/** Resolves a project id from a tree item or quick pick. */
export async function resolveProjectId(
  projectId?: string,
): Promise<string | undefined> {
  if (projectId) {
    return projectId;
  }

  const container = getContainer();
  const projects = container.projectService.findAll();
  if (projects.length === 0) {
    void vscode.window.showWarningMessage('No projects available');
    return undefined;
  }

  const picked = await vscode.window.showQuickPick(
    projects.map((project) => ({
      label: project.name,
      projectId: project.id,
    })),
    { placeHolder: 'Select a project' },
  );

  return picked?.projectId;
}
