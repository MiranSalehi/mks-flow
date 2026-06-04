import type {
  AIResponse,
  IAIProvider,
  TaskContext,
} from '../../../domain/interfaces/IAIProvider';
import * as vscode from 'vscode';

/**
 * Phase 1 AI provider — copies the generated prompt to the clipboard.
 */
export class ClipboardAIAdapter implements IAIProvider {
  readonly id = 'clipboard';
  readonly name = 'Clipboard';

  /** Clipboard is always available in VS Code. */
  async isAvailable(): Promise<boolean> {
    return true;
  }

  /** Writes the prompt to the clipboard and returns success. */
  async sendPrompt(prompt: string, _context: TaskContext): Promise<AIResponse> {
    try {
      await vscode.env.clipboard.writeText(prompt);
      return {
        success: true,
        message: 'Prompt copied to clipboard',
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to copy prompt to clipboard',
      };
    }
  }
}
