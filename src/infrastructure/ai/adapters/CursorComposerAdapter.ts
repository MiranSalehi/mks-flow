import * as vscode from 'vscode';
import type { TaskContextFileService } from '../../../application/services/TaskContextFileService';
import type {
  AIResponse,
  IAIProvider,
  TaskContext,
} from '../../../domain/interfaces/IAIProvider';
import type { CursorComposerService } from '../CursorComposerService';

/**
 * Writes a workspace markdown context file and sends an @file reference to Cursor Composer.
 */
export class CursorComposerAdapter implements IAIProvider {
  readonly id = 'cursor';
  readonly name = 'Cursor Composer';

  constructor(
    private readonly taskContextFileService: TaskContextFileService,
    private readonly cursorComposerService: CursorComposerService,
  ) {}

  /** Cursor Composer is available when a workspace folder is open. */
  async isAvailable(): Promise<boolean> {
    return (vscode.workspace.workspaceFolders?.length ?? 0) > 0;
  }

  /**
   * Writes `.mksflow/tasks/{id}.md` and opens Composer with an @file prompt.
   */
  async sendPrompt(_prompt: string, context: TaskContext): Promise<AIResponse> {
    try {
      const file = await this.taskContextFileService.writeContextFile(
        context.task,
        context.project,
      );
      const composer = await this.cursorComposerService.sendToComposer(
        file.relativePath,
        file.absolutePath,
      );

      return {
        success: true,
        message: composer.openedComposer
          ? 'Task context added to current Composer chat'
          : 'Task context file created (Composer unavailable)',
        contextFilePath: file.absolutePath,
        relativePath: file.relativePath,
        chatPrompt: composer.chatPrompt,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to send task to Cursor Composer',
      };
    }
  }
}
