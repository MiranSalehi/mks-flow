import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import type { Project } from '../../domain/models/Project';
import type { Task } from '../../domain/models/Task';
import { ensureMksflowGitignore } from '../../shared/mksflowGitignore';
import { MKSFLOW_TASK_CONTEXT_DIR } from '../../shared/mksflowPaths';
import type { AIPromptService } from './AIPromptService';

export interface TaskContextFileResult {
  absolutePath: string;
  relativePath: string;
  markdown: string;
}

/**
 * Writes task context as markdown files under `mksflow-tasks/` in the workspace.
 */
export class TaskContextFileService {
  constructor(private readonly aiPromptService: AIPromptService) {}

  /** Builds the full task context document. */
  generateMarkdown(task: Task, project: Project): string {
    return this.aiPromptService.generatePrompt(task, project);
  }

  /**
   * Persists task context to `{workspace}/mksflow-tasks/{taskId}.md`.
   */
  async writeContextFile(
    task: Task,
    project: Project,
  ): Promise<TaskContextFileResult> {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
      throw new Error(
        'Open a workspace folder before sending a task to AI.',
      );
    }

    const markdown = this.generateMarkdown(task, project);
    const tasksDir = path.join(workspaceFolder.uri.fsPath, MKSFLOW_TASK_CONTEXT_DIR);
    fs.mkdirSync(tasksDir, { recursive: true });

    const absolutePath = path.join(tasksDir, `${task.id}.md`);
    fs.writeFileSync(absolutePath, markdown, 'utf8');

    ensureMksflowGitignore(workspaceFolder.uri.fsPath);

    const relativePath = path.posix.join(MKSFLOW_TASK_CONTEXT_DIR, `${task.id}.md`);

    return { absolutePath, relativePath, markdown };
  }

}
