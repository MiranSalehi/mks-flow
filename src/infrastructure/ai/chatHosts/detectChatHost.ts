import type { ChatHostId } from './types';

const CLINE_NEW_COMMANDS = [
  'cline.addPromptToChat',
  'cline.addFileMentionToChat',
] as const;

const CLINE_LEGACY_COMMANDS = ['cline.focusChatInput', 'cline.addToChat'] as const;

const CLAUDE_COMMANDS = [
  'claude-vscode.focus',
  'claude-vscode.newConversation',
  'claude-vscode.sidebar.open',
] as const;

const ANTIGRAVITY_COMMANDS = [
  'antigravity.sendTextToChat',
  'antigravity.prioritized.chat.openNewConversation',
] as const;

const CURSOR_COMMANDS = [
  'composer.addfilestocomposer',
  'aichat.newfollowupaction',
] as const;

function hasAll(commands: readonly string[], required: readonly string[]): boolean {
  return required.every((command) => commands.includes(command));
}

function hasAny(commands: readonly string[], candidates: readonly string[]): boolean {
  return candidates.some((command) => commands.includes(command));
}

/** Picks the best chat host from installed extension commands. */
export function detectChatHost(
  commands: readonly string[],
  preferred?: ChatHostId,
): ChatHostId {
  if (preferred && preferred !== 'none') {
    if (isHostAvailable(commands, preferred)) {
      return preferred;
    }
  }

  if (hasAll(commands, CURSOR_COMMANDS)) {
    return 'cursor';
  }

  if (hasAny(commands, CLINE_NEW_COMMANDS) || hasAny(commands, CLINE_LEGACY_COMMANDS)) {
    return 'cline';
  }

  if (hasAny(commands, CLAUDE_COMMANDS)) {
    return 'claude';
  }

  if (hasAny(commands, ANTIGRAVITY_COMMANDS)) {
    return 'antigravity';
  }

  return 'none';
}

export function isHostAvailable(
  commands: readonly string[],
  host: ChatHostId,
): boolean {
  switch (host) {
    case 'cursor':
      return hasAll(commands, CURSOR_COMMANDS);
    case 'cline':
      return (
        hasAny(commands, CLINE_NEW_COMMANDS) ||
        hasAny(commands, CLINE_LEGACY_COMMANDS)
      );
    case 'claude':
      return hasAny(commands, CLAUDE_COMMANDS);
    case 'antigravity':
      return hasAny(commands, ANTIGRAVITY_COMMANDS);
    default:
      return false;
  }
}
