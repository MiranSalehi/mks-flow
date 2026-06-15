import * as fs from 'fs';
import * as vscode from 'vscode';

const FOCUS_AUXILIARY = 'workbench.action.focusAuxiliaryBar';
const ADD_FILES = 'composer.addfilestocomposer';
const ADD_FILES_NEW_CHAT = 'composer.addfilestonewcomposer';
const OPEN_CHAT = 'workbench.action.chat.open';

const PASTE_COMMANDS = [
  'editor.action.clipboardPasteAction',
  'paste',
] as const;

const INSTRUCTION = 'Implement this task. Full context:';

export type ComposerInsertMode = 'current' | 'new_chat';

export interface ComposerSendResult {
  openedComposer: boolean;
  chatPrompt: string;
  insertMode: ComposerInsertMode;
}

/**
 * Attaches a workspace file to Cursor Composer as a native context chip (blue pill).
 */
export class CursorComposerService {
  buildChatPrompt(relativePath: string): string {
    return `${INSTRUCTION}\n\n@${relativePath}`;
  }

  async sendToComposer(
    relativePath: string,
    absolutePath: string,
  ): Promise<ComposerSendResult> {
    const chatPrompt = this.buildChatPrompt(relativePath);
    const previousClipboard = await vscode.env.clipboard.readText();
    const commands = await vscode.commands.getCommands();
    const fileUri = this.resolveWorkspaceUri(relativePath, absolutePath);

    try {
      await this.ensureFileOnDisk(fileUri);

      const currentResult = await this.insertIntoCurrentComposer(
        commands,
        fileUri,
      );
      if (currentResult) {
        this.restoreClipboardLater(previousClipboard);
        return {
          openedComposer: true,
          chatPrompt,
          insertMode: 'current',
        };
      }

      const newChatResult = await this.openNewChatWithFile(commands, fileUri);
      if (newChatResult) {
        this.restoreClipboardLater(previousClipboard);
        return {
          openedComposer: true,
          chatPrompt,
          insertMode: 'new_chat',
        };
      }

      const document = await vscode.workspace.openTextDocument(fileUri);
      await vscode.window.showTextDocument(document, { preview: false });
      void vscode.window.showWarningMessage(
        `Could not attach file to Composer. Opened ${relativePath} — use Copy @reference from MKSFlow.`,
      );
      this.restoreClipboardLater(previousClipboard);
      return {
        openedComposer: false,
        chatPrompt,
        insertMode: 'current',
      };
    } catch (error) {
      await vscode.env.clipboard.writeText(previousClipboard);
      throw error;
    }
  }

  /**
   * Instruction text first, then native file chip via composer.addfilestocomposer.
   * Never calls composer.openComposer — it can toggle-close an already open chat.
   */
  private async insertIntoCurrentComposer(
    commands: readonly string[],
    fileUri: vscode.Uri,
  ): Promise<boolean> {
    if (!this.canUseComposer(commands)) {
      return false;
    }

    await this.focusComposerInput(commands);

    if (!(await this.pasteInstruction(commands))) {
      return false;
    }

    await delay(180);
    await this.focusComposerInput(commands);

    return this.attachFileToComposer(commands, fileUri, ADD_FILES);
  }

  private async openNewChatWithFile(
    commands: readonly string[],
    fileUri: vscode.Uri,
  ): Promise<boolean> {
    if (commands.includes(ADD_FILES_NEW_CHAT)) {
      try {
        await this.runIfAvailable(commands, FOCUS_AUXILIARY);
        await vscode.commands.executeCommand(ADD_FILES_NEW_CHAT, fileUri);
        await delay(700);
        await this.focusComposerInput(commands);
        await this.pasteInstruction(commands);
        return true;
      } catch {
        // Fall through to chat.open + addfiles.
      }
    }

    if (!commands.includes(OPEN_CHAT) || !commands.includes(ADD_FILES)) {
      return false;
    }

    try {
      await this.runIfAvailable(commands, FOCUS_AUXILIARY);
      await vscode.commands.executeCommand(OPEN_CHAT, INSTRUCTION);
      await delay(750);
      await this.focusComposerInput(commands);
      return this.attachFileToComposer(commands, fileUri, ADD_FILES);
    } catch {
      return false;
    }
  }

  /** Focus the current Composer follow-up field without toggling the sidebar closed. */
  private async focusComposerInput(commands: readonly string[]): Promise<void> {
    await this.runIfAvailable(commands, FOCUS_AUXILIARY);
    await delay(140);
    await this.runIfAvailable(commands, 'aichat.newfollowupaction');
    await delay(480);
    await this.runIfAvailable(commands, 'composer.focusComposer');
    await delay(260);
  }

  private async attachFileToComposer(
    commands: readonly string[],
    fileUri: vscode.Uri,
    command: string,
  ): Promise<boolean> {
    if (!commands.includes(command)) {
      return false;
    }

    for (let attempt = 0; attempt < 3; attempt++) {
      if (attempt > 0) {
        await this.focusComposerInput(commands);
      }

      try {
        await vscode.commands.executeCommand(command, fileUri);
        await delay(320);
        await this.runIfAvailable(commands, 'composer.focusComposer');
        return true;
      } catch {
        await delay(200);
      }
    }

    return false;
  }

  private async pasteInstruction(commands: readonly string[]): Promise<boolean> {
    await vscode.env.clipboard.writeText(INSTRUCTION);

    for (let attempt = 0; attempt < 2; attempt++) {
      await this.runIfAvailable(commands, 'composer.focusComposer');
      await delay(180);

      for (const pasteCommand of PASTE_COMMANDS) {
        if (await this.runIfAvailable(commands, pasteCommand)) {
          await delay(100);
          return true;
        }
      }
    }

    return false;
  }

  private resolveWorkspaceUri(
    relativePath: string,
    absolutePath: string,
  ): vscode.Uri {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (workspaceFolder) {
      return vscode.Uri.joinPath(
        workspaceFolder.uri,
        ...relativePath.split('/').filter(Boolean),
      );
    }

    return vscode.Uri.file(absolutePath);
  }

  private async ensureFileOnDisk(fileUri: vscode.Uri): Promise<void> {
    if (!fs.existsSync(fileUri.fsPath)) {
      throw new Error(`Task context file not found: ${fileUri.fsPath}`);
    }

    await vscode.workspace.openTextDocument(fileUri);
  }

  private canUseComposer(commands: readonly string[]): boolean {
    return (
      commands.includes(ADD_FILES) &&
      commands.includes('aichat.newfollowupaction')
    );
  }

  private async runIfAvailable(
    commands: readonly string[],
    command: string,
  ): Promise<boolean> {
    if (!commands.includes(command)) {
      return false;
    }

    try {
      await vscode.commands.executeCommand(command);
      return true;
    } catch {
      return false;
    }
  }

  private restoreClipboardLater(previousClipboard: string): void {
    setTimeout(() => {
      void vscode.env.clipboard.writeText(previousClipboard);
    }, 1200);
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
