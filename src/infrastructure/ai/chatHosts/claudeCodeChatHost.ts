import * as vscode from 'vscode';
import type { ChatHostAttachResult } from './types';
import { CHAT_HOST_LABELS } from './types';
import { buildChatPrompt, delay, getAvailableCommands, runIfAvailable } from './utils';

/** Attaches task context to Claude Code via URI handler or focus + clipboard. */
export async function attachToClaudeCode(
  relativePath: string,
  _absolutePath: string,
): Promise<ChatHostAttachResult> {
  const chatPrompt = buildChatPrompt(relativePath);
  const commands = await getAvailableCommands();

  const uri = vscode.Uri.parse(
    `vscode://anthropic.claude-code/open?prompt=${encodeURIComponent(chatPrompt)}`,
  );

  try {
    await vscode.commands.executeCommand('vscode.open', uri);
    return {
      hostId: 'claude',
      hostName: CHAT_HOST_LABELS.claude,
      attachedToChat: true,
      chatPrompt,
      insertMode: 'new_chat',
      message: 'Task context opened in Claude Code',
    };
  } catch {
    // Fall through to command + clipboard strategy.
  }

  if (commands.includes('claude-vscode.newConversation')) {
    await runIfAvailable(commands, 'claude-vscode.newConversation');
    await delay(500);
  }

  await runIfAvailable(commands, 'claude-vscode.focus');
  await delay(280);

  const previousClipboard = await vscode.env.clipboard.readText();
  try {
    await vscode.env.clipboard.writeText(chatPrompt);
    await delay(120);
    const pasted = await runIfAvailable(
      commands,
      'editor.action.clipboardPasteAction',
    );
    if (pasted) {
      return {
        hostId: 'claude',
        hostName: CHAT_HOST_LABELS.claude,
        attachedToChat: true,
        chatPrompt,
        insertMode: 'current',
        message: 'Task context pasted into Claude Code',
      };
    }
  } finally {
    await vscode.env.clipboard.writeText(previousClipboard);
  }

  return {
    hostId: 'claude',
    hostName: CHAT_HOST_LABELS.claude,
    attachedToChat: false,
    chatPrompt,
    insertMode: 'current',
    message: 'Claude Code is available but chat input could not be updated automatically',
  };
}
