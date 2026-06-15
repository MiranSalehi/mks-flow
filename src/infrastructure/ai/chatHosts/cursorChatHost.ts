import type { CursorComposerService } from '../CursorComposerService';
import type { ChatHostAttachResult } from './types';
import { CHAT_HOST_LABELS } from './types';
import { buildChatPrompt } from './utils';

/** Attaches task context to Cursor Composer. */
export async function attachToCursor(
  cursorComposerService: CursorComposerService,
  relativePath: string,
  absolutePath: string,
): Promise<ChatHostAttachResult> {
  const chatPrompt = buildChatPrompt(relativePath);
  const result = await cursorComposerService.sendToComposer(
    relativePath,
    absolutePath,
  );

  const attached = result.openedComposer;
  const modeLabel =
    result.insertMode === 'new_chat' ? ' in a new Composer chat' : '';

  return {
    hostId: 'cursor',
    hostName: CHAT_HOST_LABELS.cursor,
    attachedToChat: attached,
    chatPrompt,
    insertMode: result.insertMode,
    message: attached
      ? `Task context attached to Composer${modeLabel}`
      : 'Task context file created (Composer unavailable)',
  };
}
