export type ChatHostId =
  | 'cursor'
  | 'cline'
  | 'claude'
  | 'antigravity'
  | 'none';

export type ChatHostInsertMode = 'current' | 'new_chat';

export interface ChatHostAttachResult {
  hostId: ChatHostId;
  hostName: string;
  attachedToChat: boolean;
  chatPrompt: string;
  insertMode: ChatHostInsertMode;
  message: string;
}

export const CHAT_INSTRUCTION = 'Implement this task. Full context:';

export const CHAT_HOST_LABELS: Record<ChatHostId, string> = {
  cursor: 'Cursor Composer',
  cline: 'Cline',
  claude: 'Claude Code',
  antigravity: 'Antigravity',
  none: 'Clipboard',
};
