import * as vscode from 'vscode';
import { getNotionContext } from '../../application/notionContextHolder';
import { MainPanel } from '../webview/panels/MainPanel';
import type { TaskTreeProvider } from '../treeview/TaskTreeProvider';
import { runCommand } from './commandHelpers';

/** Registers Notion integration commands. */
export function registerNotionCommands(
  context: vscode.ExtensionContext,
  treeProvider: TaskTreeProvider,
): void {
  context.subscriptions.push(
    vscode.commands.registerCommand('mksflow.connectNotion', () =>
      runCommand(treeProvider, async () => {
        MainPanel.createOrShow(context);
        MainPanel.currentPanel?.postMessage({ type: 'OPEN_NOTION_SETUP' });
      }),
    ),
    vscode.commands.registerCommand('mksflow.syncNotion', () =>
      runCommand(treeProvider, async () => {
        const notion = getNotionContext();
        if (!notion) {
          throw new Error('Notion integration is not available');
        }
        await notion.sync.syncAllLinked();
        MainPanel.currentPanel?.refresh();
        vscode.window.showInformationMessage('Notion sync complete');
      }),
    ),
    vscode.commands.registerCommand('mksflow.disconnectNotion', () =>
      runCommand(treeProvider, async () => {
        const notion = getNotionContext();
        if (!notion) {
          return;
        }
        const confirm = await vscode.window.showWarningMessage(
          'Disconnect Notion and remove synced items from linked projects?',
          { modal: true },
          'Disconnect',
        );
        if (confirm !== 'Disconnect') {
          return;
        }
        for (const projectId of notion.config.getLinkedProjectIds()) {
          await notion.sync.unlinkProject(projectId);
        }
        await notion.auth.disconnect();
        MainPanel.currentPanel?.refresh();
        vscode.window.showInformationMessage('Notion disconnected');
      }),
    ),
  );
}
