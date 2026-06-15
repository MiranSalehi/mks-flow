import * as vscode from 'vscode';
import type { ChatHostAttachResult } from './types';
import { CHAT_HOST_LABELS } from './types';
import { buildChatPrompt, delay, getAvailableCommands, runIfAvailable } from './utils';

/** Attaches task context to Antigravity Cascade chat. */
export async function attachToAntigravity(
  relativePath: string,
  _absolutePath: string,
): Promise<ChatHostAttachResult> {
  const chatPrompt = buildChatPrompt(relativePath);
  const commands = await getAvailableCommands();

  if (commands.includes('antigravity.sendTextToChat')) {
    await runIfAvailable(
      commands,
      'antigravity.prioritized.chat.openNewConversation',
    );
    await delay(420);
    const sent = await runIfAvailable(
      commands,
      'antigravity.sendTextToChat',
      true,
      chatPrompt,
    );
    if (sent) {
      return {
        hostId: 'antigravity',
        hostName: CHAT_HOST_LABELS.antigravity,
        attachedToChat: true,
        chatPrompt,
        insertMode: 'current',
        message: 'Task context added to Antigravity chat',
      };
    }
  }

  if (commands.includes('workbench.action.chat.open')) {
    try {
      await vscode.commands.executeCommand('workbench.action.chat.open', {
        query: chatPrompt,
        isPartialQuery: true,
      });
      return {
        hostId: 'antigravity',
        hostName: CHAT_HOST_LABELS.antigravity,
        attachedToChat: true,
        chatPrompt,
        insertMode: 'current',
        message: 'Task context added to Antigravity chat',
      };
    } catch {
      // Fall through.
    }
  }

  return {
    hostId: 'antigravity',
    hostName: CHAT_HOST_LABELS.antigravity,
    attachedToChat: false,
    chatPrompt,
    insertMode: 'current',
    message:
      'Antigravity is available but chat input could not be updated automatically',
  };
}
