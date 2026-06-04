import * as vscode from 'vscode';
import { getContainer } from '../../application/containerHolder';
import { COMMANDS } from '../../shared/constants';
import {
  isProjectTreeItem,
  ProjectTreeItem,
} from '../treeview/TreeItems';
import type { TaskTreeProvider } from '../treeview/TaskTreeProvider';
import {
  getDefaultPriority,
  resolveProjectId,
  runCommand,
} from './commandHelpers';

/**
 * Registers project-related commands.
 */
export function registerProjectCommands(
  context: vscode.ExtensionContext,
  treeProvider: TaskTreeProvider,
): void {
  context.subscriptions.push(
    vscode.commands.registerCommand(COMMANDS.CREATE_PROJECT, () =>
      runCommand(treeProvider, () => createProject()),
    ),
    vscode.commands.registerCommand(
      COMMANDS.DELETE_PROJECT,
      (item?: ProjectTreeItem) =>
        runCommand(treeProvider, () => deleteProject(item)),
    ),
    vscode.commands.registerCommand(
      COMMANDS.CREATE_TASK,
      (item?: ProjectTreeItem) =>
        runCommand(treeProvider, () => createTask(item)),
    ),
    vscode.commands.registerCommand(
      COMMANDS.EXPORT_PROJECT,
      (item?: ProjectTreeItem) =>
        runCommand(treeProvider, () => exportProject(item)),
    ),
  );
}

async function createProject(): Promise<void> {
  const name = await vscode.window.showInputBox({
    title: 'Create Project',
    prompt: 'Project name',
    ignoreFocusOut: true,
    validateInput: (value) => (value.trim() ? undefined : 'Name is required'),
  });

  if (!name?.trim()) {
    return;
  }

  const description = await vscode.window.showInputBox({
    title: 'Create Project',
    prompt: 'Description (optional)',
    ignoreFocusOut: true,
  });

  const container = getContainer();
  const project = container.projectService.create({
    name: name.trim(),
    description: description?.trim() ?? '',
  });

  void vscode.window.showInformationMessage(`Project created: ${project.name}`);
}

async function deleteProject(item?: ProjectTreeItem): Promise<void> {
  const projectId = isProjectTreeItem(item)
    ? item.project.id
    : await resolveProjectId();

  if (!projectId) {
    return;
  }

  const container = getContainer();
  const project = container.projectService.findById(projectId);
  if (!project) {
    return;
  }

  const confirm = await vscode.window.showWarningMessage(
    `Delete project "${project.name}" and all its tasks?`,
    { modal: true },
    'Delete',
  );

  if (confirm !== 'Delete') {
    return;
  }

  container.projectService.delete(projectId);
  void vscode.window.showInformationMessage(`Project deleted: ${project.name}`);
}

async function createTask(item?: ProjectTreeItem): Promise<void> {
  const projectId = isProjectTreeItem(item)
    ? item.project.id
    : await resolveProjectId();

  if (!projectId) {
    return;
  }

  const container = getContainer();
  const project = container.projectService.findById(projectId);
  if (!project) {
    return;
  }

  const title = await vscode.window.showInputBox({
    title: `New Task — ${project.name}`,
    prompt: 'Task title',
    ignoreFocusOut: true,
    validateInput: (value) => (value.trim() ? undefined : 'Title is required'),
  });

  if (!title?.trim()) {
    return;
  }

  container.taskService.create({
    projectId,
    title: title.trim(),
    status: 'todo',
    priority: getDefaultPriority(),
  });

  void vscode.window.showInformationMessage(`Task created: ${title.trim()}`);
}

async function exportProject(item?: ProjectTreeItem): Promise<void> {
  const projectId = isProjectTreeItem(item)
    ? item.project.id
    : await resolveProjectId();

  if (!projectId) {
    return;
  }

  await getContainer().exportService.saveExportFile(projectId);
}
