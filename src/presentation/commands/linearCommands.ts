import * as vscode from 'vscode';
import { getLinearContext } from '../../application/linearContextHolder';
import { LinearApiError } from '../../infrastructure/linear/LinearApiError';
import { MainPanel } from '../webview/panels/MainPanel';
import type { TaskTreeProvider } from '../treeview/TaskTreeProvider';
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

        await linear.sync.syncAllLinked();
        MainPanel.currentPanel?.refresh();
        vscode.window.showInformationMessage('Linear sync complete');
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
