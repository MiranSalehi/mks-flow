import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { v4 as uuidv4 } from 'uuid';
import type { Task } from '../../domain/models/Task';
import type { TaskDescriptionImage } from '../../domain/models/TaskDescriptionImage';
import type { ITaskRepository } from '../../domain/interfaces/ITaskRepository';
import { RepositoryError } from '../../infrastructure/repositories/RepositoryError';

const ATTACHMENTS_DIR = path.join('.mksflow', 'attachments');
const GITIGNORE_ENTRY = '.mksflow/';
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

const MIME_EXTENSION: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/gif': 'gif',
  'image/webp': 'webp',
};

/**
 * Saves task description images under `.mksflow/attachments/{taskId}/` in the workspace.
 */
export class TaskImageService {
  constructor(private readonly taskRepository: ITaskRepository) {}

  /** Attaches an image from base64 payload (paste from webview or clipboard). */
  async attachFromBase64(
    taskId: string,
    fileName: string,
    mimeType: string,
    dataBase64: string,
  ): Promise<Task> {
    const buffer = Buffer.from(dataBase64, 'base64');
    return this.attachBuffer(taskId, fileName, mimeType, buffer);
  }

  /**
   * Reads an image from the OS clipboard via Electron (extension host).
   * Webviews cannot access image clipboard reliably; this is the desktop fallback.
   */
  async attachFromSystemClipboard(taskId: string): Promise<Task | null> {
    const electronClipboard = getElectronClipboard();
    if (!electronClipboard) {
      void vscode.window.showWarningMessage(
        'Image clipboard is not available in this environment.',
      );
      return null;
    }

    const image = electronClipboard.readImage();
    if (image.isEmpty()) {
      void vscode.window.showWarningMessage(
        'No image on clipboard. Copy a screenshot first.',
      );
      return null;
    }

    const buffer = Buffer.from(image.toPNG());
    return this.attachBuffer(taskId, 'pasted-image.png', 'image/png', buffer);
  }

  /** Opens a file picker and attaches selected images. */
  async attachFromPicker(taskId: string): Promise<Task | null> {
    const workspaceFolder = this.requireWorkspaceFolder();
    const picks = await vscode.window.showOpenDialog({
      canSelectMany: true,
      openLabel: 'Attach to task',
      filters: { Images: ['png', 'jpg', 'jpeg', 'gif', 'webp'] },
    });

    if (!picks?.length) {
      return null;
    }

    let task = this.requireTask(taskId);
    for (const uri of picks) {
      const buffer = fs.readFileSync(uri.fsPath);
      const mimeType = guessMimeType(uri.fsPath);
      task = await this.attachBuffer(
        taskId,
        path.basename(uri.fsPath),
        mimeType,
        buffer,
        workspaceFolder.uri.fsPath,
        task.descriptionImages,
      );
    }

    return task;
  }

  /** Removes one attached image and updates the task record. */
  removeImage(taskId: string, imageId: string): Task {
    const task = this.requireTask(taskId);
    const target = task.descriptionImages.find((image) => image.id === imageId);
    if (!target) {
      return task;
    }

    const workspaceRoot = this.requireWorkspaceFolder().uri.fsPath;
    const absolutePath = path.join(workspaceRoot, target.relativePath);
    if (fs.existsSync(absolutePath)) {
      fs.unlinkSync(absolutePath);
    }

    const descriptionImages = task.descriptionImages.filter(
      (image) => image.id !== imageId,
    );

    return this.taskRepository.update(taskId, { descriptionImages });
  }

  /** Deletes all attachment files for a task (call before task delete). */
  deleteAllForTask(taskId: string): void {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
      return;
    }

    const taskDir = path.join(
      workspaceFolder.uri.fsPath,
      ATTACHMENTS_DIR,
      taskId,
    );
    if (fs.existsSync(taskDir)) {
      fs.rmSync(taskDir, { recursive: true, force: true });
    }
  }

  private async attachBuffer(
    taskId: string,
    fileName: string,
    mimeType: string,
    buffer: Buffer,
    workspaceRoot?: string,
    existingImages?: TaskDescriptionImage[],
  ): Promise<Task> {
    if (buffer.length > MAX_IMAGE_BYTES) {
      throw new RepositoryError(
        'Image is too large (max 4 MB).',
        'VALIDATION',
      );
    }

    const normalizedMime = normalizeMimeType(mimeType);
    const extension = MIME_EXTENSION[normalizedMime];
    if (!extension) {
      throw new RepositoryError(
        `Unsupported image type: ${mimeType}`,
        'VALIDATION',
      );
    }

    const root =
      workspaceRoot ?? this.requireWorkspaceFolder().uri.fsPath;
    const task = this.requireTask(taskId);
    const images = existingImages ?? task.descriptionImages;

    const id = uuidv4();
    const safeBaseName = sanitizeFileName(fileName).replace(/\.[^.]+$/, '');
    const storedName = `${safeBaseName || 'image'}-${id.slice(0, 8)}.${extension}`;
    const taskDir = path.join(root, ATTACHMENTS_DIR, taskId);
    fs.mkdirSync(taskDir, { recursive: true });

    const absolutePath = path.join(taskDir, storedName);
    fs.writeFileSync(absolutePath, buffer);

    await this.ensureGitignoreEntry(root);

    const relativePath = path.posix.join(
      ATTACHMENTS_DIR.replace(/\\/g, '/'),
      taskId,
      storedName,
    );

    const descriptionImages: TaskDescriptionImage[] = [
      ...images,
      {
        id,
        fileName: storedName,
        mimeType: normalizedMime,
        relativePath,
      },
    ];

    return this.taskRepository.update(taskId, { descriptionImages });
  }

  private requireTask(taskId: string): Task {
    const task = this.taskRepository.findById(taskId);
    if (!task) {
      throw new RepositoryError(`Task not found: ${taskId}`, 'NOT_FOUND');
    }
    return task;
  }

  private requireWorkspaceFolder(): vscode.WorkspaceFolder {
    const folder = vscode.workspace.workspaceFolders?.[0];
    if (!folder) {
      throw new RepositoryError(
        'Open a workspace folder before attaching images.',
        'VALIDATION',
      );
    }
    return folder;
  }

  private async ensureGitignoreEntry(workspaceRoot: string): Promise<void> {
    const gitignorePath = path.join(workspaceRoot, '.gitignore');
    if (!fs.existsSync(gitignorePath)) {
      return;
    }

    const contents = fs.readFileSync(gitignorePath, 'utf8');
    if (contents.split('\n').some((line) => line.trim() === GITIGNORE_ENTRY)) {
      return;
    }

    const suffix = contents.endsWith('\n') ? '' : '\n';
    fs.appendFileSync(gitignorePath, `${suffix}${GITIGNORE_ENTRY}\n`, 'utf8');
  }
}

function normalizeMimeType(mimeType: string): string {
  const value = mimeType.trim().toLowerCase();
  return value === 'image/jpg' ? 'image/jpeg' : value;
}

function guessMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.png':
      return 'image/png';
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.gif':
      return 'image/gif';
    case '.webp':
      return 'image/webp';
    default:
      return 'image/png';
  }
}

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]+/g, '-').slice(0, 80);
}

type ElectronClipboard = {
  readImage(): { isEmpty(): boolean; toPNG(): Uint8Array };
};

function getElectronClipboard(): ElectronClipboard | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const electron = require('electron') as { clipboard?: ElectronClipboard };
    return electron.clipboard ?? null;
  } catch {
    return null;
  }
}
