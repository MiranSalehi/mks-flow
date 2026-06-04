import * as fs from 'fs';
import * as vscode from 'vscode';

/**
 * Formats a workspace URI as a relative path for task related-files storage.
 * Directories are suffixed with `/` so they can be distinguished from files.
 */
export function formatRelatedWorkspacePath(uri: vscode.Uri): string {
  const relative = vscode.workspace.asRelativePath(uri, false);
  if (!relative) {
    return uri.fsPath;
  }

  try {
    if (fs.statSync(uri.fsPath).isDirectory() && !relative.endsWith('/')) {
      return `${relative}/`;
    }
  } catch {
    // Fall back to the relative path when stat fails.
  }

  return relative;
}
