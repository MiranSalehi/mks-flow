import * as vscode from 'vscode';
import { getLinearContext } from '../../application/linearContextHolder';
import { LinearApiError } from '../../infrastructure/linear/LinearApiError';
import { MainPanel } from '../webview/panels/MainPanel';
import type { TaskTreeProvider } from '../treeview/TaskTreeProvider';
import { refreshLinearSyncStatusBar } from '../statusbar/LinearSyncStatusBar';
import { runCommand } from './commandHelpers';

/**
 * Registers Linear integration commands.
 */
export function registerLinearCommands(
  context: vscode.ExtensionContext,
  treeProvider: TaskTreeProvider,
): void {
  context.subscriptions.push(
    vscode.commands.registerCommand('mksflow.connectLinear', () =>
      runCommand(treeProvider, async () => {
        MainPanel.createOrShow(context);
        MainPanel.currentPanel?.postMessage({
          type: 'OPEN_LINEAR_SETUP',
        });
      }),
    ),
    vscode.commands.registerCommand('mksflow.syncLinear', () =>
      runCommand(treeProvider, async () => {
        const linear = getLinearContext();
        if (!linear) {
          throw new Error('Linear integration is not available');
        }

        const linked = linear.config.getLinkedProjectIds();
        let pulled = 0;
        let pushed = 0;
        let conflicts = 0;
        const errors: string[] = [];

        for (const projectId of linked) {
          const result = await linear.sync.syncProject(projectId);
          pulled += result.pulled;
          pushed += result.pushed;
          conflicts += result.conflicts;
          errors.push(...result.errors);
        }

        MainPanel.currentPanel?.refresh();
        refreshLinearSyncStatusBar();

        if (errors.length > 0) {
          throw new LinearApiError(errors.join('; '));
        }

        vscode.window.showInformationMessage(
          linked.length === 0
            ? 'No projects linked to Linear'
            : `Linear sync: ${pulled} pulled, ${pushed} pushed${
                conflicts > 0 ? `, ${conflicts} conflicts` : ''
              }`,
        );
      }),
    ),
    vscode.commands.registerCommand('mksflow.disconnectLinear', () =>
      runCommand(treeProvider, async () => {
        const linear = getLinearContext();
        if (!linear) {
          return;
        }

        const confirm = await vscode.window.showWarningMessage(
          'Disconnect Linear and remove synced issues from linked projects?',
          { modal: true },
          'Disconnect',
        );
        if (confirm !== 'Disconnect') {
          return;
        }

        for (const projectId of linear.config.getLinkedProjectIds()) {
          await linear.sync.unlinkProject(projectId);
        }
        await linear.auth.disconnect();
        MainPanel.currentPanel?.refresh();
        vscode.window.showInformationMessage('Linear disconnected');
      }),
    ),
  );
}

export function formatLinearError(error: unknown): string {
  if (error instanceof LinearApiError) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'Linear operation failed';
}
