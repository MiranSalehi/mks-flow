import * as vscode from 'vscode';
import { CHAT_INSTRUCTION } from './types';

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function getAvailableCommands(): Promise<readonly string[]> {
  return vscode.commands.getCommands(true);
}

export async function runIfAvailable(
  commands: readonly string[],
  command: string,
  ...args: unknown[]
): Promise<boolean> {
  if (!commands.includes(command)) {
    return false;
  }

  try {
    await vscode.commands.executeCommand(command, ...args);
    return true;
  } catch {
    return false;
  }
}

export function resolveWorkspaceUri(
  relativePath: string,
  absolutePath: string,
): vscode.Uri {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (workspaceFolder) {
    return vscode.Uri.joinPath(
      workspaceFolder.uri,
      ...relativePath.split('/').filter(Boolean),
    );
  }

  return vscode.Uri.file(absolutePath);
}

export function buildChatPrompt(relativePath: string): string {
  return `${CHAT_INSTRUCTION}\n\n@${relativePath}`;
}
