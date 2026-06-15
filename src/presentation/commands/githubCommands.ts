import * as vscode from 'vscode';
import { getGitHubContext } from '../../application/githubContextHolder';
import { MainPanel } from '../webview/panels/MainPanel';
import type { TaskTreeProvider } from '../treeview/TaskTreeProvider';
import { runCommand } from './commandHelpers';

/** Registers GitHub integration commands. */
export function registerGitHubCommands(
  context: vscode.ExtensionContext,
  treeProvider: TaskTreeProvider,
): void {
  context.subscriptions.push(
    vscode.commands.registerCommand('mksflow.connectGitHub', () =>
      runCommand(treeProvider, async () => {
        MainPanel.createOrShow(context);
        MainPanel.currentPanel?.postMessage({ type: 'OPEN_GITHUB_SETUP' });
      }),
    ),
    vscode.commands.registerCommand('mksflow.syncGitHub', () =>
      runCommand(treeProvider, async () => {
        const github = getGitHubContext();
        if (!github) {
          throw new Error('GitHub integration is not available');
        }
        await github.sync.syncAllLinked();
        MainPanel.currentPanel?.refresh();
        vscode.window.showInformationMessage('GitHub sync complete');
      }),
    ),
    vscode.commands.registerCommand('mksflow.disconnectGitHub', () =>
      runCommand(treeProvider, async () => {
        const github = getGitHubContext();
        if (!github) {
          return;
        }
        const confirm = await vscode.window.showWarningMessage(
          'Disconnect GitHub and remove synced items from linked projects?',
          { modal: true },
          'Disconnect',
        );
        if (confirm !== 'Disconnect') {
          return;
        }
        for (const projectId of github.config.getLinkedProjectIds()) {
          await github.sync.unlinkProject(projectId);
        }
        await github.auth.disconnect();
        MainPanel.currentPanel?.refresh();
        vscode.window.showInformationMessage('GitHub disconnected');
      }),
    ),
  );
}
