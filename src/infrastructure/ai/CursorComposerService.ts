import * as vscode from 'vscode';

const FOCUS_DELAY_MS = 450;

const FOCUS_INPUT_COMMANDS = [
  'aichat.newfollowupaction',
  'composer.focusComposer',
  'composer.openComposer',
] as const;

const INSERT_COMMANDS = ['type', 'editor.action.clipboardPasteAction'] as const;

/**
 * Sends a short @file prompt into the active Cursor Composer chat (not a new tab).
 */
export class CursorComposerService {
  buildChatPrompt(relativePath: string): string {
    return `Implement this task. Full context:\n\n@${relativePath}`;
  }

  /**
   * Inserts the chat prompt into the current Composer input when possible.
   */
  async sendToComposer(
    relativePath: string,
    absolutePath: string,
  ): Promise<{ openedComposer: boolean; chatPrompt: string }> {
    const chatPrompt = this.buildChatPrompt(relativePath);
    const previousClipboard = await vscode.env.clipboard.readText();
    const commands = await vscode.commands.getCommands();

    try {
      await vscode.env.clipboard.writeText(chatPrompt);

      const inserted = await this.insertIntoActiveComposer(
        commands,
        chatPrompt,
        absolutePath,
      );

      if (inserted) {
        this.restoreClipboardLater(previousClipboard);
        return { openedComposer: true, chatPrompt };
      }

      const document = await vscode.workspace.openTextDocument(
        vscode.Uri.file(absolutePath),
      );
      await vscode.window.showTextDocument(document, { preview: false });
      void vscode.window.showWarningMessage(
        `Could not reach Composer input. Opened task context file: ${relativePath}. Use Copy @reference from MKSFlow.`,
      );
      this.restoreClipboardLater(previousClipboard);
      return { openedComposer: false, chatPrompt };
    } catch (error) {
      await vscode.env.clipboard.writeText(previousClipboard);
      throw error;
    }
  }

  /**
   * Focuses the current composer follow-up input and inserts text.
   * Never calls composer.newAgentChat or composer.startComposerPrompt (those open/close tabs).
   */
  private async insertIntoActiveComposer(
    commands: readonly string[],
    chatPrompt: string,
    absolutePath: string,
  ): Promise<boolean> {
    const focusCommand = FOCUS_INPUT_COMMANDS.find((command) =>
      commands.includes(command),
    );
    if (!focusCommand) {
      return false;
    }

    for (let attempt = 0; attempt < 2; attempt++) {
      await vscode.commands.executeCommand(focusCommand);
      await delay(FOCUS_DELAY_MS + attempt * 200);

      if (commands.includes('composer.addfilestocomposer')) {
        try {
          await vscode.commands.executeCommand(
            'composer.addfilestocomposer',
            vscode.Uri.file(absolutePath),
          );
          await delay(80);
        } catch {
          // @path in pasted text is enough.
        }
      }

      for (const command of INSERT_COMMANDS) {
        if (!commands.includes(command)) {
          continue;
        }

        try {
          if (command === 'type') {
            await vscode.commands.executeCommand('type', { text: chatPrompt });
          } else {
            await vscode.commands.executeCommand(command);
          }
          return true;
        } catch {
          // Try next insert strategy on this attempt.
        }
      }
    }

    return false;
  }

  private restoreClipboardLater(previousClipboard: string): void {
    setTimeout(() => {
      void vscode.env.clipboard.writeText(previousClipboard);
    }, 500);
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
