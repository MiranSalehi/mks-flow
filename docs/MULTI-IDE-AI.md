# Multi-IDE Send to AI

MKSFlow **Send to AI** writes `mksflow-tasks/{taskId}.md` and routes context to the active chat host.

## Setting: `mksflow.aiProvider`

| Value | Behavior |
|-------|----------|
| **auto** (default) | Detect Cursor → Cline → Claude Code → Antigravity |
| **cursor** | Force Cursor Composer |
| **cline** | Force Cline chat |
| **claude** | Force Claude Code |
| **antigravity** | Force Antigravity Cascade |
| **clipboard** | Copy full markdown prompt only |

## Per-host behavior

### Cursor
Native Composer file chip via `composer.addfilestocomposer`.

### Cline
Uses `cline.addPromptToChat` + `cline.addFileMentionToChat` when available (newer Cline). Falls back to focus chat + clipboard paste.

### Claude Code
Opens `vscode://anthropic.claude-code/open?prompt=…` with `@mksflow-tasks/…` in the prompt. Falls back to `claude-vscode.focus` + paste.

### Antigravity
Uses `antigravity.sendTextToChat` when available, else `workbench.action.chat.open` with partial query.

### Fallback
If attach fails: context file opens, chat prompt copied to clipboard, modal explains manual `@` mention.

## Manual test checklist

- [ ] Cursor: file chip + instruction in Composer
- [ ] Cline: prompt + file mention in chat input (not auto-submitted)
- [ ] Claude Code: new tab/chat with prefilled prompt
- [ ] Antigravity: text in Cascade input
- [ ] Plain VS Code + `clipboard`: full prompt in clipboard
- [ ] `auto` picks correct host when multiple extensions installed (Cursor wins first)
