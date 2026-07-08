import type { Project } from '../../domain/models/Project';
import type { Task } from '../../domain/models/Task';
import type { TaskLog } from '../../domain/models/TaskLog';
import type { TaskPriority, TaskStatus } from '../../domain/types';
import type {
  SerializedProject,
  SerializedTask,
  SerializedTaskLog,
} from '../../shared/messages';
import type { CloudUser } from '../../shared/messages';
import type { ApiProject, ApiTask, ApiTaskAttachment, ApiTaskLog, ApiUser } from './CloudApiTypes';
import {
  parseCloudAttachmentRefs,
  stripCloudAttachmentMarkdown,
} from './cloudAttachmentUtils';

/** Maps API user to webview cloud user shape. */
export function mapApiUser(user: ApiUser): CloudUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    avatarUrl: user.avatar_url,
  };
}

const DEFAULT_PROJECT_COLOR = '#007ACC';

function asTaskStatus(value: string): TaskStatus {
  return value as TaskStatus;
}

function asTaskPriority(value: string): TaskPriority {
  return value as TaskPriority;
}

/** Maps a cloud project resource to the webview project shape. */
export function mapApiProject(api: ApiProject): SerializedProject {
  return {
    id: api.id,
    name: api.name,
    description: api.description ?? '',
    mode: api.mode === 'team' ? 'team' : 'personal',
    color: api.color ?? DEFAULT_PROJECT_COLOR,
    createdAt: api.created_at,
    updatedAt: api.updated_at,
  };
}

/** Maps a cloud task resource to the webview task shape. */
export function mapApiTask(
  api: ApiTask,
  teamId: string | null,
  canApproveTestToDone = false,
): SerializedTask {
  return {
    id: api.id,
    projectId: api.project_id,
    title: api.title,
    description: api.description ?? '',
    descriptionImages: mapApiTaskImages(api),
    status: asTaskStatus(api.status),
    priority: asTaskPriority(api.priority),
    tags: api.tags ?? [],
    relatedFiles: api.related_files ?? [],
    acceptanceCriteria: api.acceptance_criteria ?? [],
    timeTracked: api.time_tracked ?? 0,
    timerStartedAt: api.timer_started_at,
    externalId: api.external_id,
    externalProvider: api.external_source,
    externalUrl: null,
    sortOrder: api.sort_order ?? 0,
    createdAt: api.created_at,
    updatedAt: api.updated_at,
    source: 'cloud',
    assignedTo: api.assigned_to,
    createdBy: api.created_by,
    teamId,
    pullRequestUrl: api.pull_request_url ?? null,
    agentWorkflowStatus: api.agent_workflow_status ?? null,
    currentIteration: api.current_iteration ?? null,
    acceptedIteration: api.accepted_iteration ?? null,
    canApproveTestToDone,
  };
}

function mapApiTaskImages(api: ApiTask): SerializedTask['descriptionImages'] {
  const attachments = normalizeApiAttachments(api.attachments);
  const mediaAttachments = attachments.filter(
    (attachment) =>
      attachment.mime_type.startsWith('image/') ||
      attachment.mime_type.startsWith('video/'),
  );

  if (mediaAttachments.length > 0) {
    return mediaAttachments.map((attachment) => ({
      id: attachment.id,
      fileName: attachment.original_name,
      mimeType: attachment.mime_type,
      relativePath: `cloud/${api.id}/${attachment.id}`,
      uri: '',
    }));
  }

  return parseCloudAttachmentRefs(api.description ?? '').map((ref) => ({
    id: ref.id,
    fileName: ref.fileName,
    mimeType: ref.kind === 'video' ? 'video/mp4' : 'image/png',
    relativePath: `cloud/${api.id}/${ref.id}`,
    uri: '',
  }));
}

/** Strips attachment markdown for webview display while keeping cache intact. */
export function stripCloudTaskDescription(description: string): string {
  return stripCloudAttachmentMarkdown(description);
}

/** @deprecated Use {@link parseCloudAttachmentRefs} */
export function extractImageAttachmentIds(description: string): string[] {
  return parseCloudAttachmentRefs(description)
    .filter((ref) => ref.kind === 'image')
    .map((ref) => ref.id);
}

function normalizeApiAttachments(
  raw: ApiTask['attachments'],
): ApiTaskAttachment[] {
  if (!raw) {
    return [];
  }

  if (Array.isArray(raw)) {
    return raw;
  }

  if (
    typeof raw === 'object' &&
    'data' in raw &&
    Array.isArray((raw as { data: unknown }).data)
  ) {
    return (raw as { data: ApiTaskAttachment[] }).data;
  }

  return [];
}

/** Maps cloud task logs for a given task id. */
export function mapApiTaskLog(taskId: string, api: ApiTaskLog): SerializedTaskLog {
  const toStatus = (api.to_status ?? api.from_status ?? 'todo') as TaskStatus;
  const fromStatus = api.from_status
    ? (api.from_status as TaskStatus)
    : null;
  const metadataMessage =
    api.metadata && typeof api.metadata.message === 'string'
      ? api.metadata.message
      : '';
  const message =
    metadataMessage ||
    (api.action ? api.action.replace(/_/g, ' ') : 'Status updated');

  return {
    id: api.id,
    taskId,
    fromStatus,
    toStatus,
    message,
    createdAt: api.created_at,
  };
}

/** Converts a serialized cloud task into a domain Task for AI prompt generation. */
export function serializedTaskToDomain(task: SerializedTask): Task {
  return {
    id: task.id,
    projectId: task.projectId,
    title: task.title,
    description: stripCloudAttachmentMarkdown(task.description),
    descriptionImages: task.descriptionImages.map((image) => ({
      id: image.id,
      fileName: image.fileName,
      mimeType: image.mimeType,
      relativePath: image.relativePath,
    })),
    status: task.status,
    priority: task.priority,
    tags: task.tags,
    relatedFiles: task.relatedFiles,
    acceptanceCriteria: task.acceptanceCriteria,
    timeTracked: task.timeTracked,
    timerStartedAt: task.timerStartedAt
      ? new Date(task.timerStartedAt)
      : null,
    externalId: task.externalId,
    externalProvider: task.externalProvider,
    externalUrl: task.externalUrl,
    sortOrder: task.sortOrder,
    createdAt: new Date(task.createdAt),
    updatedAt: new Date(task.updatedAt),
  };
}

/** Converts a serialized cloud project into a domain Project. */
export function serializedProjectToDomain(project: SerializedProject): Project {
  return {
    id: project.id,
    name: project.name,
    description: project.description,
    mode: project.mode,
    color: project.color,
    createdAt: new Date(project.createdAt),
    updatedAt: new Date(project.updatedAt),
  };
}

/** Maps a domain task log (unused for cloud pull; symmetry helper). */
export function domainTaskLogToSerialized(log: TaskLog): SerializedTaskLog {
  return {
    id: log.id,
    taskId: log.taskId,
    fromStatus: log.fromStatus,
    toStatus: log.toStatus,
    message: log.message,
    createdAt: log.createdAt.toISOString(),
  };
}
