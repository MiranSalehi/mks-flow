import * as vscode from 'vscode';
import type { TaskContextFileService } from '../../../application/services/TaskContextFileService';
import type {
  AIResponse,
  IAIProvider,
  TaskContext,
} from '../../../domain/interfaces/IAIProvider';
import type { ChatIntegrationService } from '../chatHosts/ChatIntegrationService';

/**
 * Writes a task context file and routes it to the best available chat host.
 */
export class SmartChatAdapter implements IAIProvider {
  readonly id = 'auto';
  readonly name = 'Auto-detect chat host';

  constructor(
    private readonly taskContextFileService: TaskContextFileService,
    private readonly chatIntegration: ChatIntegrationService,
  ) {}

  async isAvailable(): Promise<boolean> {
    return (vscode.workspace.workspaceFolders?.length ?? 0) > 0;
  }

  async sendPrompt(prompt: string, context: TaskContext): Promise<AIResponse> {
    try {
      const file = await this.taskContextFileService.writeContextFile(
        context.task,
        context.project,
      );

      const providerId = this.chatIntegration.resolveProviderId();

      if (providerId === 'clipboard') {
        await vscode.env.clipboard.writeText(prompt);
        return {
          success: true,
          message: 'Full task prompt copied to clipboard',
          contextFilePath: file.absolutePath,
          relativePath: file.relativePath,
          chatPrompt: `@${file.relativePath}`,
          providerId: 'clipboard',
          providerName: 'Clipboard',
          attachedToChat: false,
        };
      }

      const attach = await this.chatIntegration.attachTaskContext(
        file.relativePath,
        file.absolutePath,
      );

      if (!attach.attachedToChat) {
        await vscode.env.clipboard.writeText(attach.chatPrompt);
        const document = await vscode.workspace.openTextDocument(
          vscode.Uri.file(file.absolutePath),
        );
        await vscode.window.showTextDocument(document, { preview: false });
        void vscode.window.showWarningMessage(
          attach.hostId === 'none'
            ? `No AI chat host detected. Context file ready — paste @${file.relativePath} into your chat.`
            : `${attach.hostName}: could not attach automatically. Prompt copied — paste into chat or use @${file.relativePath}.`,
        );
      }

      return {
        success: true,
        message: attach.message,
        contextFilePath: file.absolutePath,
        relativePath: file.relativePath,
        chatPrompt: attach.chatPrompt,
        providerId: attach.hostId,
        providerName: attach.hostName,
        attachedToChat: attach.attachedToChat,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to send task to AI chat',
      };
    }
  }
}
