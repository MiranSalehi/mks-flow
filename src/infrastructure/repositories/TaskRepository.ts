import type Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import type { ITaskRepository } from '../../domain/interfaces/ITaskRepository';
import type { TaskLog } from '../../domain/models/TaskLog';
import type {
  CreateTaskDto,
  Task,
  TaskFilters,
  UpdateTaskDto,
} from '../../domain/models/Task';
import type { TaskStatus } from '../../domain/types';
import {
  mapTaskLogRow,
  mapTaskRow,
  serializeDescriptionImages,
  serializeStringArray,
  toIsoString,
  type TaskLogRow,
  type TaskRow,
} from './mappers';
import { RepositoryError, wrapRepositoryError } from './RepositoryError';

const TASK_SELECT = `
  SELECT
    id,
    project_id,
    title,
    description,
    status,
    priority,
    tags,
    related_files,
    acceptance_criteria,
    time_tracked,
    timer_started_at,
    external_id,
    external_provider,
    external_url,
    description_images,
    sort_order,
    created_at,
    updated_at
  FROM tasks
`;

const TASK_ORDER_BY = `
  ORDER BY
    CASE status
      WHEN 'todo' THEN 0
      WHEN 'doing' THEN 1
      WHEN 'test' THEN 2
      WHEN 'done' THEN 3
      ELSE 4
    END,
    sort_order ASC,
    updated_at DESC
`;

/**
 * SQLite-backed implementation of {@link ITaskRepository}.
 */
export class TaskRepository implements ITaskRepository {
  constructor(private readonly db: Database.Database) {}

  /** @inheritdoc */
  findAll(): Task[] {
    try {
      const rows = this.db
        .prepare(`${TASK_SELECT}${TASK_ORDER_BY}`)
        .all() as TaskRow[];

      return rows.map(mapTaskRow);
    } catch (error) {
      throw wrapRepositoryError('Failed to load tasks', error);
    }
  }

  /** @inheritdoc */
  findByProjectId(projectId: string): Task[] {
    try {
      const rows = this.db
        .prepare(
          `${TASK_SELECT}
           WHERE project_id = ?
           ${TASK_ORDER_BY}`,
        )
        .all(projectId) as TaskRow[];

      return rows.map(mapTaskRow);
    } catch (error) {
      throw wrapRepositoryError(
        `Failed to load tasks for project ${projectId}`,
        error,
      );
    }
  }

  /** @inheritdoc */
  findByStatus(projectId: string, status: TaskStatus): Task[] {
    try {
      const rows = this.db
        .prepare(
          `${TASK_SELECT}
           WHERE project_id = ? AND status = ?
           ORDER BY sort_order ASC, updated_at DESC`,
        )
        .all(projectId, status) as TaskRow[];

      return rows.map(mapTaskRow);
    } catch (error) {
      throw wrapRepositoryError(
        `Failed to load ${status} tasks for project ${projectId}`,
        error,
      );
    }
  }

  /** @inheritdoc */
  findById(id: string): Task | null {
    try {
      const row = this.db
        .prepare(`${TASK_SELECT} WHERE id = ?`)
        .get(id) as TaskRow | undefined;

      return row ? mapTaskRow(row) : null;
    } catch (error) {
      throw wrapRepositoryError(`Failed to load task ${id}`, error);
    }
  }

  /** @inheritdoc */
  search(projectId: string, query: string, filters: TaskFilters): Task[] {
    try {
      const conditions = ['project_id = ?'];
      const params: unknown[] = [projectId];

      const trimmedQuery = query.trim().toLowerCase();
      if (trimmedQuery) {
        conditions.push('(LOWER(title) LIKE ? OR LOWER(description) LIKE ?)');
        const pattern = `%${trimmedQuery}%`;
        params.push(pattern, pattern);
      }

      if (filters.statuses?.length) {
        const placeholders = filters.statuses.map(() => '?').join(', ');
        conditions.push(`status IN (${placeholders})`);
        params.push(...filters.statuses);
      }

      if (filters.priorities?.length) {
        const placeholders = filters.priorities.map(() => '?').join(', ');
        conditions.push(`priority IN (${placeholders})`);
        params.push(...filters.priorities);
      }

      const rows = this.db
        .prepare(
          `${TASK_SELECT}
           WHERE ${conditions.join(' AND ')}
           ${TASK_ORDER_BY}`,
        )
        .all(...params) as TaskRow[];

      let tasks = rows.map(mapTaskRow);

      if (filters.tags?.length) {
        tasks = tasks.filter((task) =>
          filters.tags!.every((tag) => task.tags.includes(tag)),
        );
      }

      return tasks;
    } catch (error) {
      throw wrapRepositoryError(
        `Failed to search tasks for project ${projectId}`,
        error,
      );
    }
  }

