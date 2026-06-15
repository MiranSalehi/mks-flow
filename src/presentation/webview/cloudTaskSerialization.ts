import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import type { CloudAuthService } from '../../application/services/CloudAuthService';
import type { CloudApiClient } from '../../infrastructure/cloud/CloudApiClient';
import { stripCloudAttachmentMarkdown } from '../../infrastructure/cloud/cloudAttachmentUtils';
import type { SerializedTask } from '../../shared/messages';

const CACHE_DIR_NAME = 'cloud-attachments';
const MAX_DATA_URI_BYTES = 4 * 1024 * 1024;

/** Caches cloud media locally and adds webview URIs for task attachments. */
export async function serializeCloudTasksForWebview(
  tasks: SerializedTask[],
  webview: vscode.Webview,
  api: CloudApiClient,
  auth: CloudAuthService,
  storageUri: vscode.Uri,
): Promise<SerializedTask[]> {
  await auth.loadStoredToken();

  return Promise.all(
    tasks.map((task) =>
      serializeCloudTaskForWebview(task, webview, api, storageUri),
    ),
  );
}

/** Resolves one cloud attachment to a webview-safe URI. */
export async function resolveCloudAttachmentUri(
  taskId: string,
  attachmentId: string,
  mimeType: string,
  webview: vscode.Webview,
  api: CloudApiClient,
  auth: CloudAuthService,
  storageUri: vscode.Uri,
): Promise<string> {
  await auth.loadStoredToken();

  const { buffer, mimeType: resolvedMime, fileName } = await api.fetchAttachment(
    taskId,
    attachmentId,
  );

  return bufferToWebviewUri(
    taskId,
    attachmentId,
    fileName,
    resolvedMime || mimeType,
    buffer,
    webview,
    storageUri,
  );
}

async function serializeCloudTaskForWebview(
  task: SerializedTask,
  webview: vscode.Webview,
  api: CloudApiClient,
  storageUri: vscode.Uri,
): Promise<SerializedTask> {
  const description = stripCloudAttachmentMarkdown(task.description);

  if (task.source !== 'cloud' || task.descriptionImages.length === 0) {
    return { ...task, description };
  }

  const descriptionImages = await Promise.all(
    task.descriptionImages.map((image) =>
      resolveCloudImageUri(task.id, image, webview, api, storageUri),
    ),
  );

  return { ...task, description, descriptionImages };
}

async function resolveCloudImageUri(
  taskId: string,
  image: SerializedTask['descriptionImages'][number],
  webview: vscode.Webview,
  api: CloudApiClient,
  storageUri: vscode.Uri,
): Promise<SerializedTask['descriptionImages'][number]> {
  if (image.uri) {
    return image;
  }

  try {
    const { buffer, mimeType, fileName } = await api.fetchAttachment(
      taskId,
      image.id,
    );
    const uri = bufferToWebviewUri(
      taskId,
      image.id,
      fileName || image.fileName,
      mimeType || image.mimeType,
      buffer,
      webview,
      storageUri,
    );

    return {
      ...image,
      fileName: fileName || image.fileName,
      mimeType: mimeType || image.mimeType,
      uri,
    };
  } catch (error) {
    console.warn(
      `[MKSFlow] Failed to load cloud attachment ${image.id}:`,
      error,
    );
    return image;
  }
}

function bufferToWebviewUri(
  taskId: string,
  attachmentId: string,
  fileName: string,
  mimeType: string,
  buffer: Buffer,
  webview: vscode.Webview,
  storageUri: vscode.Uri,
): string {
  if (mimeType.startsWith('image/') && buffer.length <= MAX_DATA_URI_BYTES) {
    return `data:${mimeType};base64,${buffer.toString('base64')}`;
  }

  const extension = extensionForMime(mimeType, fileName);
  const cacheRoot = path.join(
    storageUri.fsPath,
    CACHE_DIR_NAME,
    taskId,
    attachmentId,
  );
  const cachedPath = path.join(cacheRoot, `file.${extension}`);

  if (!fs.existsSync(cachedPath)) {
    fs.mkdirSync(cacheRoot, { recursive: true });
    fs.writeFileSync(cachedPath, buffer);
  }

  return webview.asWebviewUri(vscode.Uri.file(cachedPath)).toString();
}

/** Removes a cached cloud attachment directory from global storage. */
export function clearCloudAttachmentCache(
  storageUri: vscode.Uri,
  taskId: string,
  attachmentId: string,
): void {
  const cacheRoot = path.join(
    storageUri.fsPath,
    CACHE_DIR_NAME,
    taskId,
    attachmentId,
  );

  if (fs.existsSync(cacheRoot)) {
    fs.rmSync(cacheRoot, { recursive: true, force: true });
  }
}

function extensionForMime(mimeType: string, fileName: string): string {
  const fromName = path.extname(fileName).replace(/^\./, '');
  if (fromName) {
    return fromName;
  }

  switch (mimeType) {
    case 'image/jpeg':
    case 'image/jpg':
      return 'jpg';
    case 'image/gif':
      return 'gif';
    case 'image/webp':
      return 'webp';
    case 'video/mp4':
      return 'mp4';
    case 'video/webm':
      return 'webm';
    case 'video/quicktime':
      return 'mov';
    default:
      return mimeType.startsWith('video/') ? 'mp4' : 'png';
  }
}
