import type * as vscode from 'vscode';
import { registerProjectCommands } from './projectCommands';
import { registerQuickCaptureCommand } from './quickCaptureCommand';
import { registerTaskCommands } from './taskCommands';
import type { TaskTreeProvider } from '../treeview/TaskTreeProvider';

/**
 * Registers all MKSFlow command handlers.
 */
export function registerCommands(
  context: vscode.ExtensionContext,
  treeProvider: TaskTreeProvider,
): void {
  registerQuickCaptureCommand(context, treeProvider);
  registerProjectCommands(context, treeProvider);
  registerTaskCommands(context, treeProvider);
}
