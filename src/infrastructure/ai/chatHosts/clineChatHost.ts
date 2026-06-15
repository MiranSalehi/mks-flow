import * as vscode from 'vscode';
import type { ChatHostAttachResult } from './types';
import { CHAT_HOST_LABELS, CHAT_INSTRUCTION } from './types';
import { buildChatPrompt, delay, getAvailableCommands, runIfAvailable } from './utils';

/** Attaches task context to Cline chat input. */
export async function attachToCline(
  relativePath: string,
  absolutePath: string,
): Promise<ChatHostAttachResult> {
  const chatPrompt = buildChatPrompt(relativePath);
  const commands = await getAvailableCommands();

  await runIfAvailable(commands, 'cline.focusChatInput');
  await delay(280);

  if (commands.includes('cline.addPromptToChat')) {
    const promptOk = await runIfAvailable(
      commands,
      'cline.addPromptToChat',
      CHAT_INSTRUCTION,
    );
    await delay(160);

    const fileOk = commands.includes('cline.addFileMentionToChat')
      ? (await runIfAvailable(
          commands,
          'cline.addFileMentionToChat',
          absolutePath,
        )) ||
        (await runIfAvailable(
          commands,
          'cline.addFileMentionToChat',
          relativePath,
        ))
      : false;

    if (promptOk || fileOk) {
      return {
        hostId: 'cline',
        hostName: CHAT_HOST_LABELS.cline,
        attachedToChat: true,
        chatPrompt,
        insertMode: 'current',
        message: 'Task context added to Cline chat',
      };
    }
  }

  const fileUri = vscode.Uri.file(absolutePath);
  await vscode.workspace.openTextDocument(fileUri);
  const opened = await runIfAvailable(commands, 'cline.openInNewTab');
  if (!opened) {
    await runIfAvailable(commands, 'cline.focusChatInput');
  }
  await delay(320);

  const clipboard = await vscode.env.clipboard.readText();
  try {
    await vscode.env.clipboard.writeText(chatPrompt);
    await delay(120);
    const pasted = await runIfAvailable(
      commands,
      'editor.action.clipboardPasteAction',
    );
    if (pasted) {
      return {
        hostId: 'cline',
        hostName: CHAT_HOST_LABELS.cline,
        attachedToChat: true,
        chatPrompt,
        insertMode: 'current',
        message: 'Task context pasted into Cline chat',
      };
    }
  } finally {
    await vscode.env.clipboard.writeText(clipboard);
  }

  return {
    hostId: 'cline',
    hostName: CHAT_HOST_LABELS.cline,
    attachedToChat: false,
    chatPrompt,
    insertMode: 'current',
    message: 'Cline is available but chat input could not be updated automatically',
  };
}
