import * as fs from 'fs';
import * as vscode from 'vscode';
import type { IProjectRepository } from '../../domain/interfaces/IProjectRepository';
import type { ITaskRepository } from '../../domain/interfaces/ITaskRepository';
import type { Project } from '../../domain/models/Project';
import type { TaskLog } from '../../domain/models/TaskLog';
import type { Task } from '../../domain/models/Task';
import { RepositoryError } from '../../infrastructure/repositories/RepositoryError';

/** Full project export payload including tasks and audit logs. */
export interface ExportData {
  exportedAt: string;
  project: Project;
  tasks: Task[];
  taskLogs: TaskLog[];
}

/**
 * Exports project data to JSON for backup or migration.
 */
export class ExportService {
  constructor(
    private readonly projectRepository: IProjectRepository,
    private readonly taskRepository: ITaskRepository,
  ) {}

  /** Builds the export payload for a project. */
  exportProject(projectId: string): ExportData {
    const project = this.projectRepository.findById(projectId);
    if (!project) {
      throw new RepositoryError(`Project not found: ${projectId}`, 'NOT_FOUND');
    }

    const tasks = this.taskRepository.findByProjectId(projectId);
    const taskLogs = tasks.flatMap((task) =>
      this.taskRepository.getTaskLogs(task.id),
    );

    return {
      exportedAt: new Date().toISOString(),
      project,
      tasks,
      taskLogs,
    };
  }

  /** Serializes a project export to formatted JSON. */
  exportToJSON(projectId: string): string {
    const data = this.exportProject(projectId);
    return JSON.stringify(data, null, 2);
  }

  /** Opens a save dialog and writes the export JSON to disk. */
  async saveExportFile(projectId: string): Promise<void> {
    const project = this.projectRepository.findById(projectId);
    if (!project) {
      throw new RepositoryError(`Project not found: ${projectId}`, 'NOT_FOUND');
    }

    const defaultName = `${slugify(project.name)}-export.json`;
    const targetUri = await vscode.window.showSaveDialog({
      defaultUri: vscode.Uri.file(defaultName),
      filters: { JSON: ['json'] },
      saveLabel: 'Export',
    });

    if (!targetUri) {
      return;
    }

    const json = this.exportToJSON(projectId);
    await fs.promises.writeFile(targetUri.fsPath, json, 'utf8');

    void vscode.window.showInformationMessage(
      `Project exported to ${targetUri.fsPath}`,
    );
  }
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'project';
}
