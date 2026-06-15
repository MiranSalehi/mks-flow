import * as vscode from 'vscode';
import type { CursorComposerService } from '../CursorComposerService';
import { attachToAntigravity } from './antigravityChatHost';
import { attachToClaudeCode } from './claudeCodeChatHost';
import { attachToCline } from './clineChatHost';
import { attachToCursor } from './cursorChatHost';
import { detectChatHost } from './detectChatHost';
import type { ChatHostAttachResult, ChatHostId } from './types';
import { CHAT_HOST_LABELS } from './types';
import { buildChatPrompt, getAvailableCommands } from './utils';

export type AiProviderId =
  | 'auto'
  | 'cursor'
  | 'cline'
  | 'claude'
  | 'antigravity'
  | 'clipboard';

/**
 * Routes task context files to the active IDE chat host (Cursor, Cline, etc.).
 */
export class ChatIntegrationService {
  constructor(private readonly cursorComposerService: CursorComposerService) {}

  resolveProviderId(): AiProviderId {
    return vscode.workspace
      .getConfiguration('mksflow')
      .get<AiProviderId>('aiProvider', 'auto');
  }

  async attachTaskContext(
    relativePath: string,
    absolutePath: string,
  ): Promise<ChatHostAttachResult> {
    const providerId = this.resolveProviderId();
    const commands = await getAvailableCommands();
    const chatPrompt = buildChatPrompt(relativePath);

    if (providerId === 'clipboard') {
      return {
        hostId: 'none',
        hostName: CHAT_HOST_LABELS.none,
        attachedToChat: false,
        chatPrompt,
        insertMode: 'current',
        message: 'Clipboard mode — prompt not sent to chat automatically',
      };
    }

    const host =
      providerId === 'auto'
        ? detectChatHost(commands)
        : providerId === 'cursor' ||
            providerId === 'cline' ||
            providerId === 'claude' ||
            providerId === 'antigravity'
          ? detectChatHost(commands, providerId)
          : 'none';

    switch (host) {
      case 'cursor':
        return attachToCursor(
          this.cursorComposerService,
          relativePath,
          absolutePath,
        );
      case 'cline':
        return attachToCline(relativePath, absolutePath);
      case 'claude':
        return attachToClaudeCode(relativePath, absolutePath);
      case 'antigravity':
        return attachToAntigravity(relativePath, absolutePath);
      default:
        return {
          hostId: 'none',
          hostName: CHAT_HOST_LABELS.none,
          attachedToChat: false,
          chatPrompt,
          insertMode: 'current',
          message: 'No supported AI chat host detected in this editor',
        };
    }
  }

  async detectActiveHost(): Promise<ChatHostId> {
    const commands = await getAvailableCommands();
    const providerId = this.resolveProviderId();
    if (providerId === 'clipboard') {
      return 'none';
    }
    if (providerId !== 'auto') {
      return detectChatHost(commands, providerId);
    }
    return detectChatHost(commands);
  }
}
