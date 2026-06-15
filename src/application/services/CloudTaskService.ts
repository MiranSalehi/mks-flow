import type { TaskStatus } from '../../domain/types';
import type { CloudApiClient } from '../../infrastructure/cloud/CloudApiClient';
import { CloudApiError } from '../../infrastructure/cloud/CloudApiError';
import {
  extractCloudAttachmentMarkdown,
  mergeCloudDescription,
} from '../../infrastructure/cloud/cloudAttachmentUtils';
import type { UpdateTaskDto } from '../../domain/models/Task';
import type { SerializedTask } from '../../shared/messages';
import type { CloudSyncService } from './CloudSyncService';

/**
 * Mutates cloud tasks via the REST API and refreshes local cache.
 */
export class CloudTaskService {
  constructor(
    private readonly api: CloudApiClient,
    private readonly sync: CloudSyncService,
  ) {}

  /** Returns a cached cloud task by id. */
  findById(taskId: string): SerializedTask | undefined {
    return this.sync.getCache().tasks.find((task) => task.id === taskId);
  }

  /** Updates editable task fields on the server. */
  async update(taskId: string, data: UpdateTaskDto): Promise<void> {
    const body: Record<string, unknown> = {};
    if (data.title !== undefined) {
      body.title = data.title;
    }
    if (data.description !== undefined) {
      const existing = this.findById(taskId);
      const preserved = existing
        ? extractCloudAttachmentMarkdown(existing.description)
        : '';
      body.description = mergeCloudDescription(preserved, data.description);
    }
    if (data.priority !== undefined) {
      body.priority = data.priority;
    }
    if (data.tags !== undefined) {
      body.tags = data.tags;
    }
    if (data.relatedFiles !== undefined) {
      body.related_files = data.relatedFiles;
    }
    if (data.acceptanceCriteria !== undefined) {
      body.acceptance_criteria = data.acceptanceCriteria;
    }

    await this.api.updateTask(taskId, body);
    await this.sync.syncNow();
  }

  /** Moves a task to a new status, optionally reordering within the column. */
  async moveToStatus(
    taskId: string,
    toStatus: TaskStatus,
    insertAt?: number,
  ): Promise<void> {
    const task = this.findById(taskId);
    if (!task) {
      throw new Error(`Cloud task not found: ${taskId}`);
    }

    if (task.status === 'done') {
      throw new Error('Done tasks cannot be moved');
    }

    if (task.status !== toStatus) {
      await this.api.changeTaskStatus(taskId, toStatus);
      await this.sync.syncNow();
    }

    if (insertAt !== undefined) {
      const currentTask = this.findById(taskId) ?? { ...task, status: toStatus };
      const columnTasks = this.sync
        .getCache()
        .tasks.filter(
          (item) =>
            item.projectId === currentTask.projectId && item.status === toStatus,
        )
        .sort((a, b) => a.sortOrder - b.sortOrder);

      const orderedIds = columnTasks
        .map((item) => item.id)
        .filter((id) => id !== taskId);
      const index = Math.max(0, Math.min(insertAt, orderedIds.length));
      orderedIds.splice(index, 0, taskId);

      await this.api.reorderTasks(taskId, toStatus, index, orderedIds);
    }

    await this.sync.syncNow();
  }

  async startTask(taskId: string): Promise<void> {
    await this.moveToStatus(taskId, 'doing');
  }

  async readyForTest(taskId: string): Promise<void> {
    await this.moveToStatus(taskId, 'test');
  }

  async approveTask(taskId: string): Promise<void> {
    await this.moveToStatus(taskId, 'done');
  }

  /** Reorders tasks within a single status column. */
  async reorderTasks(
    _projectId: string,
    status: TaskStatus,
    taskIds: string[],
  ): Promise<void> {
    if (taskIds.length === 0) {
      return;
    }

    const anchorId = taskIds[0];
    await this.api.reorderTasks(anchorId, status, 0, taskIds);
    await this.sync.syncNow();
  }

  /** Fetches task logs from the API. */
  async fetchLogs(taskId: string) {
    return this.api.getTaskLogs(taskId);
  }

  /** Uploads an image or video to a cloud task (syncs to the site). */
  async attachMedia(
    taskId: string,
    fileName: string,
    mimeType: string,
    buffer: Buffer,
  ): Promise<void> {
    await this.api.uploadAttachment(taskId, fileName, mimeType, buffer);
    await this.sync.syncNow();
  }

  /** Removes an attachment from a cloud task. */
  async removeAttachment(taskId: string, attachmentId: string): Promise<void> {
    await this.api.deleteAttachment(taskId, attachmentId);
    await this.sync.syncNow();
  }

  /** Handles API errors that require re-authentication. */
  async handleMutationError(error: unknown): Promise<void> {
    if (error instanceof CloudApiError && error.isUnauthorized()) {
      await this.sync.handleUnauthorized();
    }
    throw error;
  }
}
