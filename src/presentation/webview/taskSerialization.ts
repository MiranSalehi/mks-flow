import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import type { Task } from '../../domain/models/Task';
import type { SerializedTask } from '../../shared/messages';
import { serializeTask } from '../../shared/messages';

/** Serializes a task with webview URIs for description image previews. */
export function serializeTaskForWebview(
  task: Task,
  webview: vscode.Webview,
): SerializedTask {
  const base = serializeTask(task);
  const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;

  const descriptionImages = task.descriptionImages.map((image) => {
    const absolutePath = workspaceRoot
      ? path.join(workspaceRoot, image.relativePath)
      : '';
    const uri =
      absolutePath && fs.existsSync(absolutePath)
        ? webview.asWebviewUri(vscode.Uri.file(absolutePath)).toString()
        : '';

    return {
      id: image.id,
      fileName: image.fileName,
      mimeType: image.mimeType,
      relativePath: image.relativePath,
      uri,
    };
  });

  return { ...base, descriptionImages };
}
