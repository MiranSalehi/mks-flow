import * as vscode from 'vscode';
import { dispatchTaskToAi } from '../../application/services/AITaskDispatchService';
import { getContainer } from '../../application/containerHolder';
import type { TaskPriority } from '../../domain/types';
import { COMMANDS } from '../../shared/constants';
import { MainPanel } from '../webview/panels/MainPanel';
import { isTaskTreeItem, TaskTreeItem } from '../treeview/TreeItems';
import type { TaskTreeProvider } from '../treeview/TaskTreeProvider';
import { resolveTaskId, runCommand } from './commandHelpers';

/**
 * Registers task lifecycle and action commands.
 */
export function registerTaskCommands(
  context: vscode.ExtensionContext,
  treeProvider: TaskTreeProvider,
): void {
  context.subscriptions.push(
    vscode.commands.registerCommand(
      COMMANDS.START_TASK,
      (item?: TaskTreeItem) =>
        runCommand(treeProvider, () => startTask(item)),
    ),
    vscode.commands.registerCommand(
      COMMANDS.READY_FOR_TEST,
      (item?: TaskTreeItem) =>
        runCommand(treeProvider, () => readyForTest(item)),
    ),
    vscode.commands.registerCommand(
      COMMANDS.APPROVE_TASK,
      (item?: TaskTreeItem) =>
        runCommand(treeProvider, () => approveTask(item)),
    ),
    vscode.commands.registerCommand(
      COMMANDS.SEND_TO_AI,
      (item?: TaskTreeItem) =>
        runCommand(treeProvider, () => sendToAI(context, item)),
    ),
    vscode.commands.registerCommand(COMMANDS.EDIT_TASK, (item?: TaskTreeItem) =>
      runCommand(treeProvider, () => editTask(item)),
    ),
    vscode.commands.registerCommand(
      COMMANDS.DELETE_TASK,
      (item?: TaskTreeItem) =>
        runCommand(treeProvider, () => deleteTask(item)),
    ),
  );
}

async function startTask(item?: TaskTreeItem): Promise<void> {
  const taskId = await getTaskId(item);
  if (!taskId) {
    return;
  }

  const task = getContainer().taskService.startTask(taskId);
  void vscode.window.showInformationMessage(`Task started: ${task.title}`);
}

async function readyForTest(item?: TaskTreeItem): Promise<void> {
  const taskId = await getTaskId(item);
  if (!taskId) {
    return;
  }

  const task = getContainer().taskService.readyForTest(taskId);
  void vscode.window.showInformationMessage(`Ready for test: ${task.title}`);
}

async function approveTask(item?: TaskTreeItem): Promise<void> {
  const taskId = await getTaskId(item);
  if (!taskId) {
    return;
  }

  const task = getContainer().taskService.approveTask(taskId);
  void vscode.window.showInformationMessage(`Task approved: ${task.title}`);
}

async function sendToAI(
  context: vscode.ExtensionContext,
  item?: TaskTreeItem,
): Promise<void> {
  const taskId = await getTaskId(item);
  if (!taskId) {
    return;
  }

  const container = getContainer();
  const task = container.taskService.findById(taskId);
  if (!task) {
    return;
  }

  const project = container.projectService.findById(task.projectId);
  if (!project) {
    return;
  }

  const response = await dispatchTaskToAi(container, task, project);
  if (!response.success) {
    void vscode.window.showErrorMessage(
      response.error ?? 'Failed to send task to AI',
    );
    return;
  }

  if (response.relativePath) {
    const hostLabel = response.providerName ?? 'AI chat';
    const attachHint = response.attachedToChat
      ? `attached in ${hostLabel}`
      : `ready for ${hostLabel}`;
    void vscode.window
      .showInformationMessage(
        `Task context ${attachHint}: @${response.relativePath}`,
        'Open Board',
        'Open File',
      )
      .then(async (choice) => {
        if (choice === 'Open Board') {
          MainPanel.createOrShow(context, { taskId: task.id });
          return;
        }

        if (choice === 'Open File' && response.contextFilePath) {
          const document = await vscode.workspace.openTextDocument(
            vscode.Uri.file(response.contextFilePath),
          );
          await vscode.window.showTextDocument(document, { preview: false });
        }
      });
    return;
  }

  void vscode.window.showInformationMessage(
    'AI prompt copied to clipboard',
    'Open Board',
  ).then((choice) => {
    if (choice === 'Open Board') {
      MainPanel.createOrShow(context, { taskId: task.id });
    }
  });
}

async function editTask(item?: TaskTreeItem): Promise<void> {
  const taskId = await getTaskId(item);
  if (!taskId) {
    return;
  }

  const container = getContainer();
  const task = container.taskService.findById(taskId);
  if (!task) {
    return;
  }

  const title = await vscode.window.showInputBox({
    title: 'Edit Task',
    value: task.title,
    ignoreFocusOut: true,
    validateInput: (value) => (value.trim() ? undefined : 'Title is required'),
  });

  if (!title?.trim()) {
    return;
  }

  const description = await vscode.window.showInputBox({
    title: 'Edit Task',
    prompt: 'Description',
    value: task.description,
    ignoreFocusOut: true,
  });

  const priority = await vscode.window.showQuickPick(
    [
      { label: 'Low', value: 'low' as TaskPriority },
      { label: 'Medium', value: 'medium' as TaskPriority },
      { label: 'High', value: 'high' as TaskPriority },
      { label: 'Critical', value: 'critical' as TaskPriority },
    ],
    {
      title: 'Edit Task',
      placeHolder: 'Priority',
    },
  );

  container.taskService.update(taskId, {
    title: title.trim(),
    description: description?.trim() ?? '',
    priority: priority?.value ?? task.priority,
  });

  void vscode.window.showInformationMessage(`Task updated: ${title.trim()}`);
}

async function deleteTask(item?: TaskTreeItem): Promise<void> {
  const taskId = await getTaskId(item);
  if (!taskId) {
    return;
  }

  const container = getContainer();
  const task = container.taskService.findById(taskId);
  if (!task) {
    return;
  }

  const confirm = await vscode.window.showWarningMessage(
    `Delete task "${task.title}"?`,
    { modal: true },
    'Delete',
  );

  if (confirm !== 'Delete') {
    return;
  }

  container.taskService.delete(taskId);
  void vscode.window.showInformationMessage(`Task deleted: ${task.title}`);
}

async function getTaskId(item?: TaskTreeItem): Promise<string | undefined> {
  if (isTaskTreeItem(item)) {
    return item.task.id;
  }

  return resolveTaskId();
}
