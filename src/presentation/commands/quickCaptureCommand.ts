import * as vscode from 'vscode';
import { getContainer } from '../../application/containerHolder';
import type { Project } from '../../domain/models/Project';
import { COMMANDS } from '../../shared/constants';
import type { TaskTreeProvider } from '../treeview/TaskTreeProvider';
import {
  formatCommandError,
  getDefaultPriority,
  refreshViews,
} from './commandHelpers';

/**
 * Registers the Quick Capture command (Cmd+Shift+T).
 */
export function registerQuickCaptureCommand(
  context: vscode.ExtensionContext,
  treeProvider: TaskTreeProvider,
): void {
  const disposable = vscode.commands.registerCommand(
    COMMANDS.QUICK_CAPTURE,
    () => runQuickCapture(treeProvider),
  );

  context.subscriptions.push(disposable);
}

async function runQuickCapture(treeProvider: TaskTreeProvider): Promise<void> {
  try {
    const container = getContainer();
    const config = vscode.workspace.getConfiguration('mksflow');
    const defaultPriority = getDefaultPriority();
    const defaultProjectId = config
      .get<string>('quickCaptureDefaultProject', '')
      .trim();

    const project = await resolveProject(defaultProjectId);
    if (!project) {
      return;
    }

    const title = await vscode.window.showInputBox({
      title: 'MKSFlow Quick Capture',
      prompt: `New task in "${project.name}"`,
      placeHolder: 'Task title',
      ignoreFocusOut: true,
      validateInput: (value) =>
        value.trim() ? undefined : 'Task title is required',
    });

    if (!title?.trim()) {
      return;
    }

    container.taskService.create({
      projectId: project.id,
      title: title.trim(),
      status: 'todo',
      priority: defaultPriority,
    });

    refreshViews(treeProvider);
    void vscode.window.showInformationMessage(`Task created: ${title.trim()}`);
  } catch (error) {
    void vscode.window.showErrorMessage(formatCommandError(error));
  }
}

async function resolveProject(
  defaultProjectId: string,
): Promise<Project | undefined> {
  const container = getContainer();
  const projects = container.projectService.findAll();

  if (defaultProjectId) {
    const configured = container.projectService.findById(defaultProjectId);
    if (configured) {
      return configured;
    }
  }

  if (projects.length === 0) {
    const projectName = await vscode.window.showInputBox({
      title: 'MKSFlow Quick Capture',
      prompt: 'No projects yet. Enter a name for your first project.',
      placeHolder: 'Project name',
      ignoreFocusOut: true,
      validateInput: (value) =>
        value.trim() ? undefined : 'Project name is required',
    });

    if (!projectName?.trim()) {
      return undefined;
    }

    return container.projectService.create({ name: projectName.trim() });
  }

  if (projects.length === 1) {
    return projects[0];
  }

  const selection = await vscode.window.showQuickPick(
    projects.map((project) => ({
      label: project.name,
      description: project.description || undefined,
      project,
    })),
    {
      title: 'MKSFlow Quick Capture',
      placeHolder: 'Select a project',
      ignoreFocusOut: true,
    },
  );

  return selection?.project;
}