  /** @inheritdoc */
  create(data: CreateTaskDto): Task {
    const title = data.title.trim();
    if (!title) {
      throw new RepositoryError('Task title is required', 'VALIDATION');
    }

    if (!data.projectId) {
      throw new RepositoryError('Task projectId is required', 'VALIDATION');
    }

    const now = new Date();
    const status = data.status ?? 'todo';
    const sortOrder = this.nextSortOrder(data.projectId, status);
    const task: Task = {
      id: uuidv4(),
      projectId: data.projectId,
      title,
      description: data.description?.trim() ?? '',
      status,
      priority: data.priority ?? 'medium',
      tags: data.tags ?? [],
      relatedFiles: data.relatedFiles ?? [],
      acceptanceCriteria: data.acceptanceCriteria ?? [],
      timeTracked: 0,
      timerStartedAt: null,
      externalId: data.externalId ?? null,
      externalProvider: data.externalProvider ?? null,
      externalUrl: data.externalUrl ?? null,
      descriptionImages: data.descriptionImages ?? [],
      sortOrder,
      createdAt: now,
      updatedAt: now,
    };

    try {
      this.db
        .prepare(
          `INSERT INTO tasks (
            id,
            project_id,
            title,
            description,
            status,
            priority,
            tags,
            related_files,
            acceptance_criteria,
            time_tracked,
            timer_started_at,
            external_id,
            external_provider,
            external_url,
            description_images,
            sort_order,
            created_at,
            updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          task.id,
          task.projectId,
          task.title,
          task.description,
          task.status,
          task.priority,
          serializeStringArray(task.tags),
          serializeStringArray(task.relatedFiles),
          serializeStringArray(task.acceptanceCriteria),
          task.timeTracked,
          null,
          task.externalId,
          task.externalProvider,
          task.externalUrl,
          serializeDescriptionImages(task.descriptionImages),
          task.sortOrder,
          toIsoString(task.createdAt),
          toIsoString(task.updatedAt),
        );

      return task;
    } catch (error) {
      throw wrapRepositoryError('Failed to create task', error);
    }
  }

  /** @inheritdoc */
  update(id: string, data: UpdateTaskDto): Task {
    const existing = this.findById(id);
    if (!existing) {
      throw new RepositoryError(`Task not found: ${id}`, 'NOT_FOUND');
    }

    if (data.title !== undefined && !data.title.trim()) {
      throw new RepositoryError('Task title cannot be empty', 'VALIDATION');
    }

    const updated: Task = {
      ...existing,
      title: data.title !== undefined ? data.title : existing.title,
      description:
        data.description !== undefined ? data.description : existing.description,
      status: data.status ?? existing.status,
      priority: data.priority ?? existing.priority,
      tags: data.tags ?? existing.tags,
      relatedFiles: data.relatedFiles ?? existing.relatedFiles,
      acceptanceCriteria:
        data.acceptanceCriteria ?? existing.acceptanceCriteria,
      timeTracked: data.timeTracked ?? existing.timeTracked,
      timerStartedAt:
        data.timerStartedAt !== undefined
          ? data.timerStartedAt
          : existing.timerStartedAt,
      externalId:
        data.externalId !== undefined ? data.externalId : existing.externalId,
      externalProvider:
        data.externalProvider !== undefined
          ? data.externalProvider
          : existing.externalProvider,
      externalUrl:
        data.externalUrl !== undefined ? data.externalUrl : existing.externalUrl,
      descriptionImages:
        data.descriptionImages !== undefined
          ? data.descriptionImages
          : existing.descriptionImages,
      updatedAt: new Date(),
    };

    if (!updated.title.trim()) {
      throw new RepositoryError('Task title cannot be empty', 'VALIDATION');
    }

    try {
      this.db
        .prepare(
          `UPDATE tasks SET
            title = ?,
            description = ?,
            status = ?,
            priority = ?,
            tags = ?,
            related_files = ?,
            acceptance_criteria = ?,
            time_tracked = ?,
            timer_started_at = ?,
            external_id = ?,
            external_provider = ?,
            external_url = ?,
            description_images = ?,
            updated_at = ?
           WHERE id = ?`,
        )
        .run(
          updated.title,
          updated.description,
          updated.status,
          updated.priority,
          serializeStringArray(updated.tags),
          serializeStringArray(updated.relatedFiles),
          serializeStringArray(updated.acceptanceCriteria),
          updated.timeTracked,
          updated.timerStartedAt
            ? toIsoString(updated.timerStartedAt)
            : null,
          updated.externalId,
          updated.externalProvider,
          updated.externalUrl,
          serializeDescriptionImages(updated.descriptionImages),
          toIsoString(updated.updatedAt),
          id,
        );

      return updated;
    } catch (error) {
      throw wrapRepositoryError(`Failed to update task ${id}`, error);
    }
  }

  /** @inheritdoc */
  updateStatus(id: string, status: TaskStatus): Task {
    const existing = this.findById(id);
    if (!existing) {
      throw new RepositoryError(`Task not found: ${id}`, 'NOT_FOUND');
    }

    const updated = this.update(id, { status });
    if (existing.status !== status) {
      this.placeTaskInColumn(existing.projectId, status, id);
      return this.findById(id) ?? updated;
    }

    return updated;
  }

  /** @inheritdoc */
  startTimer(id: string): Task {
    const existing = this.findById(id);
    if (!existing) {
      throw new RepositoryError(`Task not found: ${id}`, 'NOT_FOUND');
    }

    return this.update(id, { timerStartedAt: new Date() });
  }

  /** @inheritdoc */
  stopTimer(id: string): Task {
    const existing = this.findById(id);
    if (!existing) {
      throw new RepositoryError(`Task not found: ${id}`, 'NOT_FOUND');
    }

    if (!existing.timerStartedAt) {
      return existing;
    }

    const elapsedSeconds = Math.max(
      0,
      Math.floor(
        (Date.now() - existing.timerStartedAt.getTime()) / 1000,
      ),
    );

    return this.update(id, {
      timeTracked: existing.timeTracked + elapsedSeconds,
      timerStartedAt: null,
    });
  }

  /** @inheritdoc */
  delete(id: string): void {
    const existing = this.findById(id);
    if (!existing) {
      throw new RepositoryError(`Task not found: ${id}`, 'NOT_FOUND');
    }

    try {
      this.db.prepare(`DELETE FROM tasks WHERE id = ?`).run(id);
    } catch (error) {
      throw wrapRepositoryError(`Failed to delete task ${id}`, error);
    }
  }

  /** @inheritdoc */
  logTransition(
    taskId: string,
    from: TaskStatus | null,
    to: TaskStatus,
    message: string,
  ): void {
    const task = this.findById(taskId);
    if (!task) {
      throw new RepositoryError(`Task not found: ${taskId}`, 'NOT_FOUND');
    }

    const now = new Date();

    try {
      this.db
        .prepare(
          `INSERT INTO task_logs (
            id, task_id, from_status, to_status, message, created_at
          ) VALUES (?, ?, ?, ?, ?, ?)`,
        )
        .run(
          uuidv4(),
          taskId,
          from,
          to,
          message,
          toIsoString(now),
        );
    } catch (error) {
      throw wrapRepositoryError(
        `Failed to log transition for task ${taskId}`,
        error,
      );
    }
  }

  /** @inheritdoc */
  reorderTasks(
    projectId: string,
    status: TaskStatus,
    taskIds: string[],
  ): void {
    const columnTasks = this.findByStatus(projectId, status);

    if (taskIds.length !== columnTasks.length) {
      throw new RepositoryError(
        'Reorder list must include every task in the column',
        'VALIDATION',
      );
    }

    const expectedIds = new Set(columnTasks.map((task) => task.id));
    for (const taskId of taskIds) {
      if (!expectedIds.has(taskId)) {
        throw new RepositoryError(
          `Task ${taskId} is not in column "${status}"`,
          'VALIDATION',
        );
      }
    }

    try {
      const update = this.db.prepare(
        `UPDATE tasks SET sort_order = ? WHERE id = ?`,
      );
      const apply = this.db.transaction(() => {
        taskIds.forEach((taskId, index) => {
          update.run(index, taskId);
        });
      });
      apply();
    } catch (error) {
      throw wrapRepositoryError(
        `Failed to reorder ${status} tasks for project ${projectId}`,
        error,
      );
    }
  }

  /** @inheritdoc */
  getTaskLogs(taskId: string): TaskLog[] {
    try {
      const rows = this.db
        .prepare(
          `SELECT id, task_id, from_status, to_status, message, created_at
           FROM task_logs
           WHERE task_id = ?
           ORDER BY created_at ASC`,
        )
        .all(taskId) as TaskLogRow[];

      return rows.map(mapTaskLogRow);
    } catch (error) {
      throw wrapRepositoryError(
        `Failed to load logs for task ${taskId}`,
        error,
      );
    }
  }

  private nextSortOrder(projectId: string, status: TaskStatus): number {
    const row = this.db
      .prepare(
        `SELECT COALESCE(MAX(sort_order), -1) AS max_order
         FROM tasks
         WHERE project_id = ? AND status = ?`,
      )
      .get(projectId, status) as { max_order: number };

    return row.max_order + 1;
  }

  private placeTaskInColumn(
    projectId: string,
    status: TaskStatus,
    taskId: string,
    insertAt?: number,
  ): void {
    const columnTasks = this.findByStatus(projectId, status);
    const orderedIds = columnTasks
      .map((task) => task.id)
      .filter((id) => id !== taskId);
    const index =
      insertAt === undefined
        ? orderedIds.length
        : Math.max(0, Math.min(insertAt, orderedIds.length));
    orderedIds.splice(index, 0, taskId);
    this.reorderTasks(projectId, status, orderedIds);
  }
}
